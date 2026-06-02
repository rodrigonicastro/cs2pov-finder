import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

import email_client
from db.database import get_session
from db.models import User, UserPlayer, Otp, ExperienceLevel, MatchTypePreference, Notify

_OTP_TTL_MINUTES = 10


async def _send_otp_email(to: str, code: str) -> None:
    body = (
        f"Your CS2 POV Finder sign-in code is:\n\n{code}\n\n"
        f"It expires in {_OTP_TTL_MINUTES} minutes. Do not share it."
    )
    await email_client.send(to, "Your sign-in code", body)

router = APIRouter(prefix="/auth", tags=["auth"])

# Role → player IDs seeded into user_players on registration
ROLE_PLAYER_IDS: dict[str, list[int]] = {
    'Entry Fragger/Playmaker': [2677, 3279, 2858, 2808, 3057],
    'AWPer': [2700, 2679, 2746, 2850, 2739],
    'Anchor': [3021, 3434, 3516, 3549, 2991],
    'Lurker': [2764, 2774, 3075, 2787, 3406],
    'IGL': [4212, 2984, 3709, 3994, 4448],
}

# Map frontend labels to DB enum values
_EXPERIENCE_MAP = {
    "I'm a casual player": ExperienceLevel.casual,
    'I play amateur tournaments': ExperienceLevel.amateur,
    'I play at semi-pro level': ExperienceLevel.semi_pro,
    "I'm a professional": ExperienceLevel.pro,
    "I'm a coach looking to help my team": ExperienceLevel.coach,
    "I'm a content creator": ExperienceLevel.content_creator,
}
_MATCH_TYPE_PREF_MAP = {
    'FACEIT pugs': MatchTypePreference.faceit,
    'Pro matches': MatchTypePreference.tournament,
    'Both': MatchTypePreference.both,
}
_NOTIFY_MAP = {
    'Yes': Notify.yes,
    'No': Notify.no,
}


class LoginRequest(BaseModel):
    email: str


class RegisterRequest(BaseModel):
    email: str
    username: str



@router.post("/request-otp")
async def request_otp(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email.")

    # Invalidate any previous unused OTPs for this email
    await session.execute(delete(Otp).where(Otp.email == body.email))

    code = f"{secrets.randbelow(10**6):06d}"
    otp = Otp(
        email=body.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=_OTP_TTL_MINUTES),
        used=False,
    )
    session.add(otp)
    await session.commit()

    await _send_otp_email(body.email, code)
    return {"ok": True}


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


@router.post("/verify-otp")
async def verify_otp(body: VerifyOtpRequest, session: AsyncSession = Depends(get_session)):
    otp = (await session.execute(
        select(Otp)
        .where(Otp.email == body.email, Otp.used == False)  # noqa: E712
        .order_by(Otp.expires_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not otp or otp.code != body.code:
        raise HTTPException(status_code=400, detail="Invalid code.")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code has expired.")

    otp.used = True
    await session.commit()

    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one()
    return {"ok": True, "username": user.username}


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(email=body.email, username=body.username)
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken.")
    return {"ok": True}


@router.post("/request-registration-otp")
async def request_registration_otp(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    username_taken = (await session.execute(select(User).where(User.username == body.username))).scalar_one_or_none()
    if username_taken:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    await session.execute(delete(Otp).where(Otp.email == body.email))

    code = f"{secrets.randbelow(10**6):06d}"
    session.add(Otp(
        email=body.email,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=_OTP_TTL_MINUTES),
        used=False,
    ))
    await session.commit()

    await _send_otp_email(body.email, code)
    return {"ok": True}


class VerifyRegistrationRequest(BaseModel):
    email: str
    username: str
    code: str


@router.post("/verify-registration", status_code=201)
async def verify_registration(body: VerifyRegistrationRequest, session: AsyncSession = Depends(get_session)):
    existing = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    otp = (await session.execute(
        select(Otp)
        .where(Otp.email == body.email, Otp.used == False)  # noqa: E712
        .order_by(Otp.expires_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    if not otp or otp.code != body.code:
        raise HTTPException(status_code=400, detail="Invalid code.")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Code has expired.")

    otp.used = True
    session.add(User(email=body.email, username=body.username))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="That username is already taken.")
    return {"ok": True, "username": body.username}


class UpdateAccountRequest(BaseModel):
    email: str
    new_username: str | None = None
    new_email: str | None = None


@router.patch("/account")
async def update_account(body: UpdateAccountRequest, session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if body.new_email and body.new_email != body.email:
        conflict = (await session.execute(select(User).where(User.email == body.new_email))).scalar_one_or_none()
        if conflict:
            raise HTTPException(status_code=409, detail="An account with that email already exists.")
        user.email = body.new_email

    if body.new_username:
        user.username = body.new_username

    await session.commit()
    return {"ok": True, "username": user.username, "email": user.email}


@router.delete("/account", status_code=204)
async def delete_account(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    await session.delete(user)
    await session.commit()


class PreferencesRequest(BaseModel):
    email: str
    roles: list[str] = []
    experience: str | None = None
    match_type_preference: str | None = None
    notify: str | None = None


@router.get("/preferences")
async def get_preferences(email: str = Query(...), session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "username": user.username,
        "preferred_roles": user.preferred_roles or [],
        "experience": user.experience.value if user.experience else None,
        "match_type_preference": user.match_type_preference.value if user.match_type_preference else None,
        "notify": user.notify.value if user.notify else None,
    }


@router.post("/preferences")
async def save_preferences(body: PreferencesRequest, session: AsyncSession = Depends(get_session)):
    user = (await session.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if body.experience:
        user.experience = _EXPERIENCE_MAP.get(body.experience)
    if body.match_type_preference:
        user.match_type_preference = _MATCH_TYPE_PREF_MAP.get(body.match_type_preference)
    if body.notify:
        user.notify = _NOTIFY_MAP.get(body.notify)

    old_roles = set(user.preferred_roles or [])
    new_roles = set(body.roles)

    kept_player_ids = {pid for role in new_roles for pid in ROLE_PLAYER_IDS.get(role, [])}
    removed_player_ids = (
        {pid for role in (old_roles - new_roles) for pid in ROLE_PLAYER_IDS.get(role, [])}
        - kept_player_ids
    )

    if removed_player_ids:
        await session.execute(
            delete(UserPlayer).where(
                UserPlayer.user_id == user.id,
                UserPlayer.player_id.in_(removed_player_ids),
            )
        )

    if kept_player_ids:
        await session.execute(
            insert(UserPlayer)
            .values([{"user_id": user.id, "player_id": pid} for pid in kept_player_ids])
            .on_conflict_do_nothing()
        )

    user.preferred_roles = body.roles

    await session.commit()
    return {"ok": True}
