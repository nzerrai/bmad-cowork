"""add users table

Revision ID: bb90a694c827
Revises: e09179c9e677
Create Date: 2026-08-07 09:21:26.510116

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'bb90a694c827'
down_revision: str | Sequence[str] | None = 'e09179c9e677'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ROLE_VALUES = (
    "developer",
    "product_manager",
    "architect_tech_lead",
    "ux_designer",
    "admin",
)


def upgrade() -> None:
    """Upgrade schema.

    Adds exactly one new table (`users`) beyond `alembic_version`: id, unique
    email, hashed_password, a native `role` enum (the five fixed platform
    roles), created_at.
    """
    role_enum = sa.Enum(*_ROLE_VALUES, name="role")
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    """Downgrade schema. Drops `users` and its `role` enum type.

    `checkfirst=True`: a partial/re-run downgrade where the enum is already
    gone must no-op here, not raise.
    """
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    sa.Enum(name="role").drop(op.get_bind(), checkfirst=True)
