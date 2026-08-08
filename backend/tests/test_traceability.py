"""I/O matrix tests for the traceability matrix endpoint (Story 1.3, AC1-AC3).

Fixtures live under pytest's `tmp_path`, not the live `prjdocs/` tree — same
convention as `test_indexing.py`/`test_artifact_health.py`. Runs against the
same shared dev/CI PostgreSQL instance as those modules.
"""

from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.db import SessionLocal
from app.indexing import router as router_module
from app.indexing.models import Artifact, ArtifactLink
from app.indexing.scanner import run_index
from app.main import app

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _reset_schema() -> None:
    """Guarantee a pristine slate once before this module's assertions."""
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def _clear_index_tables():
    """Isolate each test: different `tmp_path` roots can reuse the same
    root-relative file paths, which would otherwise collide against the
    shared DB's `file_path` unique constraint."""
    db = SessionLocal()
    try:
        db.query(ArtifactLink).delete()
        db.query(Artifact).delete()
        db.commit()
    finally:
        db.close()
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _write(root: Path, relative: str, content: str) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


_user_counter = 0


def _auth_header() -> dict[str, str]:
    """Register + log in a fresh user, return its bearer Authorization header."""
    global _user_counter
    _user_counter += 1
    email = f"traceability-test-{_user_counter}@example.com"
    password = "correct-horse"
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": "architect_tech_lead"},
    )
    token = client.post(
        "/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _get_traceability(monkeypatch, root: Path, **kwargs):
    monkeypatch.setattr(router_module, "ARTIFACT_ROOT", root)
    return client.get("/artifacts/traceability", **kwargs)


_EPICS_TWO_EPICS_THREE_STORIES = (
    "## Epic List\n\n"
    "### Epic 1: Overview Heading Should Not Collide\n\n"
    "## Epic 1: First Epic\n\n"
    "### Story 1.1: First Story\n\n"
    "### Story 1.2: Second Story\n\n"
    "## Epic 2: Second Epic\n\n"
    "### Story 2.1: Third Story\n"
)


def _row(body: dict, epic_num: int, story_num: int) -> dict:
    return next(
        r for r in body["rows"] if r["epic_num"] == epic_num and r["story_num"] == story_num
    )


# --- AC1: roadmap extraction + row shape/order --------------------------------


def test_roadmap_produces_one_row_per_story_sorted_by_epic_then_story(tmp_path, db, monkeypatch):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    assert response.status_code == 200
    body = response.json()
    assert [(r["epic_num"], r["story_num"]) for r in body["rows"]] == [
        (1, 1),
        (1, 2),
        (2, 1),
    ]
    first = body["rows"][0]
    assert first["epic_title"] == "First Epic"
    assert first["story_title"] == "First Story"


def test_no_epics_artifact_indexed_returns_empty_rows_not_500(tmp_path, db, monkeypatch):
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    assert response.status_code == 200
    assert response.json()["rows"] == []


def test_epics_file_unreadable_after_indexing_returns_empty_rows_not_500(
    tmp_path, db, monkeypatch
):
    """An `epics.md` row indexed successfully, then deleted/made unreadable
    from disk before the request, must degrade to `rows: []`, not a 500 —
    same graceful-fallback contract as the "never indexed at all" case."""
    epics_path = _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    run_index(tmp_path, db)
    epics_path.unlink()

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    assert response.status_code == 200
    assert response.json()["rows"] == []


def test_duplicate_story_heading_under_same_epic_is_deduped(tmp_path, db, monkeypatch):
    _write(
        tmp_path,
        "epics.md",
        "## Epic 1: First Epic\n\n"
        "### Story 1.1: First Story\n\n"
        "### Story 1.1: First Story\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    assert response.status_code == 200
    rows = response.json()["rows"]
    assert [(r["epic_num"], r["story_num"]) for r in rows] == [(1, 1)]


# --- AC2/AC3: Story node status mapping ---------------------------------------


def test_story_with_no_matching_indexed_file_reports_not_started(tmp_path, db, monkeypatch):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    row = _row(response.json(), 1, 1)
    assert row["story"]["status"] == "not_started"
    assert row["story"]["artifact_id"] is None
    assert row["prs"]["status"] == "not_started"
    assert row["tests"]["status"] == "not_started"


def test_story_with_status_done_reports_completed(tmp_path, db, monkeypatch):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    _write(
        tmp_path,
        "implementation-artifacts/1-1-first-story.md",
        "# Story 1.1: First Story\n\nStatus: done\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    row = _row(response.json(), 1, 1)
    assert row["story"]["status"] == "completed"
    assert row["story"]["artifact_id"] is not None
    assert row["story"]["file_path"] == "implementation-artifacts/1-1-first-story.md"


def test_story_with_status_done_case_insensitive_reports_completed(tmp_path, db, monkeypatch):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    _write(
        tmp_path,
        "implementation-artifacts/2-1-third-story.md",
        "# Story 2.1: Third Story\n\nStatus: Done\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    row = _row(response.json(), 2, 1)
    assert row["story"]["status"] == "completed"


def test_story_with_status_in_progress_reports_pending(tmp_path, db, monkeypatch):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    _write(
        tmp_path,
        "implementation-artifacts/1-2-second-story.md",
        "# Story 1.2: Second Story\n\nStatus: in-progress\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    row = _row(response.json(), 1, 2)
    assert row["story"]["status"] == "pending"


def test_story_with_malformed_indexed_file_reports_pending_not_completed_or_not_started(
    tmp_path, db, monkeypatch
):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    _write(
        tmp_path,
        "implementation-artifacts/2-1-third-story.md",
        "---\ntitle: [unclosed\n---\n\n# Story 2.1: Third Story\n\nStatus: done\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())

    row = _row(response.json(), 2, 1)
    assert row["story"]["status"] == "pending"


# --- AC2/AC3: document node status mapping, identical across rows -------------


def test_document_nodes_map_missing_incomplete_complete_identically_on_every_row(
    tmp_path, db, monkeypatch
):
    _write(tmp_path, "epics.md", _EPICS_TWO_EPICS_THREE_STORIES)
    _write(
        tmp_path,
        "prds/my-prd/prd.md",
        "---\ntitle: My PRD\nstatus: final\n---\n\n# PRD\n",
    )
    _write(
        tmp_path,
        "briefs/broken/brief.md",
        "---\ntitle: [unclosed\n---\n\n# Broken\n",
    )
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path, headers=_auth_header())
    rows = response.json()["rows"]
    assert len(rows) == 3

    for row in rows:
        assert row["prd"]["status"] == "linked"
        assert row["idea_brief"]["status"] == "pending"
        # No architecture/ux artifacts indexed at all -> not_started.
        assert row["architecture"]["status"] == "not_started"
        assert row["ux"]["status"] == "not_started"


# --- Auth ----------------------------------------------------------------------


def test_no_authorization_header_returns_401(tmp_path, db, monkeypatch):
    run_index(tmp_path, db)

    response = _get_traceability(monkeypatch, tmp_path)

    assert response.status_code == 401
