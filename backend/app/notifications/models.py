from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "kind ~ '^[a-z][a-z0-9_]{0,63}$'",
            name="ck_notifications_kind",
        ),
        CheckConstraint(
            "(destination_type IS NULL AND destination_id IS NULL) OR "
            "(destination_type IN ('profile', 'playlist', 'room') "
            "AND destination_id IS NOT NULL)",
            name="ck_notifications_destination",
        ),
        UniqueConstraint(
            "recipient_account_id",
            "producer_event_id",
            name="uq_notifications_recipient_producer_event",
        ),
        Index(
            "ix_notifications_recipient_read_created_id",
            "recipient_account_id",
            "read_at",
            "created_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    recipient_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_account_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
    )
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    destination_type: Mapped[str | None] = mapped_column(String(16))
    destination_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    producer_event_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
