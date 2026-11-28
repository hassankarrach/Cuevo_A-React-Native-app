from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.auth.schemas import to_camel


class NotificationModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class NotificationActor(NotificationModel):
    account_id: UUID
    display_name: str
    username: str


class NotificationDestination(NotificationModel):
    type: Literal["profile", "playlist", "room"]
    id: UUID


class NotificationResponse(NotificationModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        json_schema_extra={
            "example": {
                "id": "c1b2a3d4-e5f6-4789-8012-3456789abcde",
                "kind": "friend_request",
                "actor": {
                    "accountId": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
                    "displayName": "Alex Example",
                    "username": "alex_example",
                },
                "destination": {
                    "type": "profile",
                    "id": "b1c2d3e4-f5a6-4789-8012-3456789abcde",
                },
                "createdAt": "2026-11-27T14:00:00Z",
                "readAt": None,
            }
        },
    )

    id: UUID
    kind: str = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    actor: NotificationActor | None
    destination: NotificationDestination | None
    created_at: datetime
    read_at: datetime | None


class NotificationListResponse(NotificationModel):
    items: list[NotificationResponse]
    next_cursor: str | None


class UnreadCountResponse(NotificationModel):
    unread_count: int


class MarkAllReadResponse(NotificationModel):
    updated_count: int
