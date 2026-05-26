from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_session
from db.models import User, UserSurvey

router = APIRouter(prefix="/survey", tags=["survey"])


@router.get("/status")
async def get_status(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    survey = (await session.execute(select(UserSurvey).where(UserSurvey.user_id == user.id))).scalar_one_or_none()
    return {"answered": survey is not None}


class SurveyResponseRequest(BaseModel):
    email: str
    response: int


@router.post("/response", status_code=201)
async def submit_response(body: SurveyResponseRequest, session: AsyncSession = Depends(get_session)):
    if body.response not in (1, 2, 3, 4):
        raise HTTPException(status_code=422, detail="Response must be 1, 2, 3, or 4.")
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await session.execute(
        insert(UserSurvey)
        .values(user_id=user.id, response=body.response)
        .on_conflict_do_nothing(index_elements=["user_id"])
    )
    await session.commit()
    return {"ok": True}
