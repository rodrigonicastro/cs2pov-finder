import math
import os
from datetime import datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Map, MapRole, Player, PlayerRole, Side

_API_URL = "https://edge.skybox.gg/api"
_PAGE_SIZE = 50
_LOOKBACK_DAYS = 90
_KNOWN_MAPS = {"ancient", "anubis", "dust2", "inferno", "mirage", "nuke", "overpass"}

_QUERY = """
query leaderboards(
  $page_size: Int!, $page_number: Int!,
  $order_by: LeaderboardOrderBy!, $direction: OrderDirection!,
  $min_rank: Int, $since: DateTime, $min_rounds_played: Int,
  $team_id: ID, $steamIds: [String!]
) {
  leaderboard(
    orderBy: $order_by
    direction: $direction
    pagination: {pageSize: $page_size, pageNumber: $page_number}
    minRank: $min_rank
    after: $since
    minRoundsPlayed: $min_rounds_played
    teamId: $team_id
    steamIds: $steamIds
  ) {
    entries {
      steamId
      playerHandle
      publicMatchTeams { name __typename }
      perRole { teamSide teamRole __typename }
      __typename
    }
    totalEntries
    __typename
  }
}
"""


def _parse_team_role(team_role: str | None) -> tuple[str, str] | None:
    if not team_role:
        return None
    for map_name in _KNOWN_MAPS:
        if team_role.startswith(map_name + "_"):
            return map_name, team_role[len(map_name) + 1:]
    return None


async def _fetch_page(client: httpx.AsyncClient, token: str, page: int, since: str, team_id: str | None = None, steam_ids: list[str] | None = None) -> dict:
    payload = {
        "operationName": "leaderboards",
        "query": _QUERY,
        "variables": {
            "page_size": _PAGE_SIZE,
            "page_number": page,
            "order_by": "HLTV_RATING2",
            "direction": "desc",
            "min_rank": None,
            "min_rounds_played": 16,
            "since": since,
            "team_id": team_id,
            "steamIds": steam_ids,
        },
        "extensions": {"clientLibrary": {"name": "@apollo/client", "version": "4.1.6"}},
    }
    response = await client.post(
        _API_URL,
        json=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/graphql-response+json,application/json;q=0.9",
        },
    )
    if response.status_code == 401:
        raise RuntimeError("Skybox API returned 401 — update SKYBOX_API_TOKEN in your env.")
    response.raise_for_status()
    return response.json()


async def _fetch_all_entries(token: str, since: str, team_id: str | None = None, steam_ids: list[str] | None = None) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        first = await _fetch_page(client, token, 1, since, team_id, steam_ids)
        leaderboard = first["data"]["leaderboard"]
        entries: list[dict] = list(leaderboard["entries"])
        total_pages = math.ceil(leaderboard["totalEntries"] / _PAGE_SIZE)
        for page in range(2, total_pages + 1):
            data = await _fetch_page(client, token, page, since, team_id, steam_ids)
            entries.extend(data["data"]["leaderboard"]["entries"])
    return entries


async def scrape(session: AsyncSession, team_id: str | None = None, steam_ids: list[str] | None = None) -> None:
    token = os.environ["SKYBOX_API_TOKEN"]
    since = (datetime.utcnow() - timedelta(days=_LOOKBACK_DAYS)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    maps_by_name: dict[str, Map] = {
        m.name.lower(): m for m in (await session.execute(select(Map))).scalars()
    }

    entries = await _fetch_all_entries(token, since, team_id, steam_ids)
    if not entries:
        return

    now = datetime.utcnow()

    # --- 1. Upsert map_roles ---
    map_role_rows: list[dict] = []
    seen_map_role_keys: set[tuple] = set()
    for entry in entries:
        for pr in entry["perRole"]:
            parsed = _parse_team_role(pr["teamRole"])
            if not parsed:
                continue
            map_name, role_name = parsed
            map_obj = maps_by_name.get(map_name)
            if not map_obj:
                continue
            key = (map_obj.id, Side[pr["teamSide"]], role_name)
            if key not in seen_map_role_keys:
                seen_map_role_keys.add(key)
                map_role_rows.append({"map_id": map_obj.id, "side": Side[pr["teamSide"]], "name": role_name})

    if map_role_rows:
        await session.execute(insert(MapRole).values(map_role_rows).on_conflict_do_nothing())
        await session.flush()

    # --- 2. Load map_roles index: (map_id, side, name) -> map_role.id ---
    map_roles_index: dict[tuple, int] = {
        (mr.map_id, mr.side, mr.name): mr.id
        for mr in (await session.execute(select(MapRole))).scalars()
    }

    # --- 3. Upsert players ---
    player_rows: list[dict] = []
    seen_steam_ids: set[str] = set()
    for entry in entries:
        sid = entry["steamId"]
        if sid in seen_steam_ids:
            continue
        seen_steam_ids.add(sid)
        team = entry["publicMatchTeams"][0]["name"] if entry["publicMatchTeams"] else None
        player_rows.append({"steam_id": sid, "name": entry["playerHandle"], "team": team})

    stmt = insert(Player).values(player_rows)
    await session.execute(
        stmt.on_conflict_do_update(
            index_elements=["steam_id"],
            set_={"name": stmt.excluded.name, "team": stmt.excluded.team, "updated_at": now},
        )
    )
    await session.flush()

    # --- 4. Load players index: steam_id -> player.id ---
    players_index: dict[str, int] = {
        steam_id: player_id
        for player_id, steam_id in (
            await session.execute(
                select(Player.id, Player.steam_id).where(Player.steam_id.in_(seen_steam_ids))
            )
        ).all()
    }

    # --- 5. Upsert player_roles ---
    player_role_rows: list[dict] = []
    seen_player_role_keys: set[tuple] = set()
    for entry in entries:
        player_id = players_index.get(entry["steamId"])
        if player_id is None:
            continue
        for pr in entry["perRole"]:
            parsed = _parse_team_role(pr["teamRole"])
            if not parsed:
                continue
            map_name, role_name = parsed
            map_obj = maps_by_name.get(map_name)
            if not map_obj:
                continue
            map_role_id = map_roles_index.get((map_obj.id, Side[pr["teamSide"]], role_name))
            if not map_role_id:
                continue
            key = (player_id, map_role_id)
            if key not in seen_player_role_keys:
                seen_player_role_keys.add(key)
                player_role_rows.append({"player_id": player_id, "map_role_id": map_role_id, "last_scraped_at": now})

    if player_role_rows:
        pr_stmt = insert(PlayerRole).values(player_role_rows)
        await session.execute(
            pr_stmt.on_conflict_do_update(
                index_elements=["player_id", "map_role_id"],
                set_={"last_scraped_at": now},
            )
        )

    await session.commit()
