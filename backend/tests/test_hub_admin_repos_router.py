"""I/O matrix tests for the admin Git/Repos endpoints (Story 6.1 revision):
`GET/POST /hub/admin/repos`, `PATCH /hub/admin/repos/{id}/credential`.

Same module conventions as `test_auth.py`/`test_realtime.py` (module-scoped
Alembic reset, `TestClient(app)`, unique-email users per test). Real access
verification (`check_repo_access`, which shells out to `git ls-remote`) is
mocked at the `app.hub.router.hub_service.check_repo_access` call site so
these stay deterministic and offline while still exercising the actual
endpoint/service wiring end to end.
"""

import subprocess
import uuid
from pathlib import Path
from unittest.mock import patch

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


def _unique_identifier() -> str:
    return f"https://github.com/org/repo-{uuid.uuid4().hex}.git"


def _unique_ssh_identifier() -> str:
    return f"git@github.com:org/repo-{uuid.uuid4().hex}.git"


def _unique_http_identifier() -> str:
    return f"http://example.com/org/repo-{uuid.uuid4().hex}.git"


def _register_and_login(role: str) -> str:
    email = f"admin-repos-test-{uuid.uuid4().hex}@example.com"
    password = "correct-horse"
    client.post("/auth/register", json={"email": email, "password": password, "role": role})
    response = client.post("/auth/login", json={"email": email, "password": password})
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestListAdminRepos:
    """ADMIN_LISTS_REPOS matrix row."""

    def test_admin_sees_all_known_repos(self):
        admin_token = _register_and_login("admin")
        identifier = _unique_identifier()

        with patch("app.hub.router.hub_service.check_repo_access", return_value=True):
            create_response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": identifier},
                headers=_auth_headers(admin_token),
            )
        assert create_response.status_code == 201

        list_response = client.get("/hub/admin/repos", headers=_auth_headers(admin_token))
        assert list_response.status_code == 200
        repos = list_response.json()["repos"]
        assert any(r["technical_identifier"] == identifier for r in repos)
        created = next(r for r in repos if r["technical_identifier"] == identifier)
        assert created["origin"] == "manual"
        assert created["status"] == "active"
        assert created["has_credential"] is False
        # Never the raw/encrypted credential in the response.
        assert "credential" not in created
        assert "encrypted_credential" not in created

    def test_non_admin_forbidden(self):
        dev_token = _register_and_login("developer")

        response = client.get("/hub/admin/repos", headers=_auth_headers(dev_token))

        assert response.status_code == 403

    def test_discovered_repo_listed_alongside_manual_ones(self):
        """DISCOVERED_REPO_LISTED matrix row: a Client-reported identity
        (default `origin="discovered"`, the Epic 2 zero-setup onboarding
        path -- see `_process_client_identity`) shows up in the same admin
        list as manually-added repos.
        """
        from app.db import SessionLocal
        from app.hub.service import get_or_create_space

        admin_token = _register_and_login("admin")
        identifier = _unique_identifier()

        db = SessionLocal()
        try:
            with patch("app.hub.service.check_repo_access", return_value=True):
                get_or_create_space(db, identifier)
        finally:
            db.close()

        list_response = client.get("/hub/admin/repos", headers=_auth_headers(admin_token))
        assert list_response.status_code == 200
        repos = list_response.json()["repos"]
        discovered = next(r for r in repos if r["technical_identifier"] == identifier)
        assert discovered["origin"] == "discovered"


