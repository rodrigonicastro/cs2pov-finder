"""remove_matchmaking_from_match_type

Revision ID: d0bf7e4df6c2
Revises: a6ca3cc5643b
Create Date: 2026-05-19 02:55:29.347930

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'd0bf7e4df6c2'
down_revision: Union[str, None] = 'a6ca3cc5643b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE videos SET match_type = 'FACEIT' WHERE match_type = 'MATCHMAKING'")
    op.execute("CREATE TYPE match_type_enum_new AS ENUM ('FACEIT', 'TOURNAMENT')")
    op.execute("ALTER TABLE videos ALTER COLUMN match_type TYPE match_type_enum_new USING match_type::text::match_type_enum_new")
    op.execute("DROP TYPE match_type_enum")
    op.execute("ALTER TYPE match_type_enum_new RENAME TO match_type_enum")


def downgrade() -> None:
    op.execute("CREATE TYPE match_type_enum_new AS ENUM ('FACEIT', 'MATCHMAKING', 'TOURNAMENT')")
    op.execute("ALTER TABLE videos ALTER COLUMN match_type TYPE match_type_enum_new USING match_type::text::match_type_enum_new")
    op.execute("DROP TYPE match_type_enum")
    op.execute("ALTER TYPE match_type_enum_new RENAME TO match_type_enum")
