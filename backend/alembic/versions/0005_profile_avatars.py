"""Add durable PostgreSQL-backed profile avatars.

Revision ID: 0005_profile_avatars
Revises: 0004_profiles_friendships
Create Date: 2026-11-26

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0005_profile_avatars"
down_revision = "0004_profiles_friendships"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profile_avatars",
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content_type", sa.String(length=32), nullable=False),
        sa.Column("image_data", sa.LargeBinary(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "content_type IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_profile_avatars_content_type",
        ),
        sa.CheckConstraint(
            "octet_length(image_data) BETWEEN 1 AND 2097152",
            name="ck_profile_avatars_image_size",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["profiles.account_id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("account_id"),
    )


def downgrade() -> None:
    op.drop_table("profile_avatars")
