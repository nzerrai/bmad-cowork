"""I/O matrix tests for the WebSocket Pillar (Story 2.1, AC1-AC2).

Same module conventions as `test_auth.py`/`test_artifact_health.py`
(module-scoped Alembic reset, `TestClient(app)`). Runs against the same
shared dev/CI PostgreSQL instance.
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock

import jwt
import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketDisconnect

from alembic import command
from app.config import JWT_ALGORITHM, JWT_SECRET_KEY
from app.main import app
from app.realtime import router as router_module
from app.realtime.manager import ConnectionManager

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _reset_schema() -> None:
    """Guarantee a pristine slate once before this module's assertions."""
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


_user_counter = 0


def _register_and_login() -> tuple[str, str]:
    """Register + log in a fresh user, return (bare token, user id)."""
    global _user_counter
    _user_counter += 1
    email = f"realtime-test-{_user_counter}@example.com"
    password = "correct-horse"
    client.post(
        "/auth/register",
        json={"email": email, "password": password, "role": "developer"},
    )
    token = client.post(
        "/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]
    user_id = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])["sub"]
    return token, user_id


def test_connect_with_valid_token_succeeds() -> None:
    token, _ = _register_and_login()
    with client.websocket_connect(f"/ws?token={token}"):
        pass


def test_connect_without_token_closes_4401() -> None:
    # `.accept()` runs first (so a real client can see the specific close
    # code - see router.py's module docstring), so entering the `with`
    # block succeeds; the rejection surfaces as a close frame on the first
    # receive, not as an exception on connect.
    with client.websocket_connect("/ws") as ws:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            ws.receive_json()
    assert exc_info.value.code == 4401


def test_connect_with_malformed_token_closes_4401() -> None:
    with client.websocket_connect("/ws?token=not-a-real-jwt") as ws:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            ws.receive_json()
    assert exc_info.value.code == 4401


def test_connect_with_expired_token_closes_4401() -> None:
    now = datetime.now(UTC)
    expired_token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "role": "developer",
            "iat": now - timedelta(minutes=120),
            "exp": now - timedelta(minutes=60),
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )

    with client.websocket_connect(f"/ws?token={expired_token}") as ws:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            ws.receive_json()
    assert exc_info.value.code == 4401


def test_connect_with_mismatched_origin_closes_4403() -> None:
    token, _ = _register_and_login()

    with client.websocket_connect(
        f"/ws?token={token}", headers={"Origin": "https://evil.example"}
    ) as ws:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            ws.receive_json()
    assert exc_info.value.code == 4403


def test_connect_with_no_origin_header_succeeds() -> None:
    """Simulates the Python Client agent, which isn't a browser."""
    token, _ = _register_and_login()
    with client.websocket_connect(f"/ws?token={token}"):
        pass


def test_two_connection_presence_broadcast() -> None:
    token_a, user_a_id = _register_and_login()
    token_b, user_b_id = _register_and_login()

    with client.websocket_connect(f"/ws?token={token_a}") as ws_a:
        with client.websocket_connect(f"/ws?token={token_b}"):
            # A observes B's connection - and it is about B, not itself.
            connected_message = ws_a.receive_json()
            assert connected_message == {
                "type": "presence",
                "event": "connected",
                "user_id": user_b_id,
            }

        disconnected_message = ws_a.receive_json()
        assert disconnected_message == {
            "type": "presence",
            "event": "disconnected",
            "user_id": user_b_id,
        }


def test_connection_manager_broadcast_excludes_specified_connection() -> None:
    """Unit-level proof of the `exclude=websocket` guarantee `websocket_endpoint`
    relies on to keep a newly-connecting client from observing its own presence
    event - exercised directly against `ConnectionManager` (like the dead-connection
    test below) rather than through two real `TestClient` WebSocket sessions, each
    of which runs on its own thread/event loop and isn't a safe way to assert
    "no message was ever delivered" without an arbitrary wait."""
    manager = ConnectionManager()
    user_id = uuid.uuid4()

    class _FakeWebSocket:
        def __init__(self) -> None:
            self.sent: list[dict] = []

        async def send_json(self, message: dict) -> None:
            self.sent.append(message)

    excluded = _FakeWebSocket()
    other = _FakeWebSocket()

    async def _run() -> None:
        await manager.connect(user_id, excluded)
        await manager.connect(user_id, other)
        await manager.broadcast(
            {"type": "presence", "event": "connected", "user_id": str(user_id)},
            exclude=excluded,
        )

    asyncio.run(_run())

    assert excluded.sent == []
    assert other.sent == [{"type": "presence", "event": "connected", "user_id": str(user_id)}]


