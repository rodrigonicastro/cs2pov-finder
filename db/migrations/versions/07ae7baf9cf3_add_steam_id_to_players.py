"""add_steam_id_to_players

Revision ID: 07ae7baf9cf3
Revises: a1b2c3d4e5f6
Create Date: 2026-05-18 00:53:18.556161

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '07ae7baf9cf3'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("players", sa.Column("steam_id", sa.String(20), nullable=True))
    op.create_unique_constraint("uq_players_steam_id", "players", ["steam_id"])


def downgrade() -> None:
    op.drop_constraint("uq_players_steam_id", "players", type_="unique")
    op.drop_column("players", "steam_id")
