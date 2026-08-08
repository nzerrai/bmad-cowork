"""Traceability matrix computation (Story 1.3 Task 2).

Read-only, computed at request time — never cached, never written back, same
"never re-triggers Story 1.1's `run_index`" shape as `health.compute_health`.

The real data graph is much sparser than FR3's Idea -> PRD -> Archi -> UX ->
Story -> PRs -> Tests chain implies (see the story's Dev Notes): Brief/PRD
carry no cross-reference frontmatter, and Story files carry none at all. So
this module does not chase `ArtifactLink` edges the way `health.py` does —
it treats the four document node kinds (`idea_brief`/`prd`/`architecture`/
`ux`) as per-type existence/health checks (reusing `type_completeness_rollup`)
and derives the Story axis structurally from `epics.md`'s own headings,
matched against indexed Story artifacts by filename numeric prefix.
"""

import re
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

from sqlalchemy.orm import Session

from app.indexing.health import ArtifactTypeHealth, type_completeness_rollup
from app.indexing.models import Artifact
from app.indexing.types import ArtifactType

# Real per-epic sections use `## Epic N: Title` (H2); the `## Epic List`
# overview section earlier in the document uses `### Epic N: Title` (H3) —
# deliberately not matched here so the two don't collide.
_EPIC_HEADING_RE = re.compile(r"^## Epic (\d+): (.+)$", re.MULTILINE)
_STORY_HEADING_RE = re.compile(r"^### Story (\d+)\.(\d+): (.+)$", re.MULTILINE)

# Indexed Story artifacts' filename numeric prefix, e.g. `1-3-traceability-
# matrix.md` -> (1, 3). Same convention as `types.py`'s `_STORY_FILENAME_RE`,
# rewritten with capture groups since this module needs the numbers, not
# just a boolean match.
_STORY_FILE_PREFIX_RE = re.compile(r"^(\d+)-(\d+)-")

_DOCUMENT_NODE_TYPES: dict[str, ArtifactType] = {
    "idea_brief": ArtifactType.BRIEF,
    "prd": ArtifactType.PRD,
    "architecture": ArtifactType.ARCHITECTURE,
    "ux": ArtifactType.UX,
}

_COMPLETENESS_TO_NODE_STATUS: dict[str, str] = {
    "complete": "linked",
    "incomplete": "pending",
    "missing": "not_started",
}


@dataclass
class RoadmapStory:
    epic_num: int
    story_num: int
    epic_title: str
    story_title: str


@dataclass(frozen=True)
class TraceabilityNode:
    status: str  # "completed" | "pending" | "linked" | "not_started"
    artifact_id: uuid.UUID | None
    title: str | None
    file_path: str | None


@dataclass
class TraceabilityRow:
    epic_num: int
    story_num: int
    epic_title: str
    story_title: str
    idea_brief: TraceabilityNode
    prd: TraceabilityNode
    architecture: TraceabilityNode
    ux: TraceabilityNode
    story: TraceabilityNode
    prs: TraceabilityNode
    tests: TraceabilityNode


@dataclass
class TraceabilityMatrix:
    rows: list[TraceabilityRow]


_NOT_STARTED_NODE = TraceabilityNode(
    status="not_started", artifact_id=None, title=None, file_path=None
)


def _extract_roadmap(text: str) -> list[RoadmapStory]:
    """Regex-extract the epic/story roadmap structure from `epics.md`'s body.

    Story headers are attributed to whichever `## Epic N: Title` heading
    precedes them in document order; a story header with no preceding epic
    heading is dropped (no attribution possible).
    """
    events: list[tuple[int, str, re.Match]] = [
        (m.start(), "epic", m) for m in _EPIC_HEADING_RE.finditer(text)
    ] + [(m.start(), "story", m) for m in _STORY_HEADING_RE.finditer(text)]
    events.sort(key=lambda event: event[0])

    stories: list[RoadmapStory] = []
    seen: set[tuple[int, int]] = set()
    current_epic_num: int | None = None
    current_epic_title: str | None = None
    for _, kind, match in events:
        if kind == "epic":
            current_epic_num = int(match.group(1))
            current_epic_title = match.group(2).strip()
            continue
        if current_epic_num is None or current_epic_title is None:
            continue
        story_num = int(match.group(2))
        # A duplicate `### Story N.M` heading under the same epic (e.g. an
        # editorial typo in epics.md) would otherwise produce two rows for
        # the same roadmap pair — keep the first occurrence only.
        key = (current_epic_num, story_num)
        if key in seen:
            continue
        seen.add(key)
        stories.append(
            RoadmapStory(
                epic_num=current_epic_num,
                story_num=story_num,
                epic_title=current_epic_title,
                story_title=match.group(3).strip(),
            )
        )
    return stories


