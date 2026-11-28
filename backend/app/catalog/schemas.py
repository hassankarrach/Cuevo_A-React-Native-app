from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.auth.schemas import to_camel


class CatalogModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class SongSourceResponse(CatalogModel):
    provider_name: str
    provider_track_id: str
    reference_url: str
    retrieved_on: date


class SongResponse(CatalogModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "id": "e9466fa3-3e0a-5f93-8d4a-1ff70a27904d",
                "title": "Levitating",
                "artist": "Dua Lipa",
                "album": "Future Nostalgia",
                "durationMs": 203808,
                "genres": ["Pop"],
                "releaseDate": "2020-03-27",
                "sources": [
                    {
                        "providerName": "Apple iTunes Search API",
                        "providerTrackId": "1538003843",
                        "referenceUrl": "https://music.apple.com/us/album/levitating/1538003494?i=1538003843&uo=4",
                        "retrievedOn": "2026-11-18",
                    }
                ],
            }
        },
    )

    id: UUID
    title: str
    artist: str
    album: str | None
    duration_ms: int
    genres: list[str]
    release_date: date | None
    sources: list[SongSourceResponse]


class SongSearchResponse(CatalogModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": "e9466fa3-3e0a-5f93-8d4a-1ff70a27904d",
                        "title": "Levitating",
                        "artist": "Dua Lipa",
                        "album": "Future Nostalgia",
                        "durationMs": 203808,
                        "genres": ["Pop"],
                        "releaseDate": "2020-03-27",
                        "sources": [
                            {
                                "providerName": "Apple iTunes Search API",
                                "providerTrackId": "1538003843",
                                "referenceUrl": "https://music.apple.com/us/album/levitating/1538003494?i=1538003843&uo=4",
                                "retrievedOn": "2026-11-18",
                            }
                        ],
                    }
                ],
                "nextCursor": None,
            }
        },
    )

    items: list[SongResponse]
    next_cursor: str | None