class TestAddManualRepo:
    """ADMIN_ADD_MANUAL_REPO matrix row."""

    def test_add_public_repo_becomes_active(self):
        admin_token = _register_and_login("admin")
        identifier = _unique_identifier()

        with patch("app.hub.router.hub_service.check_repo_access", return_value=True):
            response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": identifier},
                headers=_auth_headers(admin_token),
            )

        assert response.status_code == 201
        body = response.json()
        assert body["origin"] == "manual"
        assert body["status"] == "active"

    def test_add_private_repo_stays_pending(self):
        """PRIVATE_REPO_PENDING matrix row."""
        admin_token = _register_and_login("admin")
        identifier = _unique_identifier()

        with patch("app.hub.router.hub_service.check_repo_access", return_value=False):
            response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": identifier},
                headers=_auth_headers(admin_token),
            )

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "pending"

    def test_invalid_url_returns_400(self):
        admin_token = _register_and_login("admin")

        response = client.post(
            "/hub/admin/repos",
            json={"technical_identifier": "not-a-repo-url"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400

    def test_non_admin_forbidden(self):
        dev_token = _register_and_login("developer")

        response = client.post(
            "/hub/admin/repos",
            json={"technical_identifier": _unique_identifier()},
            headers=_auth_headers(dev_token),
        )

        assert response.status_code == 403

    def test_new_repo_add_calls_git_exactly_once(self):
        """Regression test: `add_admin_repo` must run its one real access
        check by threadpooling `get_or_create_space` itself, never a second,
        redundant `check_repo_access` call on top of it -- `git` should be
        shelled out to exactly once per new-repo add."""
        admin_token = _register_and_login("admin")
        identifier = _unique_identifier()

        with patch("app.hub.service.subprocess.run") as mock_run:
            mock_run.return_value = subprocess.CompletedProcess(args=["git"], returncode=0)
            response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": identifier},
                headers=_auth_headers(admin_token),
            )

        assert response.status_code == 201
        assert response.json()["status"] == "active"
        assert mock_run.call_count == 1


class TestAuthorizeRepoCredential:
    """ADMIN_AUTHORIZES_REPO matrix row."""

    def _create_pending_repo(self, admin_token: str) -> dict:
        identifier = _unique_identifier()
        with patch("app.hub.router.hub_service.check_repo_access", return_value=False):
            response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": identifier},
                headers=_auth_headers(admin_token),
            )
        assert response.json()["status"] == "pending"
        return response.json()

    def test_valid_token_unblocks_access(self):
        admin_token = _register_and_login("admin")
        repo = self._create_pending_repo(admin_token)

        with patch("app.hub.router.hub_service.check_repo_access", return_value=True):
            response = client.patch(
                f"/hub/admin/repos/{repo['id']}/credential",
                json={"credential": "a-valid-token"},
                headers=_auth_headers(admin_token),
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "active"
        assert body["has_credential"] is True

    def test_invalid_token_stays_pending(self):
        admin_token = _register_and_login("admin")
        repo = self._create_pending_repo(admin_token)

        with patch("app.hub.router.hub_service.check_repo_access", return_value=False):
            response = client.patch(
                f"/hub/admin/repos/{repo['id']}/credential",
                json={"credential": "an-invalid-token"},
                headers=_auth_headers(admin_token),
            )

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "pending"
        # The (still-refused) credential is stored regardless -- has_credential
        # reflects storage, not validity.
        assert body["has_credential"] is True

    def test_unknown_repo_returns_404(self):
        admin_token = _register_and_login("admin")

        response = client.patch(
            f"/hub/admin/repos/{uuid.uuid4()}/credential",
            json={"credential": "a-token"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 404

    def test_non_admin_forbidden(self):
        admin_token = _register_and_login("admin")
        dev_token = _register_and_login("developer")
        repo = self._create_pending_repo(admin_token)

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": "a-token"},
            headers=_auth_headers(dev_token),
        )

        assert response.status_code == 403

    def test_non_string_credential_returns_400(self):
        admin_token = _register_and_login("admin")
        repo = self._create_pending_repo(admin_token)

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": 12345},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400

    def test_credential_with_newline_returns_400(self):
        admin_token = _register_and_login("admin")
        repo = self._create_pending_repo(admin_token)

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": "line1\nline2"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400

    def test_credential_with_carriage_return_returns_400(self):
        admin_token = _register_and_login("admin")
        repo = self._create_pending_repo(admin_token)

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": "line1\rline2"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400

    def test_credential_for_ssh_repo_returns_400(self):
        """SSH identifiers are checked without credential injection (this
        revision's "Never" boundary) -- storing a credential for one must
        be rejected, not silently accepted and never used."""
        admin_token = _register_and_login("admin")
        ssh_identifier = _unique_ssh_identifier()

        with patch("app.hub.router.hub_service.check_repo_access", return_value=False):
            create_response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": ssh_identifier},
                headers=_auth_headers(admin_token),
            )
        repo = create_response.json()
        assert repo["status"] == "pending"

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": "a-token"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400

    def test_credential_for_http_repo_returns_400(self):
        """Credential injection only ever fires for `https://` identifiers
        (see `check_repo_access`) -- a bare `http://` repo can never be
        unblocked by a stored credential, so storing one must be rejected
        rather than accepted and silently never used."""
        admin_token = _register_and_login("admin")
        http_identifier = _unique_http_identifier()

        with patch("app.hub.router.hub_service.check_repo_access", return_value=False):
            create_response = client.post(
                "/hub/admin/repos",
                json={"technical_identifier": http_identifier},
                headers=_auth_headers(admin_token),
            )
        repo = create_response.json()
        assert repo["status"] == "pending"

        response = client.patch(
            f"/hub/admin/repos/{repo['id']}/credential",
            json={"credential": "a-token"},
            headers=_auth_headers(admin_token),
        )

        assert response.status_code == 400
