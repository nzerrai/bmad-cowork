"""I/O matrix tests for `GET /hub/dashboard/repos` (spec:
dashboard-user-scoped-repos-list).

Same module conventions as `test_hub_admin_repos_router.py`/`test_realtime.py`
(module-scoped Alembic reset, `TestClient(app)`, unique-email users per
test). Covers the spec's I/O & Edge-Case Matrix:
- ADMIN_SEES_ALL
- USER_SEES_OWN
- NO_REPOS_CONNECTED
(MEMBERSHIP_ON_IDENTITY is covered in `test_realtime.py`, at the point
where the membership is actually created.)
"""

import uuid
from pathlib import Path
from unittest.mock import patch

import jwt
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.db import SessionLocal
from app.hub.git_state_models import ContributorGitState
from app.hub.service import get_or_create_membership, get_or_create_space
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


def _register_and_login(role: str) -> tuple[str, str]:
    email = f"dashboard-repos-test-{uuid.uuid4().hex}@example.com"
    password = "correct-horse"
    client.post("/auth/register", json={"email": email, "password": password, "role": role})
    response = client.post("/auth/login", json={"email": email, "password": password})
    token = response.json()["access_token"]
    user_id = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])["sub"]
    return token, user_id


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_space(identifier: str | None = None):
    identifier = identifier or _unique_identifier()
    db = SessionLocal()
    try:
        with patch("app.hub.service.check_repo_access", return_value=True):
            space = get_or_create_space(db, identifier)
        db.refresh(space)
        return space
    finally:
        db.close()


class TestAdminSeesAll:
    """ADMIN_SEES_ALL matrix row."""

    def test_admin_sees_every_known_space_regardless_of_membership(self):
        admin_token, _ = _register_and_login("admin")
        space_a = _create_space()
        space_b = _create_space()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(admin_token))

        assert response.status_code == 200
        identifiers = {r["technical_identifier"] for r in response.json()["repos"]}
        assert space_a.technical_identifier in identifiers
        assert space_b.technical_identifier in identifiers

    def test_admin_repo_shape_matches_admin_repos_serializer(self):
        admin_token, _ = _register_and_login("admin")
        space = _create_space()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(admin_token))

        repo = next(
            r for r in response.json()["repos"] if r["technical_identifier"] == space.technical_identifier
        )
        assert repo["id"] == str(space.id)
        assert repo["short_name"] == space.short_name
        assert repo["status"] == space.status.value
        assert repo["origin"] == space.origin
        assert "has_credential" in repo
        assert "credential" not in repo
        assert "encrypted_credential" not in repo
        # No backend PR integration exists in this revision -- never fabricated.
        assert "prs" not in repo


class TestUserSeesOwn:
    """USER_SEES_OWN matrix row."""

    def test_developer_sees_only_repos_with_membership(self):
        dev_token, dev_user_id = _register_and_login("developer")
        member_space = _create_space()
        other_space = _create_space()

        db = SessionLocal()
        try:
            get_or_create_membership(db, uuid.UUID(dev_user_id), member_space.id)
        finally:
            db.close()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_token))

        assert response.status_code == 200
        identifiers = {r["technical_identifier"] for r in response.json()["repos"]}
        assert member_space.technical_identifier in identifiers
        assert other_space.technical_identifier not in identifiers

    def test_developer_sees_only_their_own_membership_not_another_users(self):
        dev_a_token, dev_a_id = _register_and_login("developer")
        dev_b_token, dev_b_id = _register_and_login("developer")
        space_a = _create_space()
        space_b = _create_space()

        db = SessionLocal()
        try:
            get_or_create_membership(db, uuid.UUID(dev_a_id), space_a.id)
            get_or_create_membership(db, uuid.UUID(dev_b_id), space_b.id)
        finally:
            db.close()

        response_a = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_a_token))
        response_b = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_b_token))

        identifiers_a = {r["technical_identifier"] for r in response_a.json()["repos"]}
        identifiers_b = {r["technical_identifier"] for r in response_b.json()["repos"]}
        assert space_a.technical_identifier in identifiers_a
        assert space_b.technical_identifier not in identifiers_a
        assert space_b.technical_identifier in identifiers_b
        assert space_a.technical_identifier not in identifiers_b

    def test_git_state_included_when_technical_identifier_matches(self):
        dev_token, dev_user_id = _register_and_login("developer")
        member_space = _create_space()
        other_space = _create_space()

        db = SessionLocal()
        try:
            get_or_create_membership(db, uuid.UUID(dev_user_id), member_space.id)
            get_or_create_membership(db, uuid.UUID(dev_user_id), other_space.id)
            git_state = ContributorGitState(
                user_id=dev_user_id,
                technical_identifier=member_space.technical_identifier,
                branch="feature/x",
                ahead=2,
                behind=1,
                in_progress_action="none",
            )
            db.add(git_state)
            db.commit()
        finally:
            db.close()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_token))

        repos = {r["technical_identifier"]: r for r in response.json()["repos"]}
        matched = repos[member_space.technical_identifier]
        assert matched["git_state"] is not None
        assert matched["git_state"]["branch"] == "feature/x"
        assert matched["git_state"]["ahead"] == 2
        assert matched["git_state"]["behind"] == 1

        # Never fabricated for a repo that doesn't match the contributor's
        # current git state technical_identifier.
        unmatched = repos[other_space.technical_identifier]
        assert unmatched["git_state"] is None

    def test_git_state_absent_when_no_contributor_git_state_reported(self):
        dev_token, dev_user_id = _register_and_login("developer")
        member_space = _create_space()

        db = SessionLocal()
        try:
            get_or_create_membership(db, uuid.UUID(dev_user_id), member_space.id)
        finally:
            db.close()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_token))

        repos = {r["technical_identifier"]: r for r in response.json()["repos"]}
        assert repos[member_space.technical_identifier]["git_state"] is None


class TestNoReposConnected:
    """NO_REPOS_CONNECTED matrix row."""

    def test_developer_without_membership_sees_empty_list(self):
        dev_token, _ = _register_and_login("developer")
        # Other spaces exist on the platform, but this user has no membership.
        _create_space()

        response = client.get("/hub/dashboard/repos", headers=_auth_headers(dev_token))

        assert response.status_code == 200
        assert response.json()["repos"] == []
