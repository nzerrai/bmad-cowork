"""add spaces table

Revision ID: 5b0000000001
Revises: 4a9956e6f667
Create Date: 2026-08-08 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5b0000000001'
down_revision: str | Sequence[str] | None = '4a9956e6f667'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema.

    Adds `spaces` table for zero-setup onboarding and application identity.
    """
    # Create HubStatus enum
    hub_status_enum = sa.Enum('pending', 'active', 'access_revoked', name='hubstatus')
    hub_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "spaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("technical_identifier", sa.String(512), nullable=False),
        sa.Column("short_name", sa.String(255), nullable=False),
        sa.Column("status", sa.Enum('pending', 'active', 'access_revoked', name='hubstatus'), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_spaces_technical_identifier"), "spaces", ["technical_identifier"], unique=False
    )
    op.create_unique_constraint(
        "uq_technical_identifier", "spaces", ["technical_identifier"]
    )


def downgrade() -> None:
    """Downgrade schema. Drops `spaces` table and the `hubstatus` enum."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "spaces" in inspector.get_table_names():
        op.drop_constraint("uq_technical_identifier", "spaces", type_="unique")
        op.drop_index(op.f("ix_spaces_technical_identifier"), table_name="spaces")
        op.drop_table("spaces")

    sa.Enum(name='hubstatus').drop(bind, checkfirst=True)
