import base64
import binascii
from datetime import UTC, datetime
import re
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from app.api.errors import APIError
from app.auth.dependencies import Principal, current_principal
from app.db.session import get_db
from app.notifications.models import Notification
from app.notifications.schemas import (
    MarkAllReadResponse,
    NotificationActor,
    NotificationDestination,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.profiles.models import Profile


router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
_CURSOR_VERSION = "v1"
_CURSOR_ID_PATTERN = re.compile(r"^[0-9a-f-]{36}$")


def _not_found() -> APIError:
    return APIError(404, "NOT_FOUND", "The requested resource was not found.")


def _cursor_encode(created_at: datetime, notification_id: UUID, status: str) -> str:
    timestamp = created_at.astimezone(UTC).isoformat(timespec="microseconds")
    payload = f"{_CURSOR_VERSION}\n{status}\n{timestamp}\n{notification_id}".encode(
        "ascii"
    )
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _cursor_decode(
    cursor: str,
    status: str,
) -> tuple[datetime, UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = base64.b64decode(
            padded.encode("ascii"),
            altchars=b"-_",
            validate=True,
        ).decode("ascii")
        version, cursor_status, timestamp, notification_id = payload.split("\n")
        if (
            version != _CURSOR_VERSION
            or cursor_status != status
            or not _CURSOR_ID_PATTERN.fullmatch(notification_id)
        ):
            raise ValueError
        created_at = datetime.fromisoformat(timestamp)
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError
        return created_at.astimezone(UTC), UUID(notification_id)
    except (ValueError, UnicodeDecodeError, UnicodeEncodeError, binascii.Error) as exc:
        raise APIError(
            422,
            "INVALID_CURSOR",
            "The pagination cursor is invalid for this notification list.",
        ) from exc


def _notification_response(db: Session, notification: Notification) -> NotificationResponse:
    actor = None
    if notification.actor_account_id is not None:
        profile = db.get(Profile, notification.actor_account_id)
        if profile is not None:
            actor = NotificationActor(
                account_id=profile.account_id,
                display_name=profile.display_name,
                username=profile.username,
            )

    destination = None
    if notification.destination_type is not None and notification.destination_id is not None:
        if (
            notification.destination_type != "profile"
            or db.get(Profile, notification.destination_id) is not None
        ):
            destination = NotificationDestination(
                type=notification.destination_type,
                id=notification.destination_id,
            )
    return NotificationResponse(
        id=notification.id,
        kind=notification.kind,
        actor=actor,
        destination=destination,
        created_at=notification.created_at,
        read_at=notification.read_at,
    )


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    status_filter: Annotated[
        Literal["all", "unread", "read"],
        Query(alias="status"),
    ] = "all",
    limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    cursor: Annotated[str | None, Query(max_length=256)] = None,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    statement = select(Notification).where(
        Notification.recipient_account_id == principal.account.id
    )
    if status_filter == "unread":
        statement = statement.where(Notification.read_at.is_(None))
    elif status_filter == "read":
        statement = statement.where(Notification.read_at.is_not(None))
    if cursor is not None:
        cursor_created_at, cursor_id = _cursor_decode(cursor, status_filter)
        statement = statement.where(
            or_(
                Notification.created_at < cursor_created_at,
                and_(
                    Notification.created_at == cursor_created_at,
                    Notification.id < cursor_id,
                ),
            )
        )

    notifications = list(
        db.scalars(
            statement.order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit + 1)
        ).all()
    )
    has_more = len(notifications) > limit
    page = notifications[:limit]
    next_cursor = (
        _cursor_encode(page[-1].created_at, page[-1].id, status_filter)
        if has_more
        else None
    )
    return NotificationListResponse(
        items=[_notification_response(db, notification) for notification in page],
        next_cursor=next_cursor,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> UnreadCountResponse:
    count = db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.recipient_account_id == principal.account.id,
            Notification.read_at.is_(None),
        )
    )
    return UnreadCountResponse(unread_count=count or 0)


@router.get("/{notification_id}", response_model=NotificationResponse)
def get_notification(
    notification_id: UUID = Path(),
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_account_id == principal.account.id,
        )
    )
    if notification is None:
        raise _not_found()
    return _notification_response(db, notification)


@router.patch("/read", response_model=MarkAllReadResponse)
def mark_all_notifications_read(
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> MarkAllReadResponse:
    notification_ids = db.scalars(
        update(Notification)
        .where(
            Notification.recipient_account_id == principal.account.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=func.now())
        .returning(Notification.id)
    ).all()
    return MarkAllReadResponse(updated_count=len(notification_ids))


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    notification = db.scalar(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.recipient_account_id == principal.account.id,
        )
        .with_for_update()
    )
    if notification is None:
        raise _not_found()
    if notification.read_at is None:
        notification.read_at = func.now()
        db.flush()
        db.refresh(notification)
    return _notification_response(db, notification)
