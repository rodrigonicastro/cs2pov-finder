"""add_preferred_roles_to_users

Revision ID: e7b3a1c2f4d9
Revises: c4e1f9a2b3d7
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from alembic import op

revision: str = 'e7b3a1c2f4d9'
down_revision: Union[str, None] = 'c4e1f9a2b3d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'preferred_roles', ARRAY(sa.Text()), server_default='{}', nullable=False
    ))


def downgrade() -> None:
    op.drop_column('users', 'preferred_roles')