def test_heartbeat_message_does_not_broadcast(monkeypatch) -> None:
    token_a, _ = _register_and_login()
    token_b, _ = _register_and_login()

    recorded_heartbeats = []
    monkeypatch.setattr(
        router_module.manager,
        "record_heartbeat",
        lambda user_id, websocket: recorded_heartbeats.append(user_id),
    )

    with client.websocket_connect(f"/ws?token={token_a}") as ws_a:
        with client.websocket_connect(f"/ws?token={token_b}") as ws_b:
            # Drain B's own connect presence event out of A's queue first.
            ws_a.receive_json()

            ws_b.send_json({"type": "heartbeat"})

            # The next thing A observes is B's disconnect, not a heartbeat
            # broadcast - proving heartbeats are silent bookkeeping.
        disconnect_message = ws_a.receive_json()
        assert disconnect_message["event"] == "disconnected"

    assert len(recorded_heartbeats) == 1


def test_unknown_and_missing_type_messages_do_not_crash_connection() -> None:
    token, _ = _register_and_login()

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "not-a-real-type"})
        ws.send_json({"no_type_key": True})
        # Connection must still be usable after ignoring both.
        ws.send_json({"type": "heartbeat"})


def test_client_identity_report_returns_space_joined(monkeypatch) -> None:
    """`client_identity_report` -> `_process_client_identity` now depends on
    real `git`/network access via `check_repo_access` (Story 6.1 revision:
    see spec-6-1-...-2.md) -- mock it so this stays deterministic and
    offline while still exercising the WebSocket -> threadpool -> service
    wiring end to end."""
    token, _ = _register_and_login()
    identifier = f"https://github.com/org/repo-{uuid.uuid4().hex}.git"

    monkeypatch.setattr(router_module.hub_service, "check_repo_access", lambda db, ident: True)

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "client_identity_report", "technical_identifier": identifier})
        response = ws.receive_json()

    assert response["type"] == "space_joined"
    assert response["technical_identifier"] == identifier
    assert response["status"] == "active"


def test_client_identity_report_rejects_malicious_identifier(monkeypatch) -> None:
    """Security regression: a crafted identifier (git's `ext::` remote-
    helper syntax, which can execute an arbitrary command) must never reach
    a real subprocess via this path, even from an authenticated WebSocket
    client -- unlike the admin `POST /hub/admin/repos` endpoint, this path
    never called `is_valid_technical_identifier` before handing the client-
    supplied identifier to `check_repo_access`. The fix moved that format
    validation *inside* `check_repo_access` itself, so every caller is
    protected at the one choke point, not just the admin endpoint."""
    token, _ = _register_and_login()
    malicious_identifier = f"ext::sh -c touch /tmp/pwned-via-ws-{uuid.uuid4().hex}"

    mock_run = MagicMock()
    monkeypatch.setattr(router_module.hub_service.subprocess, "run", mock_run)

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json(
            {"type": "client_identity_report", "technical_identifier": malicious_identifier}
        )
        response = ws.receive_json()

    assert response["type"] == "space_joined"
    assert response["status"] == "pending"
    mock_run.assert_not_called()


