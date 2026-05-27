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
    op.create_table(
        'user_activity',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.Enum(name='activity_type_enum', create_type=False), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('user_activity')
    activity_type_enum.drop(op.get_bind(), checkfirst=True)
