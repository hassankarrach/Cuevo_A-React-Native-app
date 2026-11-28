from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint(
            "length(name) BETWEEN 1 AND 100 AND name = btrim(name)",
            name="ck_rooms_name",
        ),
        CheckConstraint(
            "length(description) <= 1000 AND description = btrim(description)",
            name="ck_rooms_description",
        ),
        CheckConstraint(
            "visibility IN ('public', 'private')",
            name="ck_rooms_visibility",
        ),
        CheckConstraint(
            "vote_eligibility IN ('everyone', 'invitees')",
            name="ck_rooms_vote_eligibility",
        ),
        CheckConstraint("status IN ('active', 'ended')", name="ck_rooms_status"),
        CheckConstraint("revision >= 1", name="ck_rooms_revision"),
        UniqueConstraint(
            "host_account_id",
            "creation_operation_id",
            name="uq_rooms_creation_operation",
        ),
        Index("ix_rooms_discovery", "visibility", "status", "id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    host_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(
        String(1000), nullable=False, default="", server_default=text("''")
    )
    visibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="public", server_default=text("'public'")
    )
    vote_eligibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="everyone", server_default=text("'everyone'")
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active", server_default=text("'active'")
    )
    revision: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    creation_operation_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    creation_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    seed_marker: Mapped[str | None] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    memberships: Mapped[list["RoomMembership"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )
    invitations: Mapped[list["RoomInvitation"]] = relationship(
        back_populates="room", cascade="all, delete-orphan"
    )


class RoomMembership(Base):
    __tablename__ = "room_memberships"
    __table_args__ = (
        CheckConstraint("role IN ('host', 'member')", name="ck_room_memberships_role"),
        UniqueConstraint("room_id", "account_id", name="uq_room_memberships_account"),
        Index("ix_room_memberships_account_room", "account_id", "room_id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    room_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    room: Mapped[Room] = relationship(back_populates="memberships")


class RoomInvitation(Base):
    __tablename__ = "room_invitations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'accepted', 'declined', 'revoked')",
            name="ck_room_invitations_status",
        ),
        Index(
            "uq_room_invitations_active",
            "room_id",
            "invitee_account_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'accepted')"),
        ),
        Index("ix_room_invitations_inbox", "invitee_account_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    room_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    invitee_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    inviter_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="pending", server_default=text("'pending'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    room: Mapped[Room] = relationship(back_populates="invitations")


class RoomJoinCode(Base):
    __tablename__ = "room_join_codes"
    __table_args__ = (
        CheckConstraint("expires_at > created_at", name="ck_room_join_codes_expiry"),
        CheckConstraint(
            "revoked_at IS NULL OR revoked_at >= created_at",
            name="ck_room_join_codes_revoked_at",
        ),
        UniqueConstraint("room_id", name="uq_room_join_codes_room"),
        UniqueConstraint("code_digest", name="uq_room_join_codes_digest"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    room_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    code_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RoomEvent(Base):
    __tablename__ = "room_events"
    __table_args__ = (
        UniqueConstraint("room_id", "revision", name="uq_room_events_revision"),
        Index("ix_room_events_room_revision", "room_id", "revision"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    room_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_account_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL")
    )
    operation_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
