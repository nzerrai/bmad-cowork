"""WebSocket heartbeat handling for lease-based story claiming (Story 3.1).

This module implements heartbeat tracking to maintain client WebSocket heartbeat
and detect stoppage, ensuring leases are automatically expired when heartbeats
stop for more than 60 seconds.
"""

import time
import uuid

from app.lease_service import LeaseService
from app.realtime.manager import ConnectionManager


class WebSocketHandlers:
    """Handles WebSocket messages for lease-based story claiming."""

    def __init__(self, lease_service: LeaseService, connection_manager: ConnectionManager):
        self.lease_service = lease_service
        self.connection_manager = connection_manager

    def process_heartbeat(self, user_id: uuid.UUID, websocket) -> None:
        """Process a heartbeat message from a client.

        Updates the heartbeat timestamp and extends any active story leases
        for this user.
        """
        # Record heartbeat for connection tracking
        self.connection_manager.record_heartbeat(user_id, websocket)

        # Check if this user has any active story leases to extend
        # The actual lease extension is handled by the lease_service through
        # the story_state module when heartbeat messages are received
        # This method ensures the heartbeat timestamp is updated

    def process_lease_extend(self, story_id: str, user_id: uuid.UUID) -> bool:
        """Process a lease extension request for a specific story.

        Returns True if the lease was extended, False otherwise.
        """
        # Record claim event for connection tracking
        self.connection_manager.record_claim_event(user_id)
        return self.lease_service.extend_lease(story_id, user_id)

    def check_and_expire_stale_leases(self) -> list[str]:
        """Check for and expire any stale leases (heartbeat stopped for >60s).

        Returns the list of story_ids that were expired.
        """
        return self.lease_service.cleanup_expired_leases()

    def record_git_state_report(self, user_id: uuid.UUID, technical_identifier: str) -> None:
        """Record a git state report for connection tracking."""
        self.connection_manager.record_git_state_report(user_id, technical_identifier)

    def record_conflict_event(self, user_id: uuid.UUID) -> None:
        """Record a conflict event for connection tracking."""
        self.connection_manager.record_conflict_event(user_id)
