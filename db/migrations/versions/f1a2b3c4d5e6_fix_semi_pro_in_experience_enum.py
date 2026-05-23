"""fix_semi_pro_in_experience_enum

Revision ID: f1a2b3c4d5e6
Revises: b1c2d3e4f5a6
Create Date: 2026-05-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE experience_enum RENAME VALUE 'semi-pro' TO 'semi_pro'")


def downgrade() -> None:
    op.execute("ALTER TYPE experience_enum RENAME VALUE 'semi_pro' TO 'semi-pro'")
