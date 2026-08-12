"""I/O matrix tests for `GET /api/dashboard/data` (VS Code extension sidebar
dashboard). Same module conventions as `test_hub_admin_repos_router.py`:
module-scoped Alembic reset, `TestClient(app)`, unique-email users per test.
"""

import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.main import app

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _reset_schema() -> None:
    """Guarantee a pristine slate once before this module's assertions."""
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


def _register_and_login(role: str = "developer") -> str:
    email = f"dashboard-data-test-{uuid.uuid4().hex}@example.com"
    password = "correct-horse"
    client.post("/auth/register", json={"email": email, "password": password, "role": role})
    response = client.post("/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestDashboardData:
    def test_no_credentials_returns_401(self):
        response = client.get("/api/dashboard/data")
        assert response.status_code == 401

    def test_no_reported_state_returns_absent(self):
        token = _register_and_login()

        response = client.get("/api/dashboard/data", headers=_auth_headers(token))

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "absent"
        assert body["repoState"]["syncStatus"] == "Idle-Offline"
        assert body["claims"] == []
        assert body["riskSignals"] == []

    def test_reported_synced_state_reflected_in_dashboard(self):
        token = _register_and_login()
        headers = _auth_headers(token)

        client.post(
            "/api/git-state-report",
            headers=headers,
            json={
                "technical_identifier": "https://github.com/org/repo.git",
                "branch": "main",
                "ahead": 0,
                "behind": 0,
                "in_progress_action": "none",
                "is_bmad_enabled": True,
            },
        )

        response = client.get("/api/dashboard/data", headers=headers)

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "connected"
        assert body["repoState"]["syncStatus"] == "synced"
        assert body["repoState"]["ahead"] == 0
        assert body["repoState"]["behind"] == 0
        assert body["isStale"] is False

    def test_reported_conflict_state_reflected_in_dashboard(self):
        token = _register_and_login()
        headers = _auth_headers(token)

        client.post(
            "/api/git-state-report",
            headers=headers,
            json={
                "technical_identifier": "https://github.com/org/repo.git",
                "branch": "main",
                "ahead": 1,
                "behind": 2,
                "in_progress_action": "conflict",
                "is_bmad_enabled": True,
            },
        )

        response = client.get("/api/dashboard/data", headers=headers)

        assert response.status_code == 200
        body = response.json()
        assert body["repoState"]["syncStatus"] == "conflict"
        assert body["repoState"]["hasInProgressConflict"] is True
        assert body["repoState"]["ahead"] == 1
        assert body["repoState"]["behind"] == 2
