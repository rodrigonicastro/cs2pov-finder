from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, delete, distinct, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_session
from db.models import User, UserPlayer, UserRole, Player, Video, MapRole, Map, MatchType

router = APIRouter(prefix="/players", tags=["players"])


class PlayerOut(BaseModel):
    playerId: int
    name: str
    team: str | None


class AddPlayerRequest(BaseModel):
    email: str
    playerId: int


@router.get("/all", response_model=list[PlayerOut])
async def all_players(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Player).order_by(Player.name))).scalars().all()
    return [PlayerOut(playerId=p.id, name=p.name, team=p.team) for p in rows]


@router.get("/in-videos", response_model=list[PlayerOut])
async def players_in_videos(
    map: list[str] = Query(default=[]),
    match_type: str | None = Query(None),
    t_role_id: list[int] = Query(default=[]),
    ct_role_id: list[int] = Query(default=[]),
    session: AsyncSession = Depends(get_session),
):
    conditions = [Video.player_id.isnot(None)]
    if map:
        map_role_ids = select(MapRole.id).join(Map).where(Map.name.in_(map))
        conditions.append(or_(Video.t_role_id.in_(map_role_ids), Video.ct_role_id.in_(map_role_ids)))
    if match_type:
        conditions.append(Video.match_type == MatchType[match_type])
    if t_role_id:
        conditions.append(Video.t_role_id.in_(t_role_id))
    if ct_role_id:
        conditions.append(Video.ct_role_id.in_(ct_role_id))

    player_ids = select(distinct(Video.player_id)).where(and_(*conditions))
    rows = (await session.execute(
        select(Player).where(Player.id.in_(player_ids)).order_by(Player.name)
    )).scalars().all()
    return [PlayerOut(playerId=p.id, name=p.name, team=p.team) for p in rows]


@router.get("/in-my-videos", response_model=list[PlayerOut])
async def players_in_my_videos(
    email: str = Query(...),
    map: list[str] = Query(default=[]),
    match_type: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        return []

    subscribed_roles = select(UserRole.map_role_id).where(UserRole.user_id == user.id)
    subscribed_players = select(UserPlayer.player_id).where(UserPlayer.user_id == user.id)

    conditions = [
        Video.player_id.isnot(None),
        or_(
            Video.t_role_id.in_(subscribed_roles),
            Video.ct_role_id.in_(subscribed_roles),
            Video.player_id.in_(subscribed_players),
        ),
    ]
    if map:
        map_role_ids = select(MapRole.id).join(Map).where(Map.name.in_(map))
        conditions.append(or_(Video.t_role_id.in_(map_role_ids), Video.ct_role_id.in_(map_role_ids)))
    if match_type:
        conditions.append(Video.match_type == MatchType[match_type])

    player_ids = select(distinct(Video.player_id)).where(and_(*conditions))
    rows = (await session.execute(
        select(Player).where(Player.id.in_(player_ids)).order_by(Player.name)
    )).scalars().all()
    return [PlayerOut(playerId=p.id, name=p.name, team=p.team) for p in rows]


@router.get("/available", response_model=list[PlayerOut])
async def available_players(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    subscribed_ids = (await session.execute(
        select(UserPlayer.player_id).where(UserPlayer.user_id == user.id)
    )).scalars().all()

    rows = (await session.execute(
        select(Player)
        .where(Player.id.not_in(subscribed_ids) if subscribed_ids else True)
        .order_by(Player.name)
    )).scalars().all()

    return [PlayerOut(playerId=p.id, name=p.name, team=p.team) for p in rows]


@router.post("/my", status_code=201)
async def add_player(body: AddPlayerRequest, session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = (await session.execute(
        select(UserPlayer).where(
            UserPlayer.user_id == user.id,
            UserPlayer.player_id == body.playerId,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Player already subscribed.")

    session.add(UserPlayer(user_id=user.id, player_id=body.playerId))
    await session.commit()
    return {"ok": True}


@router.get("/my", response_model=list[PlayerOut])
async def my_players(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    rows = (await session.execute(
        select(Player)
        .join(UserPlayer, UserPlayer.player_id == Player.id)
        .where(UserPlayer.user_id == user.id)
        .order_by(Player.name)
    )).scalars().all()

    return [PlayerOut(playerId=p.id, name=p.name, team=p.team) for p in rows]


@router.delete("/my/{player_id}", status_code=204)
async def remove_player(
    player_id: int,
    email: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await session.execute(
        delete(UserPlayer).where(
            UserPlayer.user_id == user.id,
            UserPlayer.player_id == player_id,
        )
    )
    await session.commit()
