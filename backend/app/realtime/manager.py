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
from collections import defaultdict
from typing import Optional

from fastapi import WebSocket


class ConnectionManager:
    """Tracks open WebSocket connections per user, in memory only."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = {}
        self._last_heartbeat: dict[WebSocket, float] = {}
        # Connection tracking for connected users stats (US 6.3)
        self._user_connections: dict[uuid.UUID, dict] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Register an already-accepted connection for `user_id`."""
        self._connections.setdefault(user_id, set()).add(websocket)
        # Initialize connection tracking for this user
        if user_id not in self._user_connections:
            self._user_connections[user_id] = {
                'user_id': str(user_id),
                'repository': None,
                'heartbeat_count': 0,
                'claim_events': 0,
                'sync_events': 0,
                'conflict_events': 0,
                'connection_source': 'websocket',
            }

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        """Deregister a connection; drop the `user_id` key once its set is empty."""
        connections = self._connections.get(user_id)
        if connections is not None:
            connections.discard(websocket)
            if not connections:
                del self._connections[user_id]
                # Clean up tracking data when no connections remain
                self._user_connections.pop(user_id, None)
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
        # Increment heartbeat count for connected users stats
        if user_id in self._user_connections:
            self._user_connections[user_id]['heartbeat_count'] += 1

    def record_git_state_report(self, user_id: uuid.UUID, technical_identifier: str) -> None:
        """Record a git state report and update the user's repository."""
        # Initialize tracking if user is not already tracked (HTTP REST connection)
        if user_id not in self._user_connections:
            self._user_connections[user_id] = {
                'user_id': str(user_id),
                'repository': None,
                'heartbeat_count': 0,
                'claim_events': 0,
                'sync_events': 0,
                'conflict_events': 0,
                'connection_source': 'http_rest',
            }

        if user_id in self._user_connections:
            self._user_connections[user_id]['repository'] = technical_identifier
            self._user_connections[user_id]['sync_events'] += 1
            # Track HTTP REST connection source (VS Code extension)
            if self._user_connections[user_id]['connection_source'] != 'http_rest':
                self._user_connections[user_id]['connection_source'] = 'http_rest'

    def record_claim_event(self, user_id: uuid.UUID) -> None:
        """Record a claim event for the user."""
        if user_id in self._user_connections:
            self._user_connections[user_id]['claim_events'] += 1

    def record_conflict_event(self, user_id: uuid.UUID) -> None:
        """Record a conflict event for the user."""
        if user_id in self._user_connections:
            self._user_connections[user_id]['conflict_events'] += 1

    def get_connected_users_stats(self) -> list[dict]:
        """Get connected users statistics sorted by repository with request counts by type."""
        stats = []
        for user_data in self._user_connections.values():
            total_requests = (
                user_data['heartbeat_count'] +
                user_data['claim_events'] +
                user_data['sync_events'] +
                user_data['conflict_events']
            )
            stats.append({
                'user_id': user_data['user_id'],
                'user_email': 'unknown',  # Email is not available in the connection manager
                'repository': user_data['repository'] or 'unknown',
                'heartbeat_count': user_data['heartbeat_count'],
                'claim_events': user_data['claim_events'],
                'sync_events': user_data['sync_events'],
                'conflict_events': user_data['conflict_events'],
                'total_requests': total_requests,
                'connection_source': user_data.get('connection_source', 'unknown'),
            })

        # Sort by repository
        stats.sort(key=lambda x: x['repository'])
        return stats
