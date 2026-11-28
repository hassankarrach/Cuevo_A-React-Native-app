"""Add room lifecycle and access control.

Revision ID: 0009_rooms
Revises: 0008_playlists
Create Date: 2026-11-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0009_rooms"
down_revision = "0008_playlists"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("host_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "description",
            sa.String(length=1000),
            server_default=sa.text("''"),
            nullable=False,
        ),
        sa.Column(
            "visibility",
            sa.String(length=16),
            server_default=sa.text("'public'"),
            nullable=False,
        ),
        sa.Column(
            "vote_eligibility",
            sa.String(length=16),
            server_default=sa.text("'everyone'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column(
            "creation_operation_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("creation_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("seed_marker", sa.String(length=80), nullable=True),
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
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "length(name) BETWEEN 1 AND 100 AND name = btrim(name)",
            name="ck_rooms_name",
        ),
        sa.CheckConstraint(
            "length(description) <= 1000 AND description = btrim(description)",
            name="ck_rooms_description",
        ),
        sa.CheckConstraint(
            "visibility IN ('public', 'private')", name="ck_rooms_visibility"
        ),
        sa.CheckConstraint(
            "vote_eligibility IN ('everyone', 'invitees')",
            name="ck_rooms_vote_eligibility",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'ended')", name="ck_rooms_status"
        ),
        sa.CheckConstraint("revision >= 1", name="ck_rooms_revision"),
        sa.ForeignKeyConstraint(
            ["host_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "host_account_id",
            "creation_operation_id",
            name="uq_rooms_creation_operation",
        ),
        sa.UniqueConstraint("seed_marker", name="uq_rooms_seed_marker"),
    )
    op.create_index("ix_rooms_host_account_id", "rooms", ["host_account_id"])
    op.create_index("ix_rooms_discovery", "rooms", ["visibility", "status", "id"])

    op.create_table(
        "room_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('host', 'member')", name="ck_room_memberships_role"
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "room_id", "account_id", name="uq_room_memberships_account"
        ),
    )
    op.create_index(
        "ix_room_memberships_account_room",
        "room_memberships",
        ["account_id", "room_id"],
    )

    op.create_table(
        "room_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invitee_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inviter_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default=sa.text("'pending'"),
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
            "status IN ('pending', 'accepted', 'declined', 'revoked')",
            name="ck_room_invitations_status",
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["invitee_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["inviter_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_room_invitations_active",
        "room_invitations",
        ["room_id", "invitee_account_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'accepted')"),
    )
    op.create_index(
        "ix_room_invitations_inbox",
        "room_invitations",
        ["invitee_account_id", "status"],
    )

    op.create_table(
        "room_join_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "expires_at > created_at", name="ck_room_join_codes_expiry"
        ),
        sa.CheckConstraint(
            "revoked_at IS NULL OR revoked_at >= created_at",
            name="ck_room_join_codes_revoked_at",
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", name="uq_room_join_codes_room"),
        sa.UniqueConstraint("code_digest", name="uq_room_join_codes_digest"),
    )

    op.create_table(
        "room_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["actor_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("room_id", "revision", name="uq_room_events_revision"),
    )
    op.create_index(
        "ix_room_events_room_revision", "room_events", ["room_id", "revision"]
    )


def downgrade() -> None:
    op.drop_index("ix_room_events_room_revision", table_name="room_events")
    op.drop_table("room_events")
    op.drop_table("room_join_codes")
    op.drop_index("ix_room_invitations_inbox", table_name="room_invitations")
    op.drop_index("uq_room_invitations_active", table_name="room_invitations")
    op.drop_table("room_invitations")
    op.drop_index(
        "ix_room_memberships_account_room", table_name="room_memberships"
    )
    op.drop_table("room_memberships")
    op.drop_index("ix_rooms_discovery", table_name="rooms")
    op.drop_index("ix_rooms_host_account_id", table_name="rooms")
    op.drop_table("rooms")
