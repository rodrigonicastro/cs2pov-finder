from sqlalchemy.ext.asyncio import AsyncSession
from db.models import UserActivity, ActivityType


async def log_activity(session: AsyncSession, user_id: int, activity_type: ActivityType) -> None:
    session.add(UserActivity(user_id=user_id, activity_type=activity_type))