def _index_story_artifacts(artifacts: list[Artifact]) -> dict[tuple[int, int], Artifact]:
    """Map `(epic_num, story_num)` -> the indexed Story artifact for that
    prefix. If two indexed rows share the same numeric prefix (a pathological
    but real possibility), deterministically keep the one with the
    lexicographically smallest `file_path`.
    """
    by_prefix: dict[tuple[int, int], Artifact] = {}
    for artifact in artifacts:
        if artifact.artifact_type is not ArtifactType.STORIES:
            continue
        match = _STORY_FILE_PREFIX_RE.match(PurePosixPath(artifact.file_path).name)
        if match is None:
            continue
        key = (int(match.group(1)), int(match.group(2)))
        existing = by_prefix.get(key)
        if existing is None or artifact.file_path < existing.file_path:
            by_prefix[key] = artifact
    return by_prefix


def _document_node(
    rollup: dict[ArtifactType, ArtifactTypeHealth], artifact_type: ArtifactType
) -> TraceabilityNode:
    status = _COMPLETENESS_TO_NODE_STATUS[rollup[artifact_type].completeness]
    return TraceabilityNode(status=status, artifact_id=None, title=None, file_path=None)


def _story_node(
    story_artifacts_by_prefix: dict[tuple[int, int], Artifact], epic_num: int, story_num: int
) -> TraceabilityNode:
    artifact = story_artifacts_by_prefix.get((epic_num, story_num))
    if artifact is None:
        return _NOT_STARTED_NODE
    if artifact.error is not None:
        status = "pending"
    elif (artifact.status or "").lower() == "done":
        status = "completed"
    else:
        status = "pending"
    return TraceabilityNode(
        status=status, artifact_id=artifact.id, title=artifact.title, file_path=artifact.file_path
    )


def compute_traceability(db: Session, root: Path) -> TraceabilityMatrix:
    """Compute the full traceability matrix for every roadmap Epic/Story
    pair defined in the indexed `epics.md`, sorted by `(epic_num, story_num)`.
    """
    root = root.resolve()
    if not root.is_dir():
        raise NotADirectoryError(f"ARTIFACT_ROOT does not exist or is not a directory: {root}")
    artifacts = db.query(Artifact).order_by(Artifact.file_path).all()

    epics_artifacts = [a for a in artifacts if a.artifact_type is ArtifactType.EPICS]
    if not epics_artifacts:
        return TraceabilityMatrix(rows=[])
    epics_artifact = epics_artifacts[0]

    try:
        text = (root / epics_artifact.file_path).read_bytes().decode("utf-8")
    except (OSError, UnicodeDecodeError):
        return TraceabilityMatrix(rows=[])

    roadmap = _extract_roadmap(text)
    if not roadmap:
        return TraceabilityMatrix(rows=[])

    rollup = type_completeness_rollup(artifacts)
    story_artifacts_by_prefix = _index_story_artifacts(artifacts)

    document_nodes = {
        field_name: _document_node(rollup, artifact_type)
        for field_name, artifact_type in _DOCUMENT_NODE_TYPES.items()
    }

    rows = [
        TraceabilityRow(
            epic_num=item.epic_num,
            story_num=item.story_num,
            epic_title=item.epic_title,
            story_title=item.story_title,
            idea_brief=document_nodes["idea_brief"],
            prd=document_nodes["prd"],
            architecture=document_nodes["architecture"],
            ux=document_nodes["ux"],
            story=_story_node(story_artifacts_by_prefix, item.epic_num, item.story_num),
            prs=_NOT_STARTED_NODE,
            tests=_NOT_STARTED_NODE,
        )
        for item in roadmap
    ]
    rows.sort(key=lambda row: (row.epic_num, row.story_num))
    return TraceabilityMatrix(rows=rows)
