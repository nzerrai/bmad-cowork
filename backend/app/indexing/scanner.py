"""`run_index`: the idempotent artifact-catalog scan (Story 1.1 AC1–AC3).

A full on-demand re-scan, not a background filesystem watcher —
file-watching/push-based reporting is Epic 2's Client-side territory
(AD-008); nothing in this story's AC requires it.
"""

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

from sqlalchemy.orm import Session

from app.indexing.models import Artifact, ArtifactLink
from app.indexing.parser import (
    derive_frontmatter_title,
    derive_story_status,
    derive_story_title,
    extract_cross_references,
    extract_frontmatter,
)
from app.indexing.types import ArtifactType, classify


@dataclass
class IndexResult:
    """Summary counts for one `run_index` call."""

    scanned: int = 0
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    errors: int = 0


def hash_content(content: bytes) -> str:
    """SHA256 hex digest used as `Artifact.content_hash`'s change-detection key.

    Public so Story 1.2's sync-status check can reuse the exact same routine
    rather than duplicating hashing logic (and drift risk) in a second place.
    """
    return hashlib.sha256(content).hexdigest()


def _iter_candidate_files(root: Path):
    for path in sorted(root.rglob("*.md")):
        if path.is_file():
            yield path


def _derive_title(
    artifact_type: ArtifactType, text: str, frontmatter: dict | None
) -> str | None:
    if artifact_type is ArtifactType.STORIES:
        return derive_story_title(text)
    if frontmatter:
        return derive_frontmatter_title(frontmatter)
    return None


def _derive_status(
    artifact_type: ArtifactType, text: str, frontmatter: dict | None
) -> str | None:
    if artifact_type is ArtifactType.STORIES:
        return derive_story_status(text)
    if frontmatter:
        status_value = frontmatter.get("status")
        return str(status_value) if status_value is not None else None
    return None


def _resolve_target(root: Path, target_path: str) -> str | None:
    """Resolve a raw frontmatter reference against `root`.

    Real frontmatter in this repo writes cross-references relative to the
    repo root (e.g. `prjdocs/planning-artifacts/...`), not relative to
    `ARTIFACT_ROOT` itself. If the reference's leading path segment matches
    `root`'s own directory name, treat it as repo-root-relative and strip
    that segment before resolving; otherwise resolve it directly against
    `root` (the convention the original test fixtures already use).

    Returns the result as a root-relative POSIX string (comparable against
    `Artifact.file_path`), or `None` if it resolves outside `root`.
    """
    parts = PurePosixPath(target_path).parts
    if parts and parts[0] == root.name:
        target_path = str(PurePosixPath(*parts[1:])) if len(parts) > 1 else "."
    candidate = (root / target_path).resolve()
    try:
        return candidate.relative_to(root).as_posix()
    except ValueError:
        return None


def run_index(root: Path, db: Session) -> IndexResult:
    """Walk `root`, classify/parse/hash every matched file, and upsert the
    `artifacts`/`artifact_links` tables.

    Change detection is by content hash, keyed on unique `file_path`:
    unchanged hash -> row (and its links) untouched; changed hash -> row and
    links refreshed; new path -> inserted. A previously-indexed path that no
    longer exists on disk is out of scope for this story (no tombstoning).
    """
    root = root.resolve()
    result = IndexResult()

    existing_by_path = {a.file_path: a for a in db.query(Artifact).all()}
    touched: list[tuple[Artifact, list[tuple[str, str]]]] = []

    for path in _iter_candidate_files(root):
        relative = path.relative_to(root)
        artifact_type = classify(relative)
        if artifact_type is None:
            continue

        result.scanned += 1
        file_path = relative.as_posix()
        row = existing_by_path.get(file_path)

        # One bad file must not abort indexing of the rest (Task 4/AC3):
        # a TOCTOU race (file removed between rglob discovery and read) or
        # non-UTF-8 content is caught here, per-file, and recorded as this
        # row's error state instead of propagating out of the scan.
        try:
            raw = path.read_bytes()
            content_hash = hash_content(raw)

            if row is not None and row.content_hash == content_hash:
                result.unchanged += 1
                continue

            text = raw.decode("utf-8")
            frontmatter, error = extract_frontmatter(text)
            title: str | None = None
            status: str | None = None
            links: list[tuple[str, str]] = []

            if error is None:
                title = _derive_title(artifact_type, text, frontmatter)
                status = _derive_status(artifact_type, text, frontmatter)
                if frontmatter:
                    links = extract_cross_references(frontmatter)
        except Exception as exc:  # noqa: BLE001 - per-file isolation is the point
            content_hash = ""
            frontmatter, title, status, links = None, None, None, []
            error = f"Failed to read/process file: {exc}"

        now = datetime.now(UTC)
        if row is None:
            row = Artifact(artifact_type=artifact_type, file_path=file_path)
            db.add(row)
            result.inserted += 1
        else:
            result.updated += 1

        row.artifact_type = artifact_type
        row.title = title
        row.status = status
        row.frontmatter = frontmatter
        row.content_hash = content_hash
        row.error = error
        row.indexed_at = now
        if error is not None:
            result.errors += 1

        touched.append((row, links))

    if touched:
        db.flush()
        current_by_path = {a.file_path: a for a in db.query(Artifact).all()}
        for row, links in touched:
            db.query(ArtifactLink).filter(
                ArtifactLink.source_artifact_id == row.id
            ).delete()
            for source_field, target_path in links:
                resolved = _resolve_target(root, target_path)
                target = current_by_path.get(resolved) if resolved else None
                db.add(
                    ArtifactLink(
                        source_artifact_id=row.id,
                        source_field=source_field,
                        target_path=target_path,
                        target_artifact_id=target.id if target else None,
                        created_at=datetime.now(UTC),
                    )
                )

    db.commit()
    return result
