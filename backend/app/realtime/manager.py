"""In-memory WebSocket connection registry (Story 2.1).

**Known, disclosed limitation:** this registry is a plain in-process Python
object. It does not survive a Backend restart and does not work across
multiple uvicorn workers/processes — every connection must land on the same
worker to see each other's broadcasts. Fine for this MVP's single-worker
local/dev topology; revisit if/when multi-worker deployment is ever adopted
(would need a shared pub/sub backend, e.g. Redis — out of scope here).

No DB table, no Alembic migration: presence/lease state is Epic 3's
(AD-002/AD-009) scope, not this story's.
"""

import time
import uuid

from fastapi import WebSocket


class ConnectionManager:
    """Tracks open WebSocket connections per user, in memory only."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = {}
        self._last_heartbeat: dict[WebSocket, float] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Register an already-accepted connection for `user_id`."""
        self._connections.setdefault(user_id, set()).add(websocket)

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Deregister a connection; drop the `user_id` key once its set is empty."""
        connections = self._connections.get(user_id)
        if connections is not None:
            connections.discard(websocket)
            if not connections:
                del self._connections[user_id]
        self._last_heartbeat.pop(websocket, None)

    async def broadcast(self, message: dict, *, exclude: WebSocket | None = None) -> None:
        """Send `message` to every registered connection except `exclude`.

        A `send` failure on one dead connection must not abort the loop for
        the rest — same "one bad row doesn't kill the whole run" discipline
        `scanner.py` already uses for indexing. Iterates over a snapshot: an
        `await`ed `send_json` yields control, and a concurrent `disconnect()`
        mutating `self._connections` mid-iteration would otherwise raise
        `RuntimeError: ... changed size during iteration`.
        """
        targets = [
            (user_id, websocket)
            for user_id, connections in self._connections.items()
            for websocket in connections
            if websocket is not exclude
        ]
        for user_id, websocket in targets:
            try:
                await websocket.send_json(message)
            except Exception:  # noqa: BLE001 - one dead peer must not abort the rest
                await self.disconnect(user_id, websocket)

    def record_heartbeat(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Bookkeeping only: store the last heartbeat's monotonic timestamp.

        Do not implement any expiry/timeout action on this — nothing consumes
        staleness yet (AD-002's 60s lease-expiry action belongs to Story 3.1,
        which will read this bookkeeping once leases exist).
        """
        self._last_heartbeat[websocket] = time.monotonic()