def test_client_identity_report_no_membership_when_access_denied(monkeypatch) -> None:
    """Authorization regression: a `client_identity_report` for a repo the
    reporting user has no real access to (`check_repo_access` returns
    False) must NOT create a `SpaceMembership` -- otherwise any
    authenticated user could report an arbitrary existing repo's
    `technical_identifier` and permanently gain visibility into it on
    `GET /hub/dashboard/repos` (short_name, status, origin, has_credential),
    without ever actually having access. The `Space` itself may still be
    created/looked-up (unauthenticated discovery is unrelated to this
    user's membership), but the membership join is gated on `has_access`."""
    token, user_id = _register_and_login()
    identifier = f"https://github.com/org/repo-{uuid.uuid4().hex}.git"

    monkeypatch.setattr(router_module.hub_service, "check_repo_access", lambda db, ident: False)

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "client_identity_report", "technical_identifier": identifier})
        response = ws.receive_json()

    assert response["type"] == "space_joined"
    assert response["status"] == "pending"

    from app.db import SessionLocal
    from app.hub.models import Space, SpaceMembership

    db = SessionLocal()
    try:
        space = db.query(Space).filter(Space.technical_identifier == identifier).first()
        assert space is not None
        membership = (
            db.query(SpaceMembership)
            .filter(
                SpaceMembership.user_id == uuid.UUID(user_id),
                SpaceMembership.space_id == space.id,
            )
            .first()
        )
        assert membership is None
    finally:
        db.close()


def test_client_identity_report_creates_membership(monkeypatch) -> None:
    """MEMBERSHIP_ON_IDENTITY matrix row (spec: dashboard-user-scoped-repos-list):
    `_process_client_identity` establishes a `SpaceMembership(user_id,
    space_id)` for the connected user, right after `get_or_create_space`
    resolves the reported identity's `Space`."""
    from app.db import SessionLocal
    from app.hub.models import Space, SpaceMembership

    token, user_id = _register_and_login()
    identifier = f"https://github.com/org/repo-{uuid.uuid4().hex}.git"

    monkeypatch.setattr(router_module.hub_service, "check_repo_access", lambda db, ident: True)

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "client_identity_report", "technical_identifier": identifier})
        ws.receive_json()

    db = SessionLocal()
    try:
        space = db.query(Space).filter(Space.technical_identifier == identifier).first()
        assert space is not None
        membership = (
            db.query(SpaceMembership)
            .filter(
                SpaceMembership.user_id == uuid.UUID(user_id),
                SpaceMembership.space_id == space.id,
            )
            .first()
        )
        assert membership is not None
    finally:
        db.close()


def test_client_identity_report_membership_is_idempotent(monkeypatch) -> None:
    """A repeat identity report for the same (user, repo) pair must not
    create a second `SpaceMembership` row -- the unique constraint plus
    `get_or_create_membership`'s upsert keep this idempotent."""
    from app.db import SessionLocal
    from app.hub.models import Space, SpaceMembership

    token, user_id = _register_and_login()
    identifier = f"https://github.com/org/repo-{uuid.uuid4().hex}.git"

    monkeypatch.setattr(router_module.hub_service, "check_repo_access", lambda db, ident: True)

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "client_identity_report", "technical_identifier": identifier})
        ws.receive_json()

    with client.websocket_connect(f"/ws?token={token}") as ws:
        ws.send_json({"type": "client_identity_report", "technical_identifier": identifier})
        ws.receive_json()

    db = SessionLocal()
    try:
        space = db.query(Space).filter(Space.technical_identifier == identifier).first()
        memberships = (
            db.query(SpaceMembership)
            .filter(
                SpaceMembership.user_id == uuid.UUID(user_id),
                SpaceMembership.space_id == space.id,
            )
            .all()
        )
        assert len(memberships) == 1
    finally:
        db.close()


def test_connection_manager_broadcast_skips_dead_connection() -> None:
    manager = ConnectionManager()
    user_id = uuid.uuid4()

    class _FakeWebSocket:
        def __init__(self, *, fails: bool) -> None:
            self.fails = fails
            self.sent: list[dict] = []

        async def send_json(self, message: dict) -> None:
            if self.fails:
                raise RuntimeError("connection is dead")
            self.sent.append(message)

    dead = _FakeWebSocket(fails=True)
    alive = _FakeWebSocket(fails=False)

    async def _run() -> None:
        await manager.connect(user_id, dead)
        await manager.connect(user_id, alive)
        await manager.broadcast({"type": "presence", "event": "connected"})

    asyncio.run(_run())

    assert alive.sent == [{"type": "presence", "event": "connected"}]
