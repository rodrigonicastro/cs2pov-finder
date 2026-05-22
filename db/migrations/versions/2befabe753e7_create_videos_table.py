"""create_videos_table

Revision ID: 2befabe753e7
Revises: 3a1fa3b66d5e
Create Date: 2026-05-18 01:58:28.714836

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '2befabe753e7'
down_revision: Union[str, None] = '3a1fa3b66d5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "videos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("youtube_video_id", sa.String(20), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=True),
        sa.Column("t_role_id", sa.Integer(), nullable=True),
        sa.Column("ct_role_id", sa.Integer(), nullable=True),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["t_role_id"], ["map_roles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["ct_role_id"], ["map_roles.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("youtube_video_id"),
    )


def downgrade() -> None:
    op.drop_table("videos")
