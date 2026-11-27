"""Add user profiles and friendship requests.

Revision ID: 0004_profiles_friendships
Revises: 0003_google_identity
Create Date: 2026-11-26

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0004_profiles_friendships"
down_revision = "0003_google_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("display_name", sa.String(length=40), nullable=False),
        sa.Column("username", sa.String(length=30), nullable=False),
        sa.Column("bio", sa.String(length=500), nullable=True),
        sa.Column("location", sa.String(length=100), nullable=True),
        sa.Column(
            "preferred_genres",
            postgresql.JSON(astext_type=sa.Text()),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column(
            "privacy",
            sa.String(length=16),
            server_default=sa.text("'private'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(display_name) BETWEEN 1 AND 40 AND display_name = btrim(display_name)",
            name="ck_profiles_display_name",
        ),
        sa.CheckConstraint(
            "username ~ '^[a-z0-9_]{3,30}$'",
            name="ck_profiles_username_format",
        ),
        sa.CheckConstraint(
            "bio IS NULL OR length(bio) <= 500",
            name="ck_profiles_bio_length",
        ),
        sa.CheckConstraint(
            "location IS NULL OR length(location) <= 100",
            name="ck_profiles_location_length",
        ),
        sa.CheckConstraint(
            "privacy IN ('public', 'friends', 'private')",
            name="ck_profiles_privacy",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("account_id"),
    )
    op.create_index("uq_profiles_username", "profiles", ["username"], unique=True)

    op.create_table(
        "friendships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_low", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_high", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requester_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "account_low < account_high",
            name="ck_friendships_account_order",
        ),
        sa.CheckConstraint(
            "requester_account_id = account_low OR requester_account_id = account_high",
            name="ck_friendships_requester_in_pair",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'friends')",
            name="ck_friendships_status",
        ),
        sa.CheckConstraint(
            "(status = 'pending' AND accepted_at IS NULL) OR "
            "(status = 'friends' AND accepted_at IS NOT NULL)",
            name="ck_friendships_accepted_at",
        ),
        sa.ForeignKeyConstraint(
            ["account_low"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["account_high"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["requester_account_id"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_friendships_account_pair",
        "friendships",
        ["account_low", "account_high"],
        unique=True,
    )
    op.create_index(
        "ix_friendships_account_low_status",
        "friendships",
        ["account_low", "status"],
    )
    op.create_index(
        "ix_friendships_account_high_status",
        "friendships",
        ["account_high", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_friendships_account_high_status", table_name="friendships")
    op.drop_index("ix_friendships_account_low_status", table_name="friendships")
    op.drop_index("uq_friendships_account_pair", table_name="friendships")
    op.drop_table("friendships")
    op.drop_index("uq_profiles_username", table_name="profiles")
    op.drop_table("profiles")
