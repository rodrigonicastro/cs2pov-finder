from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.activity import log_activity
from db.database import get_session
from db.models import Video, User, UserRole, UserPlayer, MapRole, Map, MatchType, ActivityType

router = APIRouter(prefix="/videos", tags=["videos"])

LOAD_OPTS = [
    selectinload(Video.t_role).selectinload(MapRole.map),
    selectinload(Video.ct_role).selectinload(MapRole.map),
    selectinload(Video.map),
]


def map_filter_condition(map_names: list[str]):
    map_ids = select(Map.id).where(Map.name.in_(map_names))
    return Video.map_id.in_(map_ids)


class VideoOut(BaseModel):
    id: int
    title: str
    url: str
    thumbnailUrl: str | None
    publishedAt: datetime | None
    tRole: str | None
    ctRole: str | None
    map: str | None
    matchType: str | None

    @classmethod
    def from_orm(cls, v: Video) -> "VideoOut":
        return cls(
            id=v.id,
            title=v.title,
            url=v.url,
            thumbnailUrl=v.thumbnail_url,
            publishedAt=v.published_at,
            tRole=v.t_role.label if v.t_role else None,
            ctRole=v.ct_role.label if v.ct_role else None,
            map=v.map.name if v.map else None,
            matchType=v.match_type.value if v.match_type else None,
        )


class VideosResponse(BaseModel):
    videos: list[VideoOut]
    total: int


@router.get("", response_model=VideosResponse)
async def list_videos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    map: list[str] = Query(default=[]),
    match_type: str | None = Query(None),
    t_role_id: list[int] = Query(default=[]),
    ct_role_id: list[int] = Query(default=[]),
    player_id: int | None = Query(None),
    email: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    conditions = []
    if map:
        conditions.append(map_filter_condition(map))
    if match_type:
        conditions.append(Video.match_type == MatchType[match_type])
    if t_role_id:
        conditions.append(Video.t_role_id.in_(t_role_id))
    if ct_role_id:
        conditions.append(Video.ct_role_id.in_(ct_role_id))
    if player_id is not None:
        conditions.append(Video.player_id == player_id)

    where = and_(*conditions) if conditions else True

    total = (await session.execute(select(func.count()).select_from(Video).where(where))).scalar_one()
    rows = (await session.execute(
        select(Video)
        .options(*LOAD_OPTS)
        .where(where)
        .order_by(Video.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).scalars().all()

    if email:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user:
            await log_activity(session, user.id, ActivityType.view_all_videos)
            await session.commit()

    return VideosResponse(videos=[VideoOut.from_orm(v) for v in rows], total=total)


@router.get("/my", response_model=VideosResponse)
async def my_videos(
    email: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    map: list[str] = Query(default=[]),
    match_type: str | None = Query(None),
    t_role_id: list[int] = Query(default=[]),
    ct_role_id: list[int] = Query(default=[]),
    player_id: int | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    user_result = await session.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        return VideosResponse(videos=[], total=0)

    subscribed_roles = select(UserRole.map_role_id).where(UserRole.user_id == user.id)
    subscribed_players = select(UserPlayer.player_id).where(UserPlayer.user_id == user.id)

    conditions = [or_(
        Video.t_role_id.in_(subscribed_roles),
        Video.ct_role_id.in_(subscribed_roles),
        Video.player_id.in_(subscribed_players),
    )]
    if map:
        conditions.append(map_filter_condition(map))
    if match_type:
        conditions.append(Video.match_type == MatchType[match_type])
    if t_role_id:
        conditions.append(Video.t_role_id.in_(t_role_id))
    if ct_role_id:
        conditions.append(Video.ct_role_id.in_(ct_role_id))
    if player_id is not None:
        conditions.append(Video.player_id == player_id)

    where = and_(*conditions)

    total = (await session.execute(select(func.count()).select_from(Video).where(where))).scalar_one()
    rows = (await session.execute(
        select(Video)
        .options(*LOAD_OPTS)
        .where(where)
        .order_by(Video.published_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).scalars().all()

    await log_activity(session, user.id, ActivityType.view_my_videos)
    await session.commit()

    return VideosResponse(videos=[VideoOut.from_orm(v) for v in rows], total=total)
