"""add_user_preferences

Revision ID: c4e1f9a2b3d7
Revises: 8dd63c22ba16
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c4e1f9a2b3d7'
down_revision: Union[str, None] = '8dd63c22ba16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

experience_enum = sa.Enum(
    'casual', 'amateur', 'semi-pro', 'pro', 'coach', 'content_creator',
    name='experience_enum',
)
match_type_preference_enum = sa.Enum(
    'faceit', 'tournament', 'both',
    name='match_type_preference_enum',
)
notify_enum = sa.Enum(
    'yes', 'no',
    name='notify_enum',
)


def upgrade() -> None:
    experience_enum.create(op.get_bind(), checkfirst=True)
    match_type_preference_enum.create(op.get_bind(), checkfirst=True)
    notify_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('users', sa.Column('experience', experience_enum, nullable=True))
    op.add_column('users', sa.Column('match_type_preference', match_type_preference_enum, nullable=True))
    op.add_column('users', sa.Column('notify', notify_enum, nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'notify')
    op.drop_column('users', 'match_type_preference')
    op.drop_column('users', 'experience')

    notify_enum.drop(op.get_bind(), checkfirst=True)
    match_type_preference_enum.drop(op.get_bind(), checkfirst=True)
    experience_enum.drop(op.get_bind(), checkfirst=True)
