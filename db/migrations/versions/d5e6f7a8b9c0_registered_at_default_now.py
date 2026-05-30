"""registered_at_default_now

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET registered_at = now() WHERE registered_at IS NULL")
    op.alter_column(
        'users', 'registered_at',
        existing_type=sa.DateTime(),
        nullable=False,
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    op.alter_column(
        'users', 'registered_at',
        existing_type=sa.DateTime(),
        nullable=True,
        server_default=None,
    )
