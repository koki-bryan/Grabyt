"""create playlists

Revision ID: 5e9c37a2b7d1
Revises: 9468759716a6
Create Date: 2026-10-26 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "5e9c37a2b7d1"
down_revision: Union[str, Sequence[str], None] = "9468759716a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "playlists",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "playlist_tracks",
        sa.Column("playlist_id", sa.UUID(), nullable=False),
        sa.Column("download_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["download_id"], ["downloads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("playlist_id", "download_id"),
        sa.UniqueConstraint("playlist_id", "position", name="uq_playlist_tracks_playlist_position"),
    )


def downgrade() -> None:
    op.drop_table("playlist_tracks")
    op.drop_table("playlists")
