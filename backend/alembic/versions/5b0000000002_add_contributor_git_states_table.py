"""add contributor_git_states table

Revision ID: 5b0000000002
Revises: 5b0000000001
Create Date: 2026-08-08 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5b0000000002'
down_revision: str | Sequence[str] | None = '5b0000000001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema.

    Adds `contributor_git_states` table for canonical Git state reporting (Story 2.5).
    """
    op.create_table(
        "contributor_git_states",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("technical_identifier", sa.String(512), nullable=False),
        sa.Column("branch", sa.String(255), nullable=True),
        sa.Column("ahead", sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column("behind", sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column("in_progress_action", sa.String(50), nullable=True, server_default=sa.text("'none'")),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contributor_git_states_user_id"), "contributor_git_states", ["user_id"], unique=True
    )
    op.create_index(
        op.f("ix_contributor_git_states_technical_identifier"), "contributor_git_states", ["technical_identifier"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema. Drops `contributor_git_states` table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "contributor_git_states" in inspector.get_table_names():
        op.drop_index(op.f("ix_contributor_git_states_technical_identifier"), table_name="contributor_git_states")
        op.drop_index(op.f("ix_contributor_git_states_user_id"), table_name="contributor_git_states")
        op.drop_table("contributor_git_states")
