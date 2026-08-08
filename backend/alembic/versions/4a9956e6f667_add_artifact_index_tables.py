"""add artifact index tables

Revision ID: 4a9956e6f667
Revises: bb90a694c827
Create Date: 2026-08-07 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4a9956e6f667'
down_revision: str | Sequence[str] | None = 'bb90a694c827'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# FR1's 11 artifact types, English snake_case (see Story 1.1 Task 1). Named
# `artifact_type`, not the generic `type`, to avoid repeating the naming
# collision `deferred-work.md` already flagged for Story 0.2's `role` enum.
_ARTIFACT_TYPE_VALUES = (
    "brainstorming",
    "brief",
    "prd",
    "architecture",
    "ux",
    "tests",
    "specs",
    "epics",
    "stories",
    "decisions",
    "ceremonies",
)


def upgrade() -> None:
    """Upgrade schema.

    Adds `artifacts` (the catalog, AC1/AC3) and `artifact_links` (the plain
    edge/adjacency model AD-006 calls for, AC1's cross-references).
    """
    artifact_type_enum = sa.Enum(*_ARTIFACT_TYPE_VALUES, name="artifact_type")
    op.create_table(
        "artifacts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("artifact_type", artifact_type_enum, nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=True),
        sa.Column("frontmatter", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_artifacts_file_path"), "artifacts", ["file_path"], unique=True
    )

    op.create_table(
        "artifact_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_artifact_id", sa.Uuid(), nullable=False),
        sa.Column("source_field", sa.Text(), nullable=False),
        sa.Column("target_path", sa.Text(), nullable=False),
        # Nullable by design: null means the reference didn't resolve to an
        # indexed artifact. Story 1.2's AC wants broken cross-references
        # rendered as broken, not omitted.
        sa.Column("target_artifact_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["source_artifact_id"], ["artifacts.id"]),
        sa.ForeignKeyConstraint(["target_artifact_id"], ["artifacts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_artifact_links_source_artifact_id"),
        "artifact_links",
        ["source_artifact_id"],
    )


def downgrade() -> None:
    """Downgrade schema. Drops `artifact_links`/`artifacts` and the
    `artifact_type` enum.

    Every step checks existence first (via `inspect`, or `checkfirst=True`
    for the enum) so a partial/re-run downgrade — e.g. an earlier attempt
    that failed halfway through — no-ops on what's already gone instead of
    raising.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if "artifact_links" in inspector.get_table_names():
        existing_indexes = {ix["name"] for ix in inspector.get_indexes("artifact_links")}
        if op.f("ix_artifact_links_source_artifact_id") in existing_indexes:
            op.drop_index(
                op.f("ix_artifact_links_source_artifact_id"), table_name="artifact_links"
            )
        op.drop_table("artifact_links")

    if "artifacts" in inspector.get_table_names():
        existing_indexes = {ix["name"] for ix in inspector.get_indexes("artifacts")}
        if op.f("ix_artifacts_file_path") in existing_indexes:
            op.drop_index(op.f("ix_artifacts_file_path"), table_name="artifacts")
        op.drop_table("artifacts")

    sa.Enum(name="artifact_type").drop(bind, checkfirst=True)
