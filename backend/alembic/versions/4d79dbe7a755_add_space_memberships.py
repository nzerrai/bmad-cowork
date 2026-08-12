"""add_space_memberships

Revision ID: 4d79dbe7a755
Revises: 0a2ae1447e3a
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d79dbe7a755'
down_revision: Union[str, Sequence[str], None] = '0a2ae1447e3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Adds `space_memberships`, the user<->repo membership table (spec:
    dashboard-user-scoped-repos-list). One row per (user_id, space_id) pair,
    established automatically in `_process_client_identity` -- never via a
    manual admin action in this revision's scope. Real UUID FKs to
    `users.id`/`spaces.id` (unlike `contributor_git_states.user_id`, which
    stores a stringified UUID for reasons specific to that table only).
    """
    op.create_table(
        "space_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "space_id", name="uq_space_membership_user_space"),
    )
    op.create_index(
        op.f("ix_space_memberships_user_id"), "space_memberships", ["user_id"], unique=False
    )
    op.create_index(
        op.f("ix_space_memberships_space_id"), "space_memberships", ["space_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema. Drops `space_memberships` table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "space_memberships" in inspector.get_table_names():
        op.drop_index(op.f("ix_space_memberships_space_id"), table_name="space_memberships")
        op.drop_index(op.f("ix_space_memberships_user_id"), table_name="space_memberships")
        op.drop_table("space_memberships")
