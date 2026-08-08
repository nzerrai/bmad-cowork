"""Frontmatter parsing, title/status derivation, and cross-reference
extraction (Story 1.1 Tasks 3 & 4).

Real frontmatter shapes vary by artifact type — there is no uniform schema
across this repo's planning artifacts (see Story 1.1 Dev Notes for the
concrete per-type key inventory this module is built against).
"""

import datetime
import re
from typing import Any

import yaml

_FRONTMATTER_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.DOTALL)

# Story files carry no frontmatter by convention — title is derived from the
# `# Story X.Y: ...` heading instead. This is the one type-specific
# exception to the frontmatter-driven title rule (Task 3).
_STORY_HEADING_RE = re.compile(r"^#\s*Story\s+\S+:\s*(.+?)\s*$", re.MULTILINE)

# Story files carry their workflow status as a plain-text `Status: ...` body
# line (not frontmatter) — same type-specific exception as title derivation.
_STORY_STATUS_RE = re.compile(r"^Status:\s*(.+?)\s*$", re.MULTILINE)

# Frontmatter keys observed in this repo whose values are cross-references
# to other artifacts (list-of-path-strings). Not a fixed universal key —
# extend this tuple if a new convention appears. `binds` (a list of FR ids)
# and `baseline_revision`/`final_revision` (git hashes) are deliberately
# excluded: they aren't paths.
_CROSS_REFERENCE_KEYS = ("inputDocuments", "sources", "companions", "context")


def _json_safe(value: Any) -> Any:
    """Recursively convert YAML-native, non-JSON-native scalars (PyYAML
    parses unquoted `2026-08-01`-style values as `date`/`datetime`) so the
    frontmatter dict can be stored as-is in the `frontmatter` JSONB column.
    """
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, datetime.datetime | datetime.date):
        return value.isoformat()
    return value


def extract_frontmatter(text: str) -> tuple[dict | None, str | None]:
    """Parse a leading `---`-delimited YAML frontmatter block, if present.

    Returns `(frontmatter, error)`:
    - No block present: valid for types like `stories` that carry none by
      convention — `(None, None)`, not an error.
    - Block present and parses to a mapping (or is empty): `(dict, None)`.
    - Block present but fails to parse, or doesn't parse to a mapping:
      AC3's malformed state — `(None, <message>)`.
    """
    match = _FRONTMATTER_RE.match(text)
    if match is None:
        return None, None

    try:
        parsed = yaml.safe_load(match.group(1))
    except yaml.YAMLError as exc:
        return None, str(exc)

    if parsed is None:
        return {}, None
    if not isinstance(parsed, dict):
        return None, f"Frontmatter must be a YAML mapping, got {type(parsed).__name__}"
    return _json_safe(parsed), None


def derive_story_title(text: str) -> str | None:
    """Extract the title from a Story file's `# Story X.Y: <title>` heading."""
    match = _STORY_HEADING_RE.search(text)
    return match.group(1) if match else None


def derive_story_status(text: str) -> str | None:
    """Extract the status from a Story file's plain-text `Status: <value>` line."""
    match = _STORY_STATUS_RE.search(text)
    return match.group(1) if match else None


def derive_frontmatter_title(frontmatter: dict) -> str | None:
    """Read `title`, falling back to `name` (the key UX docs use instead)."""
    for key in ("title", "name"):
        value = frontmatter.get(key)
        if isinstance(value, str):
            return value
    return None


def extract_cross_references(frontmatter: dict) -> list[tuple[str, str]]:
    """Return `(source_field, target_path)` pairs for every known
    cross-reference key present in `frontmatter` with a list-of-strings value.
    """
    links: list[tuple[str, str]] = []
    for key in _CROSS_REFERENCE_KEYS:
        value = frontmatter.get(key)
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            continue
        for item in value:
            if isinstance(item, str):
                links.append((key, item))
    return links
