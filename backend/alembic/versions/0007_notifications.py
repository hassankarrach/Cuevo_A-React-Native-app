"""Add durable recipient-scoped in-app notifications.

Revision ID: 0007_notifications
Revises: 0006_song_catalog
Create Date: 2026-11-27

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0007_notifications"
down_revision = "0006_song_catalog"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recipient_account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_account_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("destination_type", sa.String(length=16), nullable=True),
        sa.Column("destination_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("producer_event_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "kind ~ '^[a-z][a-z0-9_]{0,63}$'",
            name="ck_notifications_kind",
        ),
        sa.CheckConstraint(
            "(destination_type IS NULL AND destination_id IS NULL) OR "
            "(destination_type IN ('profile', 'playlist', 'room') "
            "AND destination_id IS NOT NULL)",
            name="ck_notifications_destination",
        ),
        sa.ForeignKeyConstraint(
            ["recipient_account_id"],
            ["accounts.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["actor_account_id"],
            ["accounts.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "recipient_account_id",
            "producer_event_id",
            name="uq_notifications_recipient_producer_event",
        ),
    )
    op.create_index(
        "ix_notifications_recipient_read_created_id",
        "notifications",
        [
            "recipient_account_id",
            "read_at",
            "created_at",
            "id",
        ],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notifications_recipient_read_created_id",
        table_name="notifications",
    )
    op.drop_table("notifications")
