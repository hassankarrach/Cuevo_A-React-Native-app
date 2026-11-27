"""Add collaborative playlist editing.

Revision ID: 0008_playlists
Revises: 0007_notifications
Create Date: 2026-11-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0008_playlists"
down_revision = "0007_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "playlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "owner_account_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
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
            "edit_policy",
            sa.String(length=24),
            server_default=sa.text("'everyone'"),
            nullable=False,
        ),
        sa.Column(
            "revision",
            sa.Integer(),
            server_default=sa.text("1"),
            nullable=False,
        ),
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
        sa.CheckConstraint(
            "length(name) BETWEEN 1 AND 100 AND name = btrim(name)",
            name="ck_playlists_name",
        ),
        sa.CheckConstraint(
            "length(description) <= 1000 AND description = btrim(description)",
            name="ck_playlists_description",
        ),
        sa.CheckConstraint(
            "visibility IN ('public', 'private')",
            name="ck_playlists_visibility",
        ),
        sa.CheckConstraint(
            "edit_policy IN ('owner', 'collaborators', 'everyone')",
            name="ck_playlists_edit_policy",
        ),
        sa.CheckConstraint("revision >= 1", name="ck_playlists_revision"),
        sa.ForeignKeyConstraint(
            ["owner_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "owner_account_id",
            "creation_operation_id",
            name="uq_playlists_creation_operation",
        ),
        sa.UniqueConstraint("seed_marker", name="uq_playlists_seed_marker"),
    )
    op.create_index(
        "ix_playlists_owner_account_id",
        "playlists",
        ["owner_account_id"],
    )
    op.create_index(
        "ix_playlists_discovery",
        "playlists",
        ["visibility", "updated_at", "id"],
    )

    op.create_table(
        "playlist_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
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
            name="ck_playlist_invitations_status",
        ),
        sa.ForeignKeyConstraint(
            ["invitee_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["inviter_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["playlist_id"], ["playlists.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_playlist_invitations_active",
        "playlist_invitations",
        ["playlist_id", "invitee_account_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('pending', 'accepted')"),
    )
    op.create_index(
        "ix_playlist_invitations_inbox",
        "playlist_invitations",
        ["invitee_account_id", "status"],
    )

    op.create_table(
        "playlist_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("song_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "added_by_account_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "position >= 0",
            name="ck_playlist_entries_position",
        ),
        sa.ForeignKeyConstraint(
            ["added_by_account_id"], ["accounts.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["playlist_id"], ["playlists.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "playlist_id",
            "position",
            deferrable=True,
            initially="DEFERRED",
            name="uq_playlist_entries_position",
        ),
        sa.UniqueConstraint(
            "playlist_id", "song_id", name="uq_playlist_entries_song"
        ),
    )
    op.create_index(
        "ix_playlist_entries_playlist_order",
        "playlist_entries",
        ["playlist_id", "position"],
    )

    op.create_table(
        "playlist_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("result_revision", sa.Integer(), nullable=False),
        sa.Column("result_resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["playlist_id"], ["playlists.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "playlist_id",
            "operation_id",
            name="uq_playlist_operations_operation",
        ),
    )
    op.create_index(
        "ix_playlist_operations_created_at",
        "playlist_operations",
        ["created_at"],
    )

    op.create_table(
        "playlist_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSON(astext_type=sa.Text()),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["playlist_id"], ["playlists.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "playlist_id", "revision", name="uq_playlist_events_revision"
        ),
    )
    op.create_index(
        "ix_playlist_events_playlist_revision",
        "playlist_events",
        ["playlist_id", "revision"],
    )

    op.create_table(
        "playlist_edit_licenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "license_key",
            sa.String(length=40),
            server_default=sa.text("'playlist_invited_edit'"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "license_key = 'playlist_invited_edit'",
            name="ck_playlist_edit_licenses_key",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "account_id",
            "license_key",
            name="uq_playlist_edit_licenses_account_key",
        ),
    )
    op.create_index(
        "ix_playlist_edit_licenses_account_expiry",
        "playlist_edit_licenses",
        ["account_id", "expires_at"],
    )

    op.create_table(
        "playlist_deletions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("playlist_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("result_revision", sa.Integer(), nullable=False),
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_account_id"], ["accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "playlist_id",
            "operation_id",
            name="uq_playlist_deletions_operation",
        ),
    )


def downgrade() -> None:
    op.drop_table("playlist_deletions")
    op.drop_index(
        "ix_playlist_edit_licenses_account_expiry",
        table_name="playlist_edit_licenses",
    )
    op.drop_table("playlist_edit_licenses")
    op.drop_index(
        "ix_playlist_events_playlist_revision",
        table_name="playlist_events",
    )
    op.drop_table("playlist_events")
    op.drop_index(
        "ix_playlist_operations_created_at",
        table_name="playlist_operations",
    )
    op.drop_table("playlist_operations")
    op.drop_index(
        "ix_playlist_entries_playlist_order",
        table_name="playlist_entries",
    )
    op.drop_table("playlist_entries")
    op.drop_index(
        "ix_playlist_invitations_inbox",
        table_name="playlist_invitations",
    )
    op.drop_index(
        "uq_playlist_invitations_active",
        table_name="playlist_invitations",
    )
    op.drop_table("playlist_invitations")
    op.drop_index("ix_playlists_discovery", table_name="playlists")
    op.drop_index("ix_playlists_owner_account_id", table_name="playlists")
    op.drop_table("playlists")
