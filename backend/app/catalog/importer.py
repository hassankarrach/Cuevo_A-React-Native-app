import hashlib
import json
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any
from uuid import UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catalog.models import Song, SongGenre, SongProviderRecord


CATALOG_NAMESPACE = UUID("13c0f1b3-82a9-4e31-bcad-e57c9397eaa1")
CATALOG_DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "songs.json"
DEMO_CATALOG_TRACK_IDS = frozenset({"1538003843", "696886431", "1102337226"})


@dataclass(frozen=True)
class CatalogSong:
    id: UUID
    title: str
    title_sort_key: str
    artist: str
    artist_sort_key: str
    album: str | None
    album_search_key: str | None
    duration_ms: int
    genres: tuple[tuple[str, str], ...]
    release_date: date | None
    provider_name: str
    provider_track_id: str
    reference_url: str
    retrieved_on: date


@dataclass(frozen=True)
class CatalogSeedResult:
    created_ids: tuple[UUID, ...]
    skipped_ids: tuple[UUID, ...]


def _text(value: object, field: str, *, optional: bool = False) -> str | None:
    if value is None and optional:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    normalized = unicodedata.normalize("NFC", " ".join(value.split()))
    if not normalized:
        if optional:
            return None
        raise ValueError(f"{field} must not be blank")
    return normalized


def _identifier(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    normalized = unicodedata.normalize("NFC", value.strip())
    if not normalized:
        raise ValueError(f"{field} must not be blank")
    return normalized


def _date(value: object, field: str) -> date | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an ISO date")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field} must be an ISO date") from exc


def normalize_catalog_record(raw: object) -> CatalogSong:
    if not isinstance(raw, dict):
        raise ValueError("Each catalog record must be an object")

    title = _text(raw.get("title"), "title")
    artist = _text(raw.get("artist"), "artist")
    album = _text(raw.get("album"), "album", optional=True)
    if title is None or artist is None:
        raise ValueError("title and artist are required")
    if len(title) > 200 or len(artist) > 200:
        raise ValueError("title and artist must be 200 characters or fewer")
    if album is not None and len(album) > 200:
        raise ValueError("album must be 200 characters or fewer")

    duration_ms = raw.get("durationMs")
    if (
        not isinstance(duration_ms, int)
        or isinstance(duration_ms, bool)
        or duration_ms <= 0
    ):
        raise ValueError("durationMs must be a positive integer")

    raw_genres = raw.get("genres")
    if not isinstance(raw_genres, list) or not raw_genres:
        raise ValueError("genres must be a non-empty list")
    genre_by_key: dict[str, str] = {}
    for raw_genre in raw_genres:
        genre = _text(raw_genre, "genre")
        if genre is None:
            raise ValueError("genre must not be blank")
        if len(genre) > 80:
            raise ValueError("genres must be 80 characters or fewer")
        key = genre.casefold()
        if key in genre_by_key:
            raise ValueError("genres must be unique ignoring case")
        genre_by_key[key] = genre

    raw_source = raw.get("source")
    if not isinstance(raw_source, dict):
        raise ValueError("source must be an object")
    provider_name = _text(raw_source.get("provider"), "source.provider")
    provider_track_id = _identifier(raw_source.get("trackId"), "source.trackId")
    if provider_name is None:
        raise ValueError("source.provider must not be blank")
    if len(provider_name) > 100 or len(provider_track_id) > 255:
        raise ValueError("provider name or track ID exceeds its supported length")
    reference_url = _text(raw_source.get("url"), "source.url")
    if reference_url is None:
        raise ValueError("source.url must not be blank")
    if len(reference_url) > 2048 or not reference_url.startswith("https://"):
        raise ValueError("source.url must be an HTTPS URL of at most 2048 characters")
    retrieved_on = _date(raw_source.get("retrievedOn"), "source.retrievedOn")
    if retrieved_on is None:
        raise ValueError("source.retrievedOn is required for catalog attribution")

    provider_key = unicodedata.normalize("NFC", provider_name.casefold())
    internal_id = uuid5(
        CATALOG_NAMESPACE,
        f"{provider_key}\x1f{provider_track_id}",
    )
    sort_title = title.casefold()
    sort_artist = artist.casefold()
    return CatalogSong(
        id=internal_id,
        title=title,
        title_sort_key=sort_title,
        artist=artist,
        artist_sort_key=sort_artist,
        album=album,
        album_search_key=album.casefold() if album is not None else None,
        duration_ms=duration_ms,
        genres=tuple(sorted(genre_by_key.items())),
        release_date=_date(raw.get("releaseDate"), "releaseDate"),
        provider_name=provider_name,
        provider_track_id=provider_track_id,
        reference_url=reference_url,
        retrieved_on=retrieved_on,
    )


