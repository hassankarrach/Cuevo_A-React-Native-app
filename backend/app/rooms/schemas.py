from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.auth.schemas import AuthModel


Visibility = Literal["public", "private"]
VoteEligibility = Literal["everyone", "invitees"]


class RoomCreate(AuthModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=1000)
    visibility: Visibility = "public"
    vote_eligibility: VoteEligibility = "everyone"
    operation_id: UUID

    @field_validator("name", "description")
    @classmethod
    def trim_text(cls, value: str, info) -> str:
        normalized = value.strip()
        if info.field_name == "name" and not normalized:
            raise ValueError("Name must not be blank.")
        return normalized


class RoomUpdate(AuthModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    visibility: Visibility | None = None
    vote_eligibility: VoteEligibility | None = None

    @field_validator("name", "description")
    @classmethod
    def trim_optional_text(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if info.field_name == "name" and not normalized:
            raise ValueError("Name must not be blank.")
        return normalized


class RoomMutation(AuthModel):
    expected_revision: str = Field(pattern=r"^[1-9][0-9]{0,17}$")
    operation_id: UUID


class RoomInvitationCreate(RoomMutation):
    invitee_account_id: UUID


class RoomInvitationRespond(AuthModel):
    response: Literal["accepted", "declined"]


class RoomInvitationResponse(AuthModel):
    id: UUID
    room_id: UUID
    invitee_account_id: UUID
    inviter_account_id: UUID
    status: Literal["pending", "accepted", "declined", "revoked"]
    created_at: datetime
    updated_at: datetime


class RoomInvitationListResponse(AuthModel):
    items: list[RoomInvitationResponse]


class RoomJoinCodeResponse(AuthModel):
    room_id: UUID
    code: str
    expires_at: datetime


class RoomJoinCodeRedeem(AuthModel):
    code: str = Field(pattern=r"^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$")


class RoomPermissions(AuthModel):
    can_read: bool
    can_join: bool
    can_leave: bool
    can_vote: bool
    can_manage: bool
    can_invite: bool


class RoomParticipant(AuthModel):
    account_id: UUID
    role: Literal["host", "member"]
    joined_at: datetime


class RoomResponse(AuthModel):
    id: UUID
    name: str
    description: str
    host_account_id: UUID
    visibility: Visibility
    vote_eligibility: VoteEligibility
    status: Literal["active", "ended"]
    revision: str
    participants_count: int
    viewer_role: Literal["host", "member", "visitor"]
    permissions: RoomPermissions
    created_at: datetime
    updated_at: datetime
    ended_at: datetime | None


class RoomDetailResponse(RoomResponse):
    participants: list[RoomParticipant]


class RoomListResponse(AuthModel):
    items: list[RoomResponse]
    next_cursor: str | None


class RoomEventResponse(AuthModel):
    event_id: UUID
    type: str
    resource_type: Literal["room"] = "room"
    resource_id: UUID
    revision: str
    occurred_at: datetime
    operation_id: UUID | None
    payload: dict[str, object]


class RoomCodeResponse(AuthModel):
    joined: bool
    room: RoomResponse
