"""add_match_type_to_videos

Revision ID: a6ca3cc5643b
Revises: 2befabe753e7
Create Date: 2026-05-19 01:26:03.018848

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'a6ca3cc5643b'
down_revision: Union[str, None] = '2befabe753e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE match_type_enum AS ENUM ('FACEIT', 'MATCHMAKING', 'TOURNAMENT')")
    op.add_column(
        "videos",
        sa.Column("match_type", sa.Enum("FACEIT", "MATCHMAKING", "TOURNAMENT", name="match_type_enum", create_type=False), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("videos", "match_type")
    op.execute("DROP TYPE match_type_enum")
