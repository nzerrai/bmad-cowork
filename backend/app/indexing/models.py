"""`Artifact` and `ArtifactLink` ORM models (Story 1.1 Task 1).

Per AD-006 (`ARCHITECTURE-SPINE.md`, MVP Data Layer): relational tables +
JSONB, and a plain FK-based edge/adjacency model for cross-references — not
a graph DB, not `pgvector`, not anything AI-Copilot-adjacent.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.indexing.types import ArtifactType


class Artifact(Base):
    """One catalogued BMAD artifact: its type, location, and parsed metadata."""

    __tablename__ = "artifacts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    artifact_type: Mapped[ArtifactType] = mapped_column(
        Enum(
            ArtifactType,
            name="artifact_type",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    # Relative to the configured ARTIFACT_ROOT, not an absolute path — keeps
    # the index portable across machines/checkouts.
    file_path: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    frontmatter: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Change-detection key for AC2's idempotent re-scan.
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    # Non-null means AC3's malformed state; the row still exists, still
    # gets indexed_at refreshed, and never blocks the rest of the scan.
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    indexed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ArtifactLink(Base):
    """One cross-reference edge from a frontmatter field to another artifact.

    `target_artifact_id` is deliberately nullable: null means the reference
    didn't resolve to an indexed artifact. That's real data (a broken
    cross-reference, per Story 1.2's AC), not an error state.
    """

    __tablename__ = "artifact_links"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_artifact_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("artifacts.id"), nullable=False, index=True
    )
    # Which frontmatter key produced this edge (e.g. `inputDocuments`).
    source_field: Mapped[str] = mapped_column(Text, nullable=False)
    # The raw referenced path exactly as written in frontmatter, before
    # resolution against ARTIFACT_ROOT.
    target_path: Mapped[str] = mapped_column(Text, nullable=False)
    target_artifact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("artifacts.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
