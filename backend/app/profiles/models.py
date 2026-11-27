from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    LargeBinary,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint(
            "length(display_name) BETWEEN 1 AND 40 AND display_name = btrim(display_name)",
            name="ck_profiles_display_name",
        ),
        CheckConstraint(
            "username ~ '^[a-z0-9_]{3,30}$'",
            name="ck_profiles_username_format",
        ),
        CheckConstraint(
            "bio IS NULL OR length(bio) <= 500",
            name="ck_profiles_bio_length",
        ),
        CheckConstraint(
            "location IS NULL OR length(location) <= 100",
            name="ck_profiles_location_length",
        ),
        CheckConstraint(
            "privacy IN ('public', 'friends', 'private')",
            name="ck_profiles_privacy",
        ),
        Index("uq_profiles_username", "username", unique=True),
    )

    account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    display_name: Mapped[str] = mapped_column(String(40), nullable=False)
    username: Mapped[str] = mapped_column(String(30), nullable=False)
    bio: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(String(100))
    preferred_genres: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    privacy: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="private",
        server_default=text("'private'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ProfileAvatar(Base):
    __tablename__ = "profile_avatars"
    __table_args__ = (
        CheckConstraint(
            "content_type IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_profile_avatars_content_type",
        ),
        CheckConstraint(
            "octet_length(image_data) BETWEEN 1 AND 2097152",
            name="ck_profile_avatars_image_size",
        ),
    )

    account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("profiles.account_id", ondelete="CASCADE"),
        primary_key=True,
    )
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    image_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        CheckConstraint(
            "account_low < account_high",
            name="ck_friendships_account_order",
        ),
        CheckConstraint(
            "requester_account_id = account_low OR requester_account_id = account_high",
            name="ck_friendships_requester_in_pair",
        ),
        CheckConstraint(
            "status IN ('pending', 'friends')",
            name="ck_friendships_status",
        ),
        CheckConstraint(
            "(status = 'pending' AND accepted_at IS NULL) OR "
            "(status = 'friends' AND accepted_at IS NOT NULL)",
            name="ck_friendships_accepted_at",
        ),
        Index("uq_friendships_account_pair", "account_low", "account_high", unique=True),
        Index("ix_friendships_account_low_status", "account_low", "status"),
        Index("ix_friendships_account_high_status", "account_high", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    account_low: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_high: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    requester_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
