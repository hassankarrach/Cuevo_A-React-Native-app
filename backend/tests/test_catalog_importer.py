import json
from pathlib import Path
from uuid import UUID

import pytest

from app.catalog.importer import (
    CATALOG_NAMESPACE,
    load_catalog,
    normalize_catalog_record,
)


def _record() -> dict[str, object]:
    return {
        "id": "fixture-slug-that-is-not-an-internal-id",
        "title": "  Cafe\u0301   Song ",
        "artist": "Artist",
        "album": "Album",
        "durationMs": 123456,
        "duration": "2:03",
        "genres": [" Pop ", "R&B"],
        "releaseDate": "2024-01-02",
        "coverFile": "not-imported.jpg",
        "artworkUrl": "https://example.invalid/art.jpg",
        "source": {
            "provider": " Test Provider ",
            "trackId": " 12345 ",
            "url": "https://example.invalid/song/12345",
            "retrievedOn": "2026-11-18",
        },
    }


def test_approved_artifact_has_40_normalized_provider_records() -> None:
    records = load_catalog()

    assert len(records) == 40
    assert len({record.id for record in records}) == 40
    assert len({(record.provider_name.casefold(), record.provider_track_id) for record in records}) == 40
    assert all(record.reference_url.startswith("https://") for record in records)


def test_normalization_uses_opaque_id_and_approved_fields_only() -> None:
    raw = _record()
    normalized = normalize_catalog_record(raw)
    raw["id"] = "a-different-fixture-slug"
    second_normalized = normalize_catalog_record(raw)

    assert normalized.id == UUID("fd2243b6-09e2-5ab3-adda-994309e7d826")
    assert normalized.id == second_normalized.id
    assert normalized.title == "Café Song"
    assert normalized.genres == (("pop", "Pop"), ("r&b", "R&B"))
    assert normalized.duration_ms == 123456
    assert not hasattr(normalized, "artwork_url")
    assert not hasattr(normalized, "cover_file")


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("durationMs", 0),
        ("durationMs", True),
        ("title", "   "),
        ("genres", []),
        ("releaseDate", "not-a-date"),
    ],
)
def test_normalization_rejects_invalid_metadata(
    field: str,
    value: object,
) -> None:
    raw = _record()
    raw[field] = value

    with pytest.raises(ValueError):
        normalize_catalog_record(raw)


def test_import_artifact_rejects_provider_pair_duplicates(tmp_path: Path) -> None:
    first = _record()
    duplicate = _record()
    duplicate["id"] = "different-source-slug"
    duplicate_source = dict(first["source"])
    duplicate_source["provider"] = "test provider"
    duplicate["source"] = duplicate_source
    path = tmp_path / "duplicate.json"
    path.write_text(json.dumps([first, duplicate]), encoding="utf-8")

    with pytest.raises(ValueError, match="duplicate provider track ID"):
        load_catalog(path)


def test_same_track_id_from_a_different_provider_is_a_distinct_mapping(
    tmp_path: Path,
) -> None:
    first = _record()
    second = _record()
    second_source = dict(first["source"])
    second_source["provider"] = "Another Provider"
    second["source"] = second_source
    path = tmp_path / "multiple-providers.json"
    path.write_text(json.dumps([first, second]), encoding="utf-8")

    records = load_catalog(path)

    assert len(records) == 2
    assert records[0].provider_track_id == records[1].provider_track_id
    assert records[0].id != records[1].id


def test_internal_id_namespace_is_stable() -> None:
    assert str(CATALOG_NAMESPACE) == "13c0f1b3-82a9-4e31-bcad-e57c9397eaa1"
