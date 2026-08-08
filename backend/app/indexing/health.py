"""Artifact health computation (Story 1.2 Task 1).

Read-only display computation, run at request time — never cached, never
written back to the DB, and never re-triggers Story 1.1's `run_index`. Two
parts: a per-type completeness rollup (all 11 `ArtifactType` members, so a
type with zero indexed rows still appears as `missing`) and a per-artifact
sync status (does the indexed row still match the file on disk right now).
"""

import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.indexing.models import Artifact, ArtifactLink
from app.indexing.scanner import hash_content
from app.indexing.types import ArtifactType


@dataclass
class ArtifactTypeHealth:
    artifact_type: ArtifactType
    completeness: str
    count: int
    error_count: int


@dataclass
class ArtifactLinkInfo:
    source_field: str
    target_path: str
    target_artifact_id: uuid.UUID | None
    resolved: bool


@dataclass
class ArtifactHealth:
    id: uuid.UUID
    artifact_type: ArtifactType
    title: str | None
    file_path: str
    status: str | None
    error: str | None
    sync_status: str
    indexed_at: datetime
    links_out: list[ArtifactLinkInfo]


@dataclass
class ArtifactHealthReport:
    types: list[ArtifactTypeHealth]
    artifacts: list[ArtifactHealth]


def type_completeness_rollup(artifacts: list[Artifact]) -> dict[ArtifactType, ArtifactTypeHealth]:
    """Per-type `missing`/`incomplete`/`complete` rollup over `artifacts`.

    Covers all `ArtifactType` members, so a type with zero rows in `artifacts`
    still appears as `missing`. Shared by `compute_health` and
    `compute_traceability` (Story 1.3) so both read the same "is this type
    present and error-free" signal instead of two subtly-different copies.
    """
    by_type: dict[ArtifactType, list[Artifact]] = {t: [] for t in ArtifactType}
    for artifact in artifacts:
        by_type[artifact.artifact_type].append(artifact)

    rollup: dict[ArtifactType, ArtifactTypeHealth] = {}
    for artifact_type in ArtifactType:
        rows = by_type[artifact_type]
        error_count = sum(1 for row in rows if row.error is not None)
        if not rows:
            completeness = "missing"
        elif error_count > 0:
            completeness = "incomplete"
        else:
            completeness = "complete"
        rollup[artifact_type] = ArtifactTypeHealth(
            artifact_type=artifact_type,
            completeness=completeness,
            count=len(rows),
            error_count=error_count,
        )
    return rollup


def _sync_status(root: Path, artifact: Artifact) -> str:
    path = root / artifact.file_path
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        # Covers both "never existed" and a TOCTOU race (removed between the
        # exists check and the read) — either way, the file isn't there now.
        return "deleted"
    except OSError:
        # Exists but couldn't be read for some other reason (permissions,
        # became a directory, etc.) — real state, but not "deleted"; don't
        # collapse it into the same signal.
        return "error"
    return "synced" if hash_content(raw) == artifact.content_hash else "stale"


def compute_health(db: Session, root: Path) -> ArtifactHealthReport:
    """Compute the full health report for every indexed artifact under `root`."""
    root = root.resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"ARTIFACT_ROOT does not exist or is not a directory: {root}")
    artifacts = db.query(Artifact).order_by(Artifact.file_path).all()

    rollup = type_completeness_rollup(artifacts)
    types = [rollup[artifact_type] for artifact_type in ArtifactType]

    links_by_source: dict[uuid.UUID, list[ArtifactLink]] = {}
    for link in db.query(ArtifactLink).order_by(ArtifactLink.source_field).all():
        links_by_source.setdefault(link.source_artifact_id, []).append(link)

    artifacts_health: list[ArtifactHealth] = []
    for artifact in artifacts:
        links_out = [
            ArtifactLinkInfo(
                source_field=link.source_field,
                target_path=link.target_path,
                target_artifact_id=link.target_artifact_id,
                resolved=link.target_artifact_id is not None,
            )
            for link in links_by_source.get(artifact.id, [])
        ]
        artifacts_health.append(
            ArtifactHealth(
                id=artifact.id,
                artifact_type=artifact.artifact_type,
                title=artifact.title,
                file_path=artifact.file_path,
                status=artifact.status,
                error=artifact.error,
                sync_status=_sync_status(root, artifact),
                indexed_at=artifact.indexed_at,
                links_out=links_out,
            )
        )

    return ArtifactHealthReport(types=types, artifacts=artifacts_health)
