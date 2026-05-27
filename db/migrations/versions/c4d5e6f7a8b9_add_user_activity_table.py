"""add_user_activity_table

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

activity_type_enum = sa.Enum(
    'view_my_videos', 'view_all_videos', 'add_role', 'delete_role',
    'add_player', 'delete_player', 'view_my_account', 'view_preferences',
    name='activity_type_enum',
)


def upgrade() -> None:
    activity_type_enum.create(op.get_bind(), checkfirst=True)
    op.execute("""
        CREATE TABLE user_activity (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_type activity_type_enum NOT NULL,
            timestamp TIMESTAMP NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.drop_table('user_activity')
    activity_type_enum.drop(op.get_bind(), checkfirst=True)
