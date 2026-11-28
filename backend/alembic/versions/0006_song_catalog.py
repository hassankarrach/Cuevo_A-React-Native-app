"""Add the static song metadata catalog.

Revision ID: 0006_song_catalog
Revises: 0005_profile_avatars
Create Date: 2026-11-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0006_song_catalog"
down_revision = "0005_profile_avatars"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "songs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column(
            "title_sort_key",
            sa.String(length=600, collation="C"),
            nullable=False,
        ),
        sa.Column("artist", sa.String(length=200), nullable=False),
        sa.Column(
            "artist_sort_key",
            sa.String(length=600, collation="C"),
            nullable=False,
        ),
        sa.Column("album", sa.String(length=200), nullable=True),
        sa.Column(
            "album_search_key",
            sa.String(length=600, collation="C"),
            nullable=True,
        ),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("release_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(title) BETWEEN 1 AND 200 AND title = btrim(title)",
            name="ck_songs_title",
        ),
        sa.CheckConstraint(
            "length(artist) BETWEEN 1 AND 200 AND artist = btrim(artist)",
            name="ck_songs_artist",
        ),
        sa.CheckConstraint(
            "album IS NULL OR (length(album) BETWEEN 1 AND 200 AND album = btrim(album))",
            name="ck_songs_album",
        ),
        sa.CheckConstraint("duration_ms > 0", name="ck_songs_duration_ms"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_songs_catalog_order",
        "songs",
        ["title_sort_key", "artist_sort_key", "id"],
    )

    op.create_table(
        "song_genres",
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("genre_key", sa.String(length=160), nullable=False),
        sa.Column("genre_name", sa.String(length=80), nullable=False),
        sa.CheckConstraint(
            "length(genre_name) BETWEEN 1 AND 80 AND genre_name = btrim(genre_name)",
            name="ck_song_genres_name",
        ),
        sa.CheckConstraint(
            "length(genre_key) BETWEEN 1 AND 160",
            name="ck_song_genres_key",
        ),
        sa.ForeignKeyConstraint(
            ["song_id"],
            ["songs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("song_id", "genre_key"),
    )
    op.create_index(
        "ix_song_genres_key_song",
        "song_genres",
        ["genre_key", "song_id"],
    )

    op.create_table(
        "song_provider_records",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider_name", sa.String(length=100), nullable=False),
        sa.Column("provider_key", sa.String(length=300), nullable=False),
        sa.Column("provider_track_id", sa.String(length=255), nullable=False),
        sa.Column("reference_url", sa.String(length=2048), nullable=False),
        sa.Column("retrieved_on", sa.Date(), nullable=False),
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "length(provider_name) BETWEEN 1 AND 100 "
            "AND provider_name = btrim(provider_name)",
            name="ck_song_provider_records_name",
        ),
        sa.CheckConstraint(
            "length(provider_key) BETWEEN 1 AND 300",
            name="ck_song_provider_records_key",
        ),
        sa.CheckConstraint(
            "length(provider_track_id) BETWEEN 1 AND 255 "
            "AND provider_track_id = btrim(provider_track_id)",
            name="ck_song_provider_records_track_id",
        ),
        sa.CheckConstraint(
            "length(reference_url) BETWEEN 1 AND 2048",
            name="ck_song_provider_records_reference_url",
        ),
        sa.ForeignKeyConstraint(
            ["song_id"],
            ["songs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider_key",
            "provider_track_id",
            name="uq_song_provider_records_provider_track",
        ),
    )
    op.create_index(
        "ix_song_provider_records_song",
        "song_provider_records",
        ["song_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_song_provider_records_song", table_name="song_provider_records")
    op.drop_table("song_provider_records")
    op.drop_index("ix_song_genres_key_song", table_name="song_genres")
    op.drop_table("song_genres")
    op.drop_index("ix_songs_catalog_order", table_name="songs")
    op.drop_table("songs")
