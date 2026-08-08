"""The fixed `ArtifactType` enum and path/filename-convention classification.

Classification is by directory/filename convention, not by reading a
frontmatter `type:` field: verified against this repo's actual planning
artifacts, only a minority of types carry a `type`-like frontmatter key at
all, and Story files (the largest single category) have no frontmatter
whatsoever. A design trusting a uniform `type:` field would misclassify or
drop most real artifacts on first run (Story 1.1 Task 2).
"""

import enum
import re
from pathlib import PurePosixPath


class ArtifactType(enum.StrEnum):
    """FR1's 11 catalogued artifact types (English snake_case)."""

    BRAINSTORMING = "brainstorming"
    BRIEF = "brief"
    PRD = "prd"
    ARCHITECTURE = "architecture"
    UX = "ux"
    TESTS = "tests"
    SPECS = "specs"
    EPICS = "epics"
    STORIES = "stories"
    DECISIONS = "decisions"
    CEREMONIES = "ceremonies"


# Patterns are glob-style, matched with `PurePosixPath.full_match` (`**`
# spans zero or more path segments). Checked in order; first match wins —
# `SPECS` is listed before `STORIES` so `spec-*.md` files (which would also
# satisfy a naive digit-prefix check) are classified as specs.
#
# `brainstorming`, `tests`, `decisions`, `ceremonies` have no file convention
# anywhere in this repo yet (no brainstorming output, no QA test-design
# docs, no standalone decision files — decisions live embedded as `AD-XXX`
# entries inside the Architecture spine, not their own files; no ceremony
# artifacts exist before Epic 4). Their patterns are deliberately absent:
# zero matches is correct behavior, not a bug to work around.
_PATTERNS: tuple[tuple[ArtifactType, str], ...] = (
    (ArtifactType.BRIEF, "**/briefs/*/brief.md"),
    (ArtifactType.PRD, "**/prds/*/prd.md"),
    (ArtifactType.ARCHITECTURE, "**/architecture/*/*.md"),
    (ArtifactType.UX, "**/ux-designs/*/DESIGN.md"),
    (ArtifactType.UX, "**/ux-designs/*/EXPERIENCE.md"),
    (ArtifactType.EPICS, "**/epics.md"),
    (ArtifactType.SPECS, "**/implementation-artifacts/spec-*.md"),
)

# Story filenames are `<epic>-<story>-*.md` where epic/story numbers can be
# more than one digit (e.g. `10-1-foo.md`, `1-10-foo.md`) — glob patterns
# can't express "one or more digits" (`[0-9]` matches exactly one), so
# STORIES is matched by regex against the filename instead of via `_PATTERNS`.
_STORY_FILENAME_RE = re.compile(r"^[0-9]+-[0-9]+-.+\.md$")


def classify(relative_path: PurePosixPath) -> ArtifactType | None:
    """Classify `relative_path` (relative to `ARTIFACT_ROOT`) by convention.

    Returns `None` for `.memlog.md` companions (audit-trail files, not one
    of FR1's 11 artifact types) and for anything matching no known
    convention — both are deliberately excluded from the catalog.
    """
    if relative_path.name == ".memlog.md":
        return None

    for artifact_type, pattern in _PATTERNS:
        if relative_path.full_match(pattern):
            return artifact_type

    if relative_path.parent.name == "implementation-artifacts" and _STORY_FILENAME_RE.match(
        relative_path.name
    ):
        return ArtifactType.STORIES

    return None
