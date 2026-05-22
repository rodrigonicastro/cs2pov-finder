"""unique_player_name

Revision ID: 3a1fa3b66d5e
Revises: 07ae7baf9cf3
Create Date: 2026-05-18 01:25:46.603249

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '3a1fa3b66d5e'
down_revision: Union[str, None] = '07ae7baf9cf3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_players_name", "players", ["name"])


def downgrade() -> None:
    op.drop_constraint("uq_players_name", "players", type_="unique")
