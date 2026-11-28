from datetime import UTC, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.catalog.importer import (
    DEMO_CATALOG_TRACK_IDS,
    load_catalog,
    seed_catalog_records,
    seed_demo_catalog,
)
from app.catalog.models import Song, SongProviderRecord
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_engine
from app.main import create_app


@pytest.fixture
def empty_catalog_db():
    engine = get_db_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)


@pytest.fixture
def catalog_api(empty_catalog_db):
    with Session(empty_catalog_db, autoflush=False, autocommit=False) as db:
        seed_catalog_records(db, load_catalog())
    app = create_app(get_settings())
    client = TestClient(app, raise_server_exceptions=False)
    try:
        yield client, empty_catalog_db
    finally:
        client.close()


def test_catalog_search_filters_and_rejects_invalid_queries(catalog_api) -> None:
    client, _engine = catalog_api

    matching = client.get(
        "/api/v1/songs",
        params={"q": "  levitating ", "genre": "POP", "limit": 1},
    )
    assert matching.status_code == 200
    response = matching.json()
    assert len(response["items"]) == 1
    assert response["items"][0]["title"] == "Levitating"
    assert response["items"][0]["genres"] == ["Pop"]
    assert "nextCursor" not in response or response["nextCursor"] is None

    assert client.get("/api/v1/songs", params={"q": "x" * 101}).status_code == 422
    assert client.get("/api/v1/songs", params={"genre": "x" * 81}).status_code == 422
    assert client.get("/api/v1/songs", params={"limit": 0}).status_code == 422
    assert client.get("/api/v1/songs", params={"limit": 51}).status_code == 422
    assert client.get("/api/v1/songs", params={"cursor": "not-a-cursor"}).status_code == 422
    assert client.get(
        "/api/v1/songs",
        params={"q": "x", "cursor": "c" * 161},
    ).status_code == 422
    assert len(client.get("/api/v1/songs", params={"limit": 1}).json()["items"]) == 1
    assert len(client.get("/api/v1/songs", params={"limit": 50}).json()["items"]) == 40
    assert client.get("/api/v1/songs", params={"q": "%"}).json()["items"] == []


def test_cursor_pagination_is_stable_and_bound_to_filters(catalog_api) -> None:
    client, _engine = catalog_api

    first = client.get("/api/v1/songs", params={"limit": 7})
    assert first.status_code == 200
    expected = first.json()["items"]
    cursor = first.json()["nextCursor"]
    assert cursor

    second = client.get(
        "/api/v1/songs",
        params={"limit": 7, "cursor": cursor},
    )
    assert second.status_code == 200
    all_ids = [item["id"] for item in expected + second.json()["items"]]
    assert len(all_ids) == len(set(all_ids))

    repeated = client.get("/api/v1/songs", params={"limit": 7})
    assert [item["id"] for item in repeated.json()["items"]] == [
        item["id"] for item in expected
    ]
    mismatch = client.get(
        "/api/v1/songs",
        params={"q": "Jazz", "limit": 7, "cursor": cursor},
    )
    assert mismatch.status_code == 422

    all_pages = []
    next_cursor = None
    while True:
        params = {"limit": 9}
        if next_cursor:
            params["cursor"] = next_cursor
        page = client.get("/api/v1/songs", params=params)
        assert page.status_code == 200
        all_pages.extend(page.json()["items"])
        next_cursor = page.json()["nextCursor"]
        if next_cursor is None:
            break
    assert len(all_pages) == 40
    assert len({item["id"] for item in all_pages}) == 40
    assert all_pages == sorted(
        all_pages,
        key=lambda item: (
            item["title"].casefold(),
            item["artist"].casefold(),
            item["id"],
        ),
    )


