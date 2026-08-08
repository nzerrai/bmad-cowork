"""I/O matrix tests for the artifact health endpoint (Story 1.2, AC1-AC4).

Fixtures live under pytest's `tmp_path`, not the live `prjdocs/` tree — same
convention as `test_indexing.py`. Runs against the same shared dev/CI
PostgreSQL instance as `test_migrations.py`/`test_auth.py`/`test_indexing.py`.
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
    email = f"health-test-{_user_counter}@example.com"
    password = "correct-horse"
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": "product_manager"},
    )
    token = client.post(
        "/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _get_health(monkeypatch, root: Path, **kwargs):
    monkeypatch.setattr(router_module, "ARTIFACT_ROOT", root)
    return client.get("/artifacts/health", **kwargs)


def _type_row(body: dict, artifact_type: str) -> dict:
    return next(t for t in body["types"] if t["artifact_type"] == artifact_type)


# --- AC1: per-type completeness rollup --------------------------------------


def test_type_with_zero_indexed_rows_reports_missing(tmp_path, db, monkeypatch) -> None:
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    assert response.status_code == 200
    brainstorming = _type_row(response.json(), "brainstorming")
    assert brainstorming["completeness"] == "missing"
    assert brainstorming["count"] == 0
    assert brainstorming["error_count"] == 0


def test_type_with_one_clean_row_reports_complete(tmp_path, db, monkeypatch) -> None:
    _write(
        tmp_path, "prds/my-prd/prd.md", "---\ntitle: My PRD\nstatus: final\n---\n\n# PRD\n"
    )
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    prd = _type_row(response.json(), "prd")
    assert prd["completeness"] == "complete"
    assert prd["count"] == 1
    assert prd["error_count"] == 0


def test_type_with_errored_row_reports_incomplete(tmp_path, db, monkeypatch) -> None:
    _write(tmp_path, "briefs/broken/brief.md", "---\ntitle: [unclosed\n---\n\n# Broken\n")
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    brief = _type_row(response.json(), "brief")
    assert brief["completeness"] == "incomplete"
    assert brief["count"] == 1
    assert brief["error_count"] == 1


# --- AC2/AC4: links, including broken ones -----------------------------------


def test_resolved_and_broken_links_both_appear_in_response(tmp_path, db, monkeypatch) -> None:
    _write(tmp_path, "prds/target/prd.md", "---\ntitle: Target\nstatus: final\n---\n\n# PRD\n")
    _write(
        tmp_path,
        "epics.md",
        "---\n"
        "inputDocuments:\n"
        "  - prds/target/prd.md\n"
        "  - prds/missing/prd.md\n"
        "---\n\n# Epics\n",
    )
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    body = response.json()
    epics = next(a for a in body["artifacts"] if a["file_path"] == "epics.md")
    links_by_target = {link["target_path"]: link for link in epics["links_out"]}

    assert links_by_target["prds/target/prd.md"]["resolved"] is True
    assert links_by_target["prds/target/prd.md"]["target_artifact_id"] is not None

    broken = links_by_target["prds/missing/prd.md"]
    assert broken["resolved"] is False
    assert broken["target_artifact_id"] is None


# --- AC3: sync status ---------------------------------------------------------


def test_unchanged_file_reports_synced(tmp_path, db, monkeypatch) -> None:
    _write(tmp_path, "prds/a/prd.md", "---\ntitle: A\nstatus: final\n---\n\n# A\n")
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    artifact = next(a for a in response.json()["artifacts"] if a["file_path"] == "prds/a/prd.md")
    assert artifact["sync_status"] == "synced"


def test_file_edited_after_indexing_reports_stale(tmp_path, db, monkeypatch) -> None:
    path = _write(tmp_path, "prds/a/prd.md", "---\ntitle: A\nstatus: final\n---\n\n# A\n")
    run_index(tmp_path, db)
    path.write_text("---\ntitle: A changed\nstatus: final\n---\n\n# A\n", encoding="utf-8")

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    artifact = next(a for a in response.json()["artifacts"] if a["file_path"] == "prds/a/prd.md")
    assert artifact["sync_status"] == "stale"


def test_file_deleted_after_indexing_reports_deleted(tmp_path, db, monkeypatch) -> None:
    path = _write(tmp_path, "prds/a/prd.md", "---\ntitle: A\nstatus: final\n---\n\n# A\n")
    run_index(tmp_path, db)
    path.unlink()

    response = _get_health(monkeypatch, tmp_path, headers=_auth_header())

    artifact = next(a for a in response.json()["artifacts"] if a["file_path"] == "prds/a/prd.md")
    assert artifact["sync_status"] == "deleted"


def test_unreadable_file_reports_error_not_deleted(tmp_path, db, monkeypatch) -> None:
    """A permission failure is a distinct, real state — not the same signal
    as "the file is gone" (review finding: `_sync_status` used to collapse
    every `OSError` into `deleted`)."""
    path = _write(tmp_path, "prds/a/prd.md", "---\ntitle: A\nstatus: final\n---\n\n# A\n")
    run_index(tmp_path, db)
    path.chmod(0o000)
    try:
        response = _get_health(monkeypatch, tmp_path, headers=_auth_header())
    finally:
        path.chmod(0o644)

    artifact = next(a for a in response.json()["artifacts"] if a["file_path"] == "prds/a/prd.md")
    assert artifact["sync_status"] == "error"


def test_missing_artifact_root_fails_loudly(tmp_path, db, monkeypatch) -> None:
    """A misconfigured/missing `ARTIFACT_ROOT` must surface as a real error,
    not silently report every artifact as `deleted` (review finding). The
    TestClient's default `raise_server_exceptions=True` re-raises it here
    rather than converting it to a 500 response."""
    with pytest.raises(NotADirectoryError):
        _get_health(monkeypatch, tmp_path / "does-not-exist", headers=_auth_header())


# --- Auth + CORS ---------------------------------------------------------------


def test_no_authorization_header_returns_401(tmp_path, db, monkeypatch) -> None:
    run_index(tmp_path, db)

    response = _get_health(monkeypatch, tmp_path)

    assert response.status_code == 401


def test_get_with_configured_origin_returns_allow_origin_header(tmp_path, db, monkeypatch) -> None:
    run_index(tmp_path, db)
    headers = _auth_header()
    headers["Origin"] = "http://localhost:3000"

    response = _get_health(monkeypatch, tmp_path, headers=headers)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
