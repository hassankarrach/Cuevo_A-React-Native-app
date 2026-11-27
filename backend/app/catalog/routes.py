import base64
import hmac
import unicodedata
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql import collate

from app.api.errors import APIError
from app.catalog.importer import search_filter_fingerprint
from app.catalog.models import Song, SongGenre
from app.catalog.schemas import (
    SongResponse,
    SongSearchResponse,
    SongSourceResponse,
)
from app.db.session import get_db


router = APIRouter(prefix="/api/v1/songs", tags=["songs"])
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


def _normalize_filter(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = unicodedata.normalize("NFC", " ".join(value.split())).casefold()
    return normalized or None


def _cursor_encode(song_id: UUID, fingerprint: str) -> str:
    payload = f"v1\n{fingerprint}\n{song_id}".encode("ascii")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _cursor_decode(cursor: str, fingerprint: str) -> UUID:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = base64.b64decode(
            padded.encode("ascii"),
            altchars=b"-_",
            validate=True,
        ).decode("ascii")
        version, cursor_fingerprint, song_id = payload.split("\n")
        if version != "v1" or not hmac.compare_digest(
            cursor_fingerprint,
            fingerprint,
        ):
            raise ValueError
        return UUID(song_id)
    except (ValueError, UnicodeDecodeError, UnicodeEncodeError) as exc:
        raise APIError(
            422,
            "INVALID_CURSOR",
            "The pagination cursor is invalid for this search.",
        ) from exc


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _song_response(song: Song) -> SongResponse:
    return SongResponse(
        id=song.id,
        title=song.title,
        artist=song.artist,
        album=song.album,
        duration_ms=song.duration_ms,
        genres=[genre.genre_name for genre in song.genres],
        release_date=song.release_date,
        sources=[
            SongSourceResponse(
                provider_name=source.provider_name,
                provider_track_id=source.provider_track_id,
                reference_url=source.reference_url,
                retrieved_on=source.retrieved_on,
            )
            for source in song.sources
            if source.retired_at is None
        ],
    )


def _song_query():
    return select(Song).options(
        selectinload(Song.genres),
        selectinload(Song.sources),
    )


@router.get("", response_model=SongSearchResponse)
def search_songs(
    q: str | None = Query(
        default=None,
        max_length=100,
        description="Text in title, artist, or album.",
    ),
    genre: str | None = Query(
        default=None,
        max_length=80,
        description="Exact genre, case-insensitive.",
    ),
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    cursor: Annotated[str | None, Query(max_length=160)] = None,
    db: Session = Depends(get_db),
) -> SongSearchResponse:
    normalized_query = _normalize_filter(q)
    normalized_genre = _normalize_filter(genre)
    fingerprint = search_filter_fingerprint(normalized_query, normalized_genre)
    statement = _song_query()

    if normalized_query is not None:
        pattern = f"%{_escape_like(normalized_query)}%"
        statement = statement.where(
            or_(
                Song.title_sort_key.like(pattern, escape="\\"),
                Song.artist_sort_key.like(pattern, escape="\\"),
                Song.album_search_key.like(pattern, escape="\\"),
            )
        )
    if normalized_genre is not None:
        statement = statement.where(
            Song.genres.any(SongGenre.genre_key == normalized_genre)
        )
    if cursor is not None:
        cursor_id = _cursor_decode(cursor, fingerprint)
        boundary = db.get(Song, cursor_id)
        if boundary is None:
            raise APIError(
                422,
                "INVALID_CURSOR",
                "The pagination cursor is invalid for this search.",
            )
        statement = statement.where(
            or_(
                collate(Song.title_sort_key, "C")
                > boundary.title_sort_key,
                and_(
                    Song.title_sort_key == boundary.title_sort_key,
                    collate(Song.artist_sort_key, "C")
                    > boundary.artist_sort_key,
                ),
                and_(
                    Song.title_sort_key == boundary.title_sort_key,
                    Song.artist_sort_key == boundary.artist_sort_key,
                    Song.id > boundary.id,
                ),
            )
        )

    statement = statement.order_by(
        Song.title_sort_key,
        Song.artist_sort_key,
        Song.id,
    ).limit(limit + 1)
    songs = list(db.scalars(statement).all())
    has_more = len(songs) > limit
    page = songs[:limit]
    next_cursor = _cursor_encode(page[-1].id, fingerprint) if has_more else None
    return SongSearchResponse(
        items=[_song_response(song) for song in page],
        next_cursor=next_cursor,
    )


@router.get("/{songId}", response_model=SongResponse)
def get_song(
    song_id: UUID = Path(alias="songId"),
    db: Session = Depends(get_db),
) -> SongResponse:
    song = db.scalar(_song_query().where(Song.id == song_id))
    if song is None:
        raise APIError(404, "NOT_FOUND", "The requested resource was not found.")
    return _song_response(song)
