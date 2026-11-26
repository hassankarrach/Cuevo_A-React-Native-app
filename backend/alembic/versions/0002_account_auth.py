"""Add email/password accounts, challenges, sessions, and rate limits.

Revision ID: 0002_account_auth
Revises: 0001_initial
Create Date: 2026-11-25

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0002_account_auth"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "profile_completed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(email) BETWEEN 3 AND 254 AND email = lower(email)",
            name="ck_accounts_email_canonical",
        ),
        sa.CheckConstraint(
            "email_verified_at IS NULL OR email_verified_at >= created_at",
            name="ck_accounts_verified_at",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_accounts_email"),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_token_digest", sa.String(length=64), nullable=False),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("absolute_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "access_expires_at > created_at",
            name="ck_auth_sessions_access_expiry",
        ),
        sa.CheckConstraint(
            "absolute_expires_at > created_at",
            name="ck_auth_sessions_absolute_expiry",
        ),
        sa.CheckConstraint(
            "revoked_at IS NULL OR revoked_at >= created_at",
            name="ck_auth_sessions_revoked_at",
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "access_token_digest",
            name="uq_auth_sessions_access_digest",
        ),
    )
    op.create_index("ix_auth_sessions_account_id", "auth_sessions", ["account_id"])
    op.create_table(
        "auth_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("code_digest", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resend_available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "attempt_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "purpose IN ('email_verification', 'password_reset')",
            name="ck_auth_challenges_purpose",
        ),
        sa.CheckConstraint(
            "attempt_count >= 0 AND attempt_count <= 5",
            name="ck_auth_challenges_attempt_count",
        ),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_challenges_expiry"),
        sa.CheckConstraint(
            "consumed_at IS NULL OR consumed_at >= created_at",
            name="ck_auth_challenges_consumed_at",
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_challenges_account_id", "auth_challenges", ["account_id"])
    op.create_index(
        "uq_auth_challenges_active_account_purpose",
        "auth_challenges",
        ["account_id", "purpose"],
        unique=True,
        postgresql_where=sa.text("consumed_at IS NULL"),
    )
    op.create_table(
        "auth_refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_digest", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("expires_at > created_at", name="ck_auth_refresh_expiry"),
        sa.CheckConstraint(
            "consumed_at IS NULL OR consumed_at >= created_at",
            name="ck_auth_refresh_consumed_at",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["auth_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "token_digest",
            name="uq_auth_refresh_tokens_digest",
        ),
    )
    op.create_index(
        "ix_auth_refresh_tokens_session_id",
        "auth_refresh_tokens",
        ["session_id"],
    )
    op.create_table(
        "auth_rate_limit_buckets",
        sa.Column("bucket_key", sa.String(length=64), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False),
        sa.CheckConstraint("request_count > 0", name="ck_auth_rate_limit_count"),
        sa.PrimaryKeyConstraint("bucket_key"),
    )
    op.create_index(
        "ix_auth_rate_limit_buckets_window_start",
        "auth_rate_limit_buckets",
        ["window_start"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_rate_limit_buckets_window_start",
        table_name="auth_rate_limit_buckets",
    )
    op.drop_table("auth_rate_limit_buckets")
    op.drop_index(
        "ix_auth_refresh_tokens_session_id",
        table_name="auth_refresh_tokens",
    )
    op.drop_table("auth_refresh_tokens")
    op.drop_index(
        "uq_auth_challenges_active_account_purpose",
        table_name="auth_challenges",
    )
    op.drop_index("ix_auth_challenges_account_id", table_name="auth_challenges")
    op.drop_table("auth_challenges")
    op.drop_index("ix_auth_sessions_account_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_table("accounts")
