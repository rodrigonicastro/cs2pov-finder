"""add_display_name_to_map_roles

Revision ID: b1c2d3e4f5a6
Revises: a6dcb4b158a6
Create Date: 2026-05-21 17:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a6dcb4b158a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('map_roles', sa.Column('display_name', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('map_roles', 'display_name')
