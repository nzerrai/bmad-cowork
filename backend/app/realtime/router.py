"""`/ws` — the WebSocket Pillar's single connection endpoint (Story 2.1).

Auth travels as `?token=<jwt>` rather than a header: browsers cannot set
custom headers on a WebSocket handshake, so this is the only viable option
for the IHM side. The Python Client uses the same convention for uniformity.

Every message is a JSON object with a mandatory `"type"` discriminator field.
This story recognizes exactly one (`heartbeat`); any other/unknown `type`
(or a message missing `type` entirely) is ignored, not an error — the
envelope must stay forward-compatible with message types this story doesn't
know about yet.

**Accept before rejecting.** Every rejection path (`_FORBIDDEN_ORIGIN_CODE`,
`_UNAUTHORIZED_CODE`) calls `.accept()` immediately before its `.close(code=
...)`, rather than closing pre-accept. Confirmed empirically: an ASGI server
can only express a pre-accept `websocket.close(code=...)` to a real
(non-TestClient) client as a bare HTTP rejection of the handshake -
uvicorn's websockets implementation turns it into a generic `403 Forbidden`,
discarding the specific code entirely (`conn.reject(HTTPStatus.FORBIDDEN,
"")` in `websockets_sansio_impl.py`). A close sent *after* `.accept()` is a
normal WS close frame, which every real client (and browsers, for a
connection that reached the OPEN state) can inspect for the actual code.
`.accept()` is called separately on each path (not once, unconditionally,
at the top) - hoisting it above the checks changed the success path's
timing enough to deadlock two-connection presence broadcasts under
`TestClient` (each `websocket_connect()` runs its own thread/event loop; the
exact scheduling of when a connecting peer's `__enter__` unblocks relative
to `manager.connect()`/`broadcast()` running turned out to matter).
"""

import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import resolve_user_from_token
from app.config import IHM_ORIGIN
from app.db import SessionLocal
from app.hub import service as hub_service
from app.hub.models import HubStatus, Space
from app.realtime.manager import ConnectionManager

router = APIRouter()

manager = ConnectionManager()

_UNAUTHORIZED_CODE = 4401
_FORBIDDEN_ORIGIN_CODE = 4403


def _resolve_user_sync(token: str | None):
    """Runs in a threadpool: opens a session scoped to just this lookup,
    not the whole WebSocket connection's lifetime (unlike `Depends(get_db)`,
    whose generator only tears down once the endpoint returns)."""
    if not token:
        return None
    db = SessionLocal()
    try:
        return resolve_user_from_token(token, db)
    finally:
        db.close()


def _process_client_identity(technical_identifier: str, user_id: uuid.UUID):
    """Processes a client's identity report and creates/joins the space.

    Runs in a threadpool to avoid blocking the event loop.
    """
    import uuid as uuid_module

    db = SessionLocal()
    try:
        # Get or create the space
        space = hub_service.get_or_create_space(db, technical_identifier)

        # Check repo access to determine if status should be updated
        has_access = hub_service.check_repo_access(db, technical_identifier)
        if has_access and space.status == HubStatus.PENDING:
            space.status = HubStatus.ACTIVE
            db.commit()
            db.refresh(space)

        return {
            "space_id": str(space.id),
            "technical_identifier": space.technical_identifier,
            "short_name": space.short_name,
            "status": space.status.value,
        }
    finally:
        db.close()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin")
    if origin is not None and origin != IHM_ORIGIN:
        await websocket.accept()
        await websocket.close(code=_FORBIDDEN_ORIGIN_CODE)
        return

    token = websocket.query_params.get("token")
    # Off the event loop: this is a blocking DB call, and the event loop is
    # shared by every other connection's heartbeats/broadcasts.
    user = await run_in_threadpool(_resolve_user_sync, token)

    if user is None:
        await websocket.accept()
        await websocket.close(code=_UNAUTHORIZED_CODE)
        return

    await websocket.accept()
    await manager.connect(user.id, websocket)
    await manager.broadcast(
        {"type": "presence", "event": "connected", "user_id": str(user.id)},
        exclude=websocket,
    )

    try:
        while True:
            try:
                message = await websocket.receive_json()
            except ValueError:
                # Not valid JSON - stay forward-compatible by ignoring it,
                # same discipline as an unrecognized/missing "type".
                continue
            if isinstance(message, dict) and message.get("type") == "heartbeat":
                manager.record_heartbeat(user.id, websocket)
            elif isinstance(message, dict) and message.get("type") == "client_identity_report":
                technical_identifier = message.get("technical_identifier")
                if technical_identifier:
                    # Process identity report in threadpool to avoid blocking event loop
                    space_result = await run_in_threadpool(_process_client_identity, technical_identifier, user.id)
                    if space_result:
                        # Send space_joined response to client
                        await websocket.send_json({
                            "type": "space_joined",
                            "space_id": str(space_result["space_id"]),
                            "technical_identifier": space_result["technical_identifier"],
                            "short_name": space_result["short_name"],
                            "status": space_result["status"],
                        })
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user.id, websocket)
        await manager.broadcast(
            {"type": "presence", "event": "disconnected", "user_id": str(user.id)}
        )
