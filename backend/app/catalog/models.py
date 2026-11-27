from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = (
        CheckConstraint(
            "length(title) BETWEEN 1 AND 200 AND title = btrim(title)",
            name="ck_songs_title",
        ),
        CheckConstraint(
            "length(artist) BETWEEN 1 AND 200 AND artist = btrim(artist)",
            name="ck_songs_artist",
        ),
        CheckConstraint(
            "album IS NULL OR (length(album) BETWEEN 1 AND 200 AND album = btrim(album))",
            name="ck_songs_album",
        ),
        CheckConstraint("duration_ms > 0", name="ck_songs_duration_ms"),
        Index("ix_songs_catalog_order", "title_sort_key", "artist_sort_key", "id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    title_sort_key: Mapped[str] = mapped_column(
        String(600, collation="C"), nullable=False
    )
    artist: Mapped[str] = mapped_column(String(200), nullable=False)
    artist_sort_key: Mapped[str] = mapped_column(
        String(600, collation="C"), nullable=False
    )
    album: Mapped[str | None] = mapped_column(String(200))
    album_search_key: Mapped[str | None] = mapped_column(
        String(600, collation="C")
    )
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    release_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    genres: Mapped[list["SongGenre"]] = relationship(
        back_populates="song",
        cascade="all, delete-orphan",
        order_by="SongGenre.genre_key",
    )
    sources: Mapped[list["SongProviderRecord"]] = relationship(
        back_populates="song",
        cascade="all, delete-orphan",
        order_by="SongProviderRecord.provider_name, SongProviderRecord.provider_track_id",
    )


class SongGenre(Base):
    __tablename__ = "song_genres"
    __table_args__ = (
        CheckConstraint(
            "length(genre_name) BETWEEN 1 AND 80 AND genre_name = btrim(genre_name)",
            name="ck_song_genres_name",
        ),
        CheckConstraint(
            "length(genre_key) BETWEEN 1 AND 160",
            name="ck_song_genres_key",
        ),
        Index("ix_song_genres_key_song", "genre_key", "song_id"),
    )

    song_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("songs.id", ondelete="CASCADE"),
        primary_key=True,
    )
    genre_key: Mapped[str] = mapped_column(String(160), primary_key=True)
    genre_name: Mapped[str] = mapped_column(String(80), nullable=False)

    song: Mapped[Song] = relationship(back_populates="genres")


class SongProviderRecord(Base):
    __tablename__ = "song_provider_records"
    __table_args__ = (
        CheckConstraint(
            "length(provider_name) BETWEEN 1 AND 100 "
            "AND provider_name = btrim(provider_name)",
            name="ck_song_provider_records_name",
        ),
        CheckConstraint(
            "length(provider_key) BETWEEN 1 AND 300",
            name="ck_song_provider_records_key",
        ),
        CheckConstraint(
            "length(provider_track_id) BETWEEN 1 AND 255 "
            "AND provider_track_id = btrim(provider_track_id)",
            name="ck_song_provider_records_track_id",
        ),
        CheckConstraint(
            "length(reference_url) BETWEEN 1 AND 2048",
            name="ck_song_provider_records_reference_url",
        ),
        UniqueConstraint(
            "provider_key",
            "provider_track_id",
            name="uq_song_provider_records_provider_track",
        ),
        Index("ix_song_provider_records_song", "song_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    song_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("songs.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_key: Mapped[str] = mapped_column(String(300), nullable=False)
    provider_track_id: Mapped[str] = mapped_column(String(255), nullable=False)
    reference_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    retrieved_on: Mapped[date] = mapped_column(Date, nullable=False)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    song: Mapped[Song] = relationship(back_populates="sources")