def load_catalog(path: Path = CATALOG_DATA_PATH) -> list[CatalogSong]:
    try:
        raw_records: Any = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Catalog source is not valid JSON: {path}") from exc
    if not isinstance(raw_records, list):
        raise ValueError("Catalog source must contain a JSON array")

    records: list[CatalogSong] = []
    provider_keys: set[tuple[str, str]] = set()
    internal_ids: set[UUID] = set()
    for raw_record in raw_records:
        record = normalize_catalog_record(raw_record)
        provider_key = (
            unicodedata.normalize("NFC", record.provider_name.casefold()),
            record.provider_track_id,
        )
        if provider_key in provider_keys:
            raise ValueError("Catalog source contains a duplicate provider track ID")
        if record.id in internal_ids:
            raise ValueError("Catalog source produces duplicate internal song IDs")
        provider_keys.add(provider_key)
        internal_ids.add(record.id)
        records.append(record)
    return records


def _make_song(record: CatalogSong) -> Song:
    song = Song(
        id=record.id,
        title=record.title,
        title_sort_key=record.title_sort_key,
        artist=record.artist,
        artist_sort_key=record.artist_sort_key,
        album=record.album,
        album_search_key=record.album_search_key,
        duration_ms=record.duration_ms,
        release_date=record.release_date,
    )
    song.genres = [
        SongGenre(song_id=record.id, genre_key=key, genre_name=name)
        for key, name in record.genres
    ]
    song.sources = [
        SongProviderRecord(
            song_id=record.id,
            provider_name=record.provider_name,
            provider_key=unicodedata.normalize(
                "NFC",
                record.provider_name.casefold(),
            ),
            provider_track_id=record.provider_track_id,
            reference_url=record.reference_url,
            retrieved_on=record.retrieved_on,
        )
    ]
    return song


def seed_catalog_records(
    db: Session,
    records: list[CatalogSong],
) -> CatalogSeedResult:
    if db.in_transaction():
        raise RuntimeError("Catalog seeding requires a session with no active transaction.")

    created: list[UUID] = []
    skipped: list[UUID] = []
    with db.begin():
        for record in records:
            existing_source = db.scalar(
                select(SongProviderRecord).where(
                    SongProviderRecord.provider_key
                    == unicodedata.normalize("NFC", record.provider_name.casefold()),
                    SongProviderRecord.provider_track_id == record.provider_track_id,
                )
            )
            if existing_source is not None:
                if existing_source.song_id != record.id:
                    raise ValueError(
                        "Provider track ID is already mapped to a different song"
                    )
                skipped.append(record.id)
                continue

            if db.get(Song, record.id) is not None:
                skipped.append(record.id)
                continue

            db.add(_make_song(record))
            db.flush()
            created.append(record.id)

    return CatalogSeedResult(tuple(created), tuple(skipped))


def seed_demo_catalog(db: Session) -> CatalogSeedResult:
    records = [
        record
        for record in load_catalog()
        if record.provider_track_id in DEMO_CATALOG_TRACK_IDS
    ]
    if len(records) != len(DEMO_CATALOG_TRACK_IDS):
        raise ValueError("The approved catalog source is missing a demo fixture record")
    return seed_catalog_records(db, records)


def search_filter_fingerprint(query: str | None, genre: str | None) -> str:
    value = f"{query or ''}\x1f{genre or ''}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def main() -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import get_settings
    from app.dev_seed import validate_seed_target

    settings = get_settings()
    validate_seed_target(settings)
    records = load_catalog()
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with Session(engine, autoflush=False, autocommit=False) as db:
            result = seed_catalog_records(db, records)
    finally:
        engine.dispose()
    print(
        f"Imported {len(result.created_ids)} song(s); "
        f"skipped {len(result.skipped_ids)} existing song(s)."
    )


if __name__ == "__main__":
    main()
