from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_session
from db.models import Map

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("", response_model=list[str])
async def list_maps(session: AsyncSession = Depends(get_session)):
    rows = (await session.execute(select(Map.name).order_by(Map.name))).scalars().all()
    return rows
