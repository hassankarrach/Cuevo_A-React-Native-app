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


class Playlist(Base):
    __tablename__ = "playlists"
    __table_args__ = (
        CheckConstraint(
            "length(name) BETWEEN 1 AND 100 AND name = btrim(name)",
            name="ck_playlists_name",
        ),
        CheckConstraint(
            "length(description) <= 1000 AND description = btrim(description)",
            name="ck_playlists_description",
        ),
        CheckConstraint(
            "visibility IN ('public', 'private')",
            name="ck_playlists_visibility",
        ),
        CheckConstraint(
            "edit_policy IN ('owner', 'collaborators', 'everyone')",
            name="ck_playlists_edit_policy",
        ),
        CheckConstraint("revision >= 1", name="ck_playlists_revision"),
        UniqueConstraint(
            "owner_account_id",
            "creation_operation_id",
            name="uq_playlists_creation_operation",
        ),
        Index("ix_playlists_discovery", "visibility", "updated_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    owner_account_id: Mapped[UUID] = mapped_column(
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
    edit_policy: Mapped[str] = mapped_column(
        String(24), nullable=False, default="everyone", server_default=text("'everyone'")
    )
    revision: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    creation_operation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), nullable=False
    )
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

    entries: Mapped[list["PlaylistEntry"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
        order_by="PlaylistEntry.position",
    )
    invitations: Mapped[list["PlaylistInvitation"]] = relationship(
        back_populates="playlist",
        cascade="all, delete-orphan",
    )


class PlaylistInvitation(Base):
    __tablename__ = "playlist_invitations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'accepted', 'declined', 'revoked')",
            name="ck_playlist_invitations_status",
        ),
        Index(
            "uq_playlist_invitations_active",
            "playlist_id",
            "invitee_account_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'accepted')"),
        ),
        Index("ix_playlist_invitations_inbox", "invitee_account_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    playlist_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    invitee_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    inviter_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
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

    playlist: Mapped[Playlist] = relationship(back_populates="invitations")


class PlaylistEntry(Base):
    __tablename__ = "playlist_entries"
    __table_args__ = (
        CheckConstraint("position >= 0", name="ck_playlist_entries_position"),
        UniqueConstraint(
            "playlist_id",
            "position",
            name="uq_playlist_entries_position",
            deferrable=True,
            initially="DEFERRED",
        ),
        UniqueConstraint(
            "playlist_id", "song_id", name="uq_playlist_entries_song"
        ),
        Index("ix_playlist_entries_playlist_order", "playlist_id", "position"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    playlist_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    song_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("songs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    added_by_account_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    playlist: Mapped[Playlist] = relationship(back_populates="entries")


class PlaylistOperation(Base):
    __tablename__ = "playlist_operations"
    __table_args__ = (
        UniqueConstraint(
            "playlist_id",
            "operation_id",
            name="uq_playlist_operations_operation",
        ),
        Index("ix_playlist_operations_created_at", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    playlist_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    operation_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    actor_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    result_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    result_resource_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PlaylistEvent(Base):
    __tablename__ = "playlist_events"
    __table_args__ = (
        UniqueConstraint(
            "playlist_id", "revision", name="uq_playlist_events_revision"
        ),
        Index("ix_playlist_events_playlist_revision", "playlist_id", "revision"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    playlist_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    operation_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(
        JSON, nullable=False, default=dict, server_default=text("'{}'")
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PlaylistEditLicense(Base):
    __tablename__ = "playlist_edit_licenses"
    __table_args__ = (
        CheckConstraint(
            "license_key = 'playlist_invited_edit'",
            name="ck_playlist_edit_licenses_key",
        ),
        Index(
            "ix_playlist_edit_licenses_account_expiry",
            "account_id",
            "expires_at",
        ),
        UniqueConstraint(
            "account_id",
            "license_key",
            name="uq_playlist_edit_licenses_account_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    license_key: Mapped[str] = mapped_column(
        String(40), nullable=False, default="playlist_invited_edit"
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class PlaylistDeletion(Base):
    __tablename__ = "playlist_deletions"
    __table_args__ = (
        UniqueConstraint(
            "playlist_id",
            "operation_id",
            name="uq_playlist_deletions_operation",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    playlist_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    owner_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    operation_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    result_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
