"""add_view_major_videos_activity

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-06-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'view_major_videos'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; a full type recreation would be needed
    pass
