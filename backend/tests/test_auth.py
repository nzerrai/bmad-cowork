"""I/O matrix tests for the auth/RBAC substrate (Story 0.2).

Runs against the same shared dev/CI PostgreSQL instance as
`test_migrations.py`. Each test registers its own unique-email users so tests
don't interfere with each other, and the `users` table is reset (via Alembic
downgrade/upgrade) once per test module for a clean slate.
"""

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from alembic import command
from app.auth.models import User
from app.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.db import SessionLocal, get_db
from app.main import app

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _reset_schema() -> None:
    """Guarantee a pristine `users` table before this module's assertions."""
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


def _unique_email() -> str:
    return f"{uuid.uuid4().hex}@example.com"


def _register(email: str, password: str, role: str):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": role},
    )


def _login(email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_new_user_returns_201_without_hashed_password() -> None:
    email = _unique_email()
    response = _register(email, "correct-horse", "developer")

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == email
    assert body["role"] == "developer"
    assert "hashed_password" not in body
    assert "password" not in body


def test_register_duplicate_email_returns_409_and_creates_no_user() -> None:
    email = _unique_email()
    first = _register(email, "correct-horse", "developer")
    assert first.status_code == 201

    second = _register(email, "another-password", "admin")
    assert second.status_code == 409

    # No new user created for the duplicate: login with the *second*
    # password must fail, the *first* must still succeed.
    assert _login(email, "another-password").status_code == 401
    assert _login(email, "correct-horse").status_code == 200


def test_login_valid_credentials_returns_bearer_token() -> None:
    email = _unique_email()
    _register(email, "correct-horse", "developer")

    response = _login(email, "correct-horse")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]


def test_login_unknown_email_returns_401() -> None:
    response = _login(_unique_email(), "whatever")
    assert response.status_code == 401
    # Generic message, no field hint — must not reveal *why* it failed
    # (distinguishing "no such user" from "wrong password" enables email
    # enumeration).
    assert response.json()["detail"] == "Invalid credentials"


def test_login_wrong_password_returns_401() -> None:
    email = _unique_email()
    _register(email, "correct-horse", "developer")

    response = _login(email, "wrong-password")

    assert response.status_code == 401


def test_protected_route_no_token_returns_401_no_body() -> None:
    response = client.get("/admin/ping")

    assert response.status_code == 401
    assert "user_id" not in response.json()


def test_protected_route_bad_token_returns_401_no_body() -> None:
    response = client.get(
        "/admin/ping", headers={"Authorization": "Bearer not-a-real-jwt"}
    )

    assert response.status_code == 401
    assert "user_id" not in response.json()


def test_protected_route_expired_token_returns_401_no_body() -> None:
    now = datetime.now(UTC)
    expired_token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "role": "admin",
            "iat": now - timedelta(minutes=120),
            "exp": now - timedelta(minutes=60),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    response = client.get(
        "/admin/ping", headers={"Authorization": f"Bearer {expired_token}"}
    )

    assert response.status_code == 401
    assert "user_id" not in response.json()


def test_role_gated_route_wrong_role_returns_403_no_admin_body() -> None:
    email = _unique_email()
    _register(email, "correct-horse", "developer")
    token = _login(email, "correct-horse").json()["access_token"]

    response = client.get("/admin/ping", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 403
    assert "user_id" not in response.json()


def test_role_gated_route_correct_role_returns_200() -> None:
    email = _unique_email()
    _register(email, "correct-horse", "admin")
    token = _login(email, "correct-horse").json()["access_token"]

    response = client.get("/admin/ping", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["status"] == "pong"


class _AlwaysMissQuery:
    """Fake `db.query(...)` chain whose `.filter(...).first()` always misses.

    Simulates `register()`'s pre-check SELECT running just *before* a
    concurrent duplicate registration commits — the pre-check can't see it.
    """

    def filter(self, *args: object, **kwargs: object) -> "_AlwaysMissQuery":
        return self

    def first(self) -> None:
        return None


class _RaceConditionSession:
    """Fake DB session: pre-check always misses, but `commit()` raises
    `IntegrityError` — simulating a concurrent duplicate that wins the race
    between `register()`'s SELECT and its own commit."""

    def query(self, *args: object, **kwargs: object) -> _AlwaysMissQuery:
        return _AlwaysMissQuery()

    def add(self, obj: object) -> None:
        pass

    def commit(self) -> None:
        raise IntegrityError(
            "INSERT INTO users ...", {}, Exception("duplicate key value violates unique constraint")
        )

    def rollback(self) -> None:
        pass

    def refresh(self, obj: object) -> None:
        pass


def test_register_duplicate_email_race_condition_returns_409() -> None:
    """Exercises `register()`'s `except IntegrityError` safety net directly:
    the commit-time race window a pre-check `SELECT` alone can't close."""
    app.dependency_overrides[get_db] = lambda: _RaceConditionSession()
    try:
        response = _register(_unique_email(), "correct-horse", "developer")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 409


def test_deleted_user_token_returns_401() -> None:
    """A token whose `sub` no longer maps to an existing user (deleted after
    issuance) must be rejected — `get_current_user` re-resolves the user on
    every request rather than trusting the token's claims alone."""
    email = _unique_email()
    _register(email, "correct-horse", "admin")
    token = _login(email, "correct-horse").json()["access_token"]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        db.delete(user)
        db.commit()
    finally:
        db.close()

    response = client.get("/admin/ping", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert "user_id" not in response.json()
