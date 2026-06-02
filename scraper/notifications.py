import logging
import random
import re

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

import email_client
from db.models import User, UserRole, UserPlayer, Video, Notify

log = logging.getLogger(__name__)


def _to_html(text: str) -> str:
    linked = re.sub(r'(https?://[^\s]+)', r'<a href="\1">\1</a>', text)
    return "<p>" + linked.replace("\n", "<br>") + "</p>"

MESSAGES = [
    "New POV is available for players or roles you follow. Head over to https://cs2povfinder.com/ to watch it.",
    "Psst... new POV for you just dropped. Go check it out https://cs2povfinder.com",
    "Quit playing stupidly. New POV(s) for your position(s) just came out https://cs2povfinder.com",
    "Fresh POV footage just landed. Someone on your list is on the server - go study it https://cs2povfinder.com",
    "New video alert. Your position, your map, your excuses are running out https://cs2povfinder.com",
    "A player you follow just had their POV uploaded. Time to take notes https://cs2povfinder.com",
    "Your rivals are watching film. Are you? New POV just dropped https://cs2povfinder.com",
    "New POV footage for your roles is up. The grind doesn't stop https://cs2povfinder.com",
]


async def notify_users(session: AsyncSession, new_video_ids: list[int]) -> None:
    if not new_video_ids:
        return

    users = (await session.execute(
        select(User).where(User.notify == Notify.yes)
    )).scalars().all()

    for user in users:
        subscribed_roles = select(UserRole.map_role_id).where(UserRole.user_id == user.id)
        subscribed_players = select(UserPlayer.player_id).where(UserPlayer.user_id == user.id)

        matching_count = (await session.execute(
            select(Video.id).where(
                Video.id.in_(new_video_ids),
                or_(
                    Video.t_role_id.in_(subscribed_roles),
                    Video.ct_role_id.in_(subscribed_roles),
                    Video.player_id.in_(subscribed_players),
                ),
            )
        )).scalars().all()

        if not matching_count:
            continue

        try:
            await email_client.send(
                to=user.email,
                subject="New CS2 POV for you",
                body=_to_html(random.choice(MESSAGES)),
                html=True,
            )
            log.info("Notified %s — %d new matching video(s)", user.email, len(matching_count))
        except Exception:
            log.exception("Failed to send notification to %s", user.email)
