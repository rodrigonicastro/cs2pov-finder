from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import get_session
from db.models import User, UserRole, MapRole

router = APIRouter(prefix="/roles", tags=["roles"])


class UserRoleOut(BaseModel):
    mapRoleId: int
    map: str
    side: str
    role: str


class AvailableRoleOut(BaseModel):
    mapRoleId: int
    map: str
    side: str
    role: str


class AddRoleRequest(BaseModel):
    email: str
    mapRoleId: int


async def _get_user(email: str, session: AsyncSession):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


class MapSideRoleOut(BaseModel):
    mapRoleId: int
    role: str


class MapSideRoleWithMapOut(BaseModel):
    mapRoleId: int
    role: str
    map: str


@router.get("/by-side", response_model=list[MapSideRoleWithMapOut])
async def roles_by_side(
    side: str = Query(...),
    map: list[str] = Query(default=[]),
    session: AsyncSession = Depends(get_session),
):
    from db.models import Map as MapModel
    q = select(MapRole).join(MapModel).where(MapRole.side == side)
    if map:
        q = q.where(MapModel.name.in_(map))
    q = q.options(selectinload(MapRole.map)).order_by(MapModel.name, MapRole.name)
    rows = (await session.execute(q)).scalars().all()
    return [MapSideRoleWithMapOut(mapRoleId=r.id, role=r.label, map=r.map.name) for r in rows]


@router.get("/by-map-side", response_model=list[MapSideRoleOut])
async def roles_by_map_side(
    map: str = Query(...),
    side: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    from db.models import Map as MapModel
    rows = (await session.execute(
        select(MapRole)
        .join(MapModel)
        .where(MapModel.name == map, MapRole.side == side)
        .order_by(MapRole.name)
    )).scalars().all()
    return [MapSideRoleOut(mapRoleId=r.id, role=r.label) for r in rows]


@router.get("/my", response_model=list[UserRoleOut])
async def my_roles(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = await _get_user(email, session)

    rows = (await session.execute(
        select(UserRole)
        .options(selectinload(UserRole.map_role).selectinload(MapRole.map))
        .where(UserRole.user_id == user.id)
    )).scalars().all()

    return sorted([
        UserRoleOut(
            mapRoleId=r.map_role_id,
            map=r.map_role.map.name,
            side=r.map_role.side.value,
            role=r.map_role.label,
        )
        for r in rows
    ], key=lambda x: (x.map, x.side))


@router.get("/available", response_model=list[AvailableRoleOut])
async def available_roles(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = await _get_user(email, session)

    subscribed_ids = (await session.execute(
        select(UserRole.map_role_id).where(UserRole.user_id == user.id)
    )).scalars().all()

    rows = (await session.execute(
        select(MapRole)
        .options(selectinload(MapRole.map))
        .where(MapRole.id.not_in(subscribed_ids) if subscribed_ids else True)
    )).scalars().all()

    return sorted([
        AvailableRoleOut(
            mapRoleId=r.id,
            map=r.map.name,
            side=r.side.value,
            role=r.label,
        )
        for r in rows
    ], key=lambda x: (x.map, x.side, x.role))


@router.post("/my", status_code=201)
async def add_role(body: AddRoleRequest, session: AsyncSession = Depends(get_session)):
    user = await _get_user(body.email, session)

    existing = (await session.execute(
        select(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.map_role_id == body.mapRoleId,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Role already subscribed.")

    session.add(UserRole(user_id=user.id, map_role_id=body.mapRoleId))
    await session.commit()
    return {"ok": True}


class BulkAddRoleRequest(BaseModel):
    email: str
    mapRoleIds: list[int]


@router.post("/my/bulk", status_code=201)
async def bulk_add_roles(body: BulkAddRoleRequest, session: AsyncSession = Depends(get_session)):
    user = await _get_user(body.email, session)
    if body.mapRoleIds:
        await session.execute(
            insert(UserRole)
            .values([{"user_id": user.id, "map_role_id": rid} for rid in body.mapRoleIds])
            .on_conflict_do_nothing()
        )
    await session.commit()
    return {"ok": True}


@router.delete("/my/{map_role_id}", status_code=204)
async def remove_role(
    map_role_id: int,
    email: str = Query(...),
    session: AsyncSession = Depends(get_session),
):
    user = await _get_user(email, session)
    await session.execute(
        delete(UserRole).where(
            UserRole.user_id == user.id,
            UserRole.map_role_id == map_role_id,
        )
    )
    await session.commit()