def test_song_detail_ids_are_internal_and_provider_ids_stay_separate(catalog_api) -> None:
    client, _engine = catalog_api
    song = next(record for record in load_catalog() if record.provider_track_id == "1538003843")

    detail = client.get(f"/api/v1/songs/{song.id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == str(song.id)
    assert body["sources"][0]["providerName"] == "Apple iTunes Search API"
    assert body["sources"][0]["providerTrackId"] == "1538003843"
    assert "artworkUrl" not in body
    assert "coverFile" not in body
    assert "count" not in body

    provider_id_as_internal_id = client.get("/api/v1/songs/1538003843")
    assert provider_id_as_internal_id.status_code == 422
    assert client.get(f"/api/v1/songs/{UUID(int=0)}").status_code == 404


def test_missing_or_retired_provider_mapping_does_not_break_song_metadata(
    catalog_api,
) -> None:
    client, engine = catalog_api
    record = next(item for item in load_catalog() if item.provider_track_id == "1538003843")
    with Session(engine) as db:
        source = db.scalar(
            select(SongProviderRecord).where(
                SongProviderRecord.provider_track_id == record.provider_track_id
            )
        )
        assert source is not None
        source.retired_at = datetime.now(UTC)
        db.commit()

    retired = client.get(f"/api/v1/songs/{record.id}")
    assert retired.status_code == 200
    assert retired.json()["sources"] == []
    assert retired.json()["title"] == "Levitating"

    with Session(engine) as db:
        source = db.scalar(
            select(SongProviderRecord).where(
                SongProviderRecord.provider_track_id == record.provider_track_id
            )
        )
        assert source is not None
        db.delete(source)
        db.commit()

    missing = client.get(f"/api/v1/songs/{record.id}")
    assert missing.status_code == 200
    assert missing.json()["sources"] == []


def test_provider_mapping_is_unique_per_case_insensitive_provider_name(
    catalog_api,
) -> None:
    _client, engine = catalog_api
    record = next(item for item in load_catalog() if item.provider_track_id == "1538003843")

    with Session(engine) as db:
        duplicate = SongProviderRecord(
            song_id=record.id,
            provider_name="apple itunes search api",
            provider_key="apple itunes search api",
            provider_track_id=record.provider_track_id,
        )
        db.add(duplicate)
        with pytest.raises(IntegrityError):
            db.flush()
        db.rollback()


def test_public_search_returns_only_catalog_metadata(catalog_api) -> None:
    client, _engine = catalog_api

    response = client.get("/api/v1/songs")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 20
    first = response.json()["items"][0]
    assert set(first) == {
        "id",
        "title",
        "artist",
        "album",
        "durationMs",
        "genres",
        "releaseDate",
        "sources",
    }
    assert all("permissions" not in item for item in response.json()["items"])

    openapi = client.app.openapi()
    assert "/api/v1/songs/{songId}" in openapi["paths"]
    assert (
        openapi["components"]["schemas"]["SongSearchResponse"]["example"]["items"][0][
            "id"
        ]
        == "e9466fa3-3e0a-5f93-8d4a-1ff70a27904d"
    )


def test_demo_catalog_seed_is_small_idempotent_and_non_destructive(
    empty_catalog_db,
) -> None:
    engine = empty_catalog_db
    with Session(engine, autoflush=False, autocommit=False) as db:
        first = seed_demo_catalog(db)
        assert len(first.created_ids) == len(DEMO_CATALOG_TRACK_IDS)
        assert first.skipped_ids == ()
        assert set(first.created_ids) == {
            UUID("e9466fa3-3e0a-5f93-8d4a-1ff70a27904d"),
            UUID("178d6686-3f93-5b74-8bab-a02641ce11e1"),
            UUID("ffcc2828-adba-5db4-803e-42b3b75a8e47"),
        }

        modified = db.get(Song, first.created_ids[0])
        assert modified is not None
        modified.title = "User-edited demo title"
        db.commit()

        second = seed_demo_catalog(db)
        assert second.created_ids == ()
        assert set(second.skipped_ids) == set(first.created_ids)
        db.refresh(modified)
        assert modified.title == "User-edited demo title"
