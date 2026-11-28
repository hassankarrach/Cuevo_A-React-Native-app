from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth.schemas import to_camel


Visibility = Literal["public", "private"]
EditPolicy = Literal["owner", "collaborators", "everyone"]


class PlaylistModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class PlaylistCreate(PlaylistModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    visibility: Visibility = "public"
    edit_policy: EditPolicy = "everyone"
    operation_id: UUID

    @field_validator("name", "description")
    @classmethod
    def trim_text(cls, value: str, info) -> str:
        normalized = value.strip()
        if info.field_name == "name" and not normalized:
            raise ValueError("Name must not be blank.")
        return normalized


class PlaylistUpdate(PlaylistModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    visibility: Visibility | None = None
    edit_policy: EditPolicy | None = None

    @field_validator("name", "description")
    @classmethod
    def trim_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if info.field_name == "name" and not normalized:
            raise ValueError("Name must not be blank.")
        return normalized


class PlaylistEntryResponse(PlaylistModel):
    id: UUID
    song_id: UUID
    added_by_account_id: UUID | None
    position: int
    created_at: datetime


class PlaylistPermissions(PlaylistModel):
    can_read: bool
    can_edit: bool
    can_manage: bool


class PlaylistResponse(PlaylistModel):
    id: UUID
    name: str
    description: str
    owner_account_id: UUID
    visibility: Visibility
    edit_policy: EditPolicy
    collaborator_ids: list[UUID]
    entries: list[PlaylistEntryResponse]
    revision: str
    updated_at: datetime
    permissions: PlaylistPermissions


class PlaylistListResponse(PlaylistModel):
    items: list[PlaylistResponse]
    next_cursor: str | None


class PlaylistMutation(PlaylistModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID


class AddEntries(PlaylistMutation):
    song_ids: list[UUID] = Field(min_length=1, max_length=100)

    @field_validator("song_ids")
    @classmethod
    def unique_songs(cls, values: list[UUID]) -> list[UUID]:
        if len(values) != len(set(values)):
            raise ValueError("A song may occur only once in a playlist.")
        return values


class RemoveEntry(PlaylistMutation):
    entry_id: UUID


class ReorderEntries(PlaylistMutation):
    entry_ids: list[UUID] = Field(max_length=500)

    @field_validator("entry_ids")
    @classmethod
    def unique_entries(cls, values: list[UUID]) -> list[UUID]:
        if len(values) != len(set(values)):
            raise ValueError("Entry IDs must be unique.")
        return values


class PlaylistInvitationCreate(PlaylistModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID
    invitee_account_id: UUID


class PlaylistInvitationRespond(PlaylistModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID
    response: Literal["accepted", "declined"]


class PlaylistInvitationResponse(PlaylistModel):
    id: UUID
    playlist_id: UUID
    invitee_account_id: UUID
    inviter_account_id: UUID
    status: Literal["pending", "accepted", "declined", "revoked"]
    created_at: datetime
    updated_at: datetime


class PlaylistInvitationListResponse(PlaylistModel):
    items: list[PlaylistInvitationResponse]


class PlaylistEventResponse(PlaylistModel):
    event_id: UUID
    type: str
    resource_type: Literal["playlist"] = "playlist"
    resource_id: UUID
    revision: str
    occurred_at: datetime
    operation_id: UUID | None
    payload: dict[str, object]


class PlaylistDeleteResponse(PlaylistModel):
    deleted: bool
    revision: str
