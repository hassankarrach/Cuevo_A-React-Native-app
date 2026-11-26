"""Add Google identities and allow accounts without a password.

Revision ID: 0003_google_identity
Revises: 0002_account_auth
Create Date: 2026-11-25

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0003_google_identity"
down_revision = "0002_account_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "accounts",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.create_table(
        "auth_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(provider) BETWEEN 1 AND 32",
            name="ck_auth_identities_provider_length",
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "subject",
            name="uq_auth_identities_provider_subject",
        ),
        sa.UniqueConstraint(
            "account_id",
            "provider",
            name="uq_auth_identities_account_provider",
        ),
    )
    op.create_index(
        "ix_auth_identities_account_id",
        "auth_identities",
        ["account_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    passwordless_accounts = bind.scalar(
        sa.text("SELECT count(*) FROM accounts WHERE password_hash IS NULL")
    )
    if passwordless_accounts:
        raise RuntimeError(
            "Cannot downgrade Google identity migration while passwordless accounts exist"
        )
    op.drop_index("ix_auth_identities_account_id", table_name="auth_identities")
    op.drop_table("auth_identities")
    op.alter_column(
        "accounts",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
