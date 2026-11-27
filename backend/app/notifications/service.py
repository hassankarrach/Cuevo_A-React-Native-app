from dataclasses import dataclass
import re
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.notifications.models import Notification


_KIND_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


@dataclass(frozen=True)
class DestinationReference:
    type: str
    id: UUID


class NotificationIdempotencyConflict(Exception):
    """A producer reused an event key for different notification data."""


def create_notification(
    db: Session,
    *,
    recipient_account_id: UUID,
    producer_event_id: UUID,
    kind: str,
    actor_account_id: UUID | None = None,
    destination: DestinationReference | None = None,
) -> Notification:
    if not _KIND_PATTERN.fullmatch(kind):
        raise ValueError("Notification kind must be a lowercase identifier")
    if destination is not None and destination.type not in {
        "profile",
        "playlist",
        "room",
    }:
        raise ValueError("Notification destination type is not supported")

    values = {
        "id": uuid4(),
        "recipient_account_id": recipient_account_id,
        "actor_account_id": actor_account_id,
        "kind": kind,
        "destination_type": destination.type if destination is not None else None,
        "destination_id": destination.id if destination is not None else None,
        "producer_event_id": producer_event_id,
    }
    inserted_id = db.scalar(
        insert(Notification)
        .values(**values)
        .on_conflict_do_nothing(
            index_elements=[
                Notification.recipient_account_id,
                Notification.producer_event_id,
            ]
        )
        .returning(Notification.id)
    )
    if inserted_id is not None:
        created = db.get(Notification, inserted_id)
        if created is None:
            raise RuntimeError("Inserted notification could not be reloaded")
        return created

    existing = db.scalar(
        select(Notification).where(
            Notification.recipient_account_id == recipient_account_id,
            Notification.producer_event_id == producer_event_id,
        )
    )
    if existing is None:
        raise RuntimeError("Notification insert conflicted without a matching event")
    expected_destination_type = destination.type if destination is not None else None
    expected_destination_id = destination.id if destination is not None else None
    if (
        existing.kind != kind
        or existing.actor_account_id != actor_account_id
        or existing.destination_type != expected_destination_type
        or existing.destination_id != expected_destination_id
    ):
        raise NotificationIdempotencyConflict(
            "Producer event key was already used for different notification data"
        )
    return existing
