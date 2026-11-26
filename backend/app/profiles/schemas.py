import re
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth.schemas import to_camel


Genre = Annotated[str, Field(min_length=1, max_length=50)]


class ProfileModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class ProfileUpdate(ProfileModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=40)
    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=30,
        pattern=r"^[A-Za-z0-9_]{3,30}$",
        description=(
            "Unique username; ASCII letters, digits and underscore, "
            "normalized to lowercase."
        ),
    )
    bio: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=100)

    @field_validator("display_name", "username", "bio", "location", mode="before")
    @classmethod
    def strip_profile_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str | None) -> str | None:
        if value is not None:
            if not value.isascii():
                raise ValueError("Username may contain only ASCII letters, digits, and underscores")
            normalized = value.lower()
            if not re.fullmatch(r"[a-z0-9_]+", normalized):
                raise ValueError(
                    "Username may contain only ASCII letters, digits, and underscores"
                )
            return normalized
        return value


class MusicPreferencesUpdate(ProfileModel):
    preferred_genres: list[Genre] = Field(
        max_length=20,
        description="At most 20 unique genre names; duplicates ignoring case are invalid.",
    )

    @field_validator("preferred_genres", mode="before")
    @classmethod
    def strip_genres(cls, genres: object) -> object:
        if isinstance(genres, list):
            return [genre.strip() if isinstance(genre, str) else genre for genre in genres]
        return genres

    @field_validator("preferred_genres")
    @classmethod
    def normalize_genres(cls, genres: list[str]) -> list[str]:
        seen: set[str] = set()
        for genre in genres:
            key = genre.casefold()
            if key in seen:
                raise ValueError("Genres must be unique")
            seen.add(key)
        return genres


class PrivacyUpdate(ProfileModel):
    privacy: Literal["public", "friends", "private"]


class ProfilePermissions(ProfileModel):
    can_edit: bool
    can_view_private_fields: bool
    can_request_friendship: bool
    can_respond_to_friend_request: bool
    can_remove_friend: bool


class ProfileResponse(ProfileModel):
    account_id: UUID
    display_name: str
    username: str
    privacy: Literal["public", "friends", "private"]
    relationship_status: Literal[
        "self",
        "friends",
        "outgoing_pending",
        "incoming_pending",
        "none",
    ]
    bio: str | None = None
    location: str | None = None
    preferred_genres: list[Genre] | None = None
    permissions: ProfilePermissions


class FriendRequestCreate(ProfileModel):
    target_account_id: UUID


class RelationshipResponse(ProfileModel):
    account_id: UUID
    status: Literal[
        "self",
        "friends",
        "outgoing_pending",
        "incoming_pending",
        "none",
    ]


class FriendRequestResponse(ProfileModel):
    id: UUID
    account_id: UUID
    status: Literal["friends", "outgoing_pending", "incoming_pending", "none"]
    created_at: datetime


class FriendListItem(ProfileModel):
    id: UUID
    account_id: UUID
    display_name: str | None = None
    username: str | None = None
    created_at: datetime


class FriendListResponse(ProfileModel):
    items: list[FriendListItem]
    next_cursor: UUID | None
