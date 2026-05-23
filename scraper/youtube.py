import asyncio
import logging
import os
import re
from datetime import datetime, timedelta

log = logging.getLogger(__name__)

import httplib2
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Map, MapRole, MatchType, Player, PlayerRole, Side, Video

_MATCH_TYPE_KEYWORDS: list[tuple[MatchType, list[str]]] = [
    (MatchType.FACEIT, ["faceit", "fpl", "faceit pro league", "elo", "soloq", "duo", "matchmaking", "premier", " mm ", "valve mm", "w/", "perfect world arena"]),
    (MatchType.TOURNAMENT, ["major", "esl", "blast", "pgl", "iem", "pro league", "epl", "tournament", "finals", "championship", "cup", "qualifier", "pinnacle", "season", "cac", "cct", "ferjee", "stake", "draculan", "esea"]),
]


def _infer_match_type(title: str) -> MatchType | None:
    title_lower = title.lower()
    for match_type, keywords in _MATCH_TYPE_KEYWORDS:
        if any(kw in title_lower for kw in keywords):
            return match_type
    return None


_HTTP_TIMEOUT = 30  # seconds; httplib2 defaults to None (infinite)

def _client():
    http = httplib2.Http(timeout=_HTTP_TIMEOUT)
    return build("youtube", "v3", developerKey=os.environ["YOUTUBE_API_KEY"], cache_discovery=False, http=http)


def _uploads_playlist_id(youtube, channel_id: str) -> str:
    resp = youtube.channels().list(part="contentDetails", id=channel_id).execute()
    return resp["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]


def _fetch_new_videos(youtube, playlist_id: str, known_ids: set[str], since: datetime) -> list[dict]:
    """Fetch playlist items newest-first, stopping when a known video_id or a video older than `since` is hit."""
    results = []
    page_token = None
    while True:
        resp = youtube.playlistItems().list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=300,
            pageToken=page_token,
        ).execute()
        for item in resp["items"]:
            vid_id = item["snippet"]["resourceId"]["videoId"]
            if vid_id in known_ids:
                return results
            snippet = item["snippet"]
            published_at = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00")).replace(tzinfo=None)
            if published_at < since:
                return results
            thumbnails = snippet.get("thumbnails", {})
            thumbnail_url = (
                thumbnails.get("maxres") or thumbnails.get("high") or thumbnails.get("medium") or {}
            ).get("url")
            results.append({
                "youtube_video_id": vid_id,
                "title": snippet["title"],
                "url": f"https://www.youtube.com/watch?v={vid_id}",
                "published_at": published_at,
                "thumbnail_url": thumbnail_url,
            })
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


def _name_in_title(name: str, title_lower: str) -> bool:
    pattern = r'(?<![a-zA-Z0-9])' + re.escape(name.lower()) + r'(?![a-zA-Z0-9])'
    return bool(re.search(pattern, title_lower))


def _match_player(title: str, players: list[Player]) -> Player | None:
    title_lower = title.lower()
    best_player = None
    best_pos = float("inf")
    for player in players:
        names = [player.name] + (player.aliases or [])
        for name in names:
            pattern = r'(?<![a-zA-Z0-9])' + re.escape(name.lower()) + r'(?![a-zA-Z0-9])'
            m = re.search(pattern, title_lower)
            if m and m.start() < best_pos:
                best_pos = m.start()
                best_player = player
    return best_player


def _match_map(title: str, maps: list[Map]) -> Map | None:
    title_lower = title.lower()
    for map_obj in maps:
        if map_obj.name.lower() in title_lower:
            return map_obj
    return None


async def _role_ids(session: AsyncSession, player_id: int, map_id: int) -> tuple[int | None, int | None]:
    rows = (
        await session.execute(
            select(MapRole.id, MapRole.side)
            .join(PlayerRole, PlayerRole.map_role_id == MapRole.id)
            .where(PlayerRole.player_id == player_id, MapRole.map_id == map_id)
        )
    ).all()
    t_role_id = next((r.id for r in rows if r.side == Side.T), None)
    ct_role_id = next((r.id for r in rows if r.side == Side.CT), None)
    return t_role_id, ct_role_id


async def poll(session: AsyncSession) -> None:
    channel_ids = [c.strip() for c in os.environ.get("YOUTUBE_CHANNEL_IDS", "").split(",") if c.strip()]
    if not channel_ids:
        return

    known_ids: set[str] = {
        row[0] for row in (await session.execute(select(Video.youtube_video_id))).all()
    }
    players = (await session.execute(select(Player))).scalars().all()
    maps = (await session.execute(select(Map))).scalars().all()

    since = datetime.utcnow() - timedelta(days=90)
    log.info("Building YouTube client")
    youtube = await asyncio.to_thread(_client)

    for channel_id in channel_ids:
        log.info("Polling channel %s", channel_id)
        try:
            playlist_id = await asyncio.to_thread(_uploads_playlist_id, youtube, channel_id)
        except (KeyError, IndexError):
            log.warning("Channel %s not found or returned no data — skipping", channel_id)
            continue
        except Exception:
            log.exception("Failed to get uploads playlist for channel %s — skipping", channel_id)
            continue
        log.info("Fetching new videos for channel %s (playlist %s)", channel_id, playlist_id)
        try:
            new_videos = await asyncio.to_thread(_fetch_new_videos, youtube, playlist_id, known_ids, since)
        except Exception:
            log.exception("Failed to fetch videos for channel %s — skipping", channel_id)
            continue
        log.info("Found %d new video(s) for channel %s", len(new_videos), channel_id)

        for v in new_videos:
            player = _match_player(v["title"], players)
            map_obj = _match_map(v["title"], maps)

            t_role_id, ct_role_id = None, None
            if player and map_obj:
                t_role_id, ct_role_id = await _role_ids(session, player.id, map_obj.id)

            await session.execute(
                insert(Video)
                .values(
                    youtube_video_id=v["youtube_video_id"],
                    title=v["title"],
                    url=v["url"],
                    published_at=v["published_at"],
                    thumbnail_url=v["thumbnail_url"],
                    player_id=player.id if player else None,
                    map_id=map_obj.id if map_obj else None,
                    t_role_id=t_role_id,
                    ct_role_id=ct_role_id,
                    match_type=_infer_match_type(v["title"]),
                )
                .on_conflict_do_nothing(index_elements=["youtube_video_id"])
            )
            known_ids.add(v["youtube_video_id"])

    await session.commit()
    log.info("Poll complete")
