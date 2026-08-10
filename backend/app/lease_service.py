"""Lease management service for time-limited story claims (Story 3.1).

This module manages time-limited leases for story claims, ensuring exclusive,
temporary ownership without risking stale double-claims.
"""

import time
from dataclasses import dataclass, field
from typing import Optional
import uuid

# Lease duration in seconds (60 seconds heartbeat window)
LEASE_DURATION_SECONDS = 60


@dataclass
class Lease:
    """Represents a time-limited lease for story claiming."""

    story_id: str
    claimant_id: uuid.UUID
    issued_at: float = field(default_factory=time.monotonic)
    expires_at: float = field(init=False)
    heartbeat_interval: float = 60.0

    def __post_init__(self) -> None:
        """Calculate expires_at based on issued_at and lease duration."""
        self.expires_at = self.issued_at + self.heartbeat_interval

    def is_active(self) -> bool:
        """Check if the lease is currently active."""
        return time.monotonic() < self.expires_at

    def extend(self) -> None:
        """Extend the lease by the heartbeat interval."""
        self.expires_at = time.monotonic() + self.heartbeat_interval


class LeaseService:
    """Manages time-limited leases for story claims."""

    def __init__(self) -> None:
        self._leases: dict[str, Lease] = {}
        self._story_claims: dict[str, str] = {}  # story_id -> claimant_id

    def create_lease(self, story_id: str, claimant_id: uuid.UUID) -> Optional[Lease]:
        """Create a lease for a story if it's available (not claimed).

        Returns the new lease if successful, None if the story is already claimed.
        """
        # Check if story is already claimed
        if story_id in self._story_claims:
            existing_lease = self._leases.get(story_id)
            if existing_lease and existing_lease.is_active():
                # Story is already actively claimed
                return None

            # Check if existing lease has expired
            if existing_lease and not existing_lease.is_active():
                # Expire the old lease and allow new claim
                self._expire_lease(story_id)

        # If story is still claimed after cleanup, return None
        if story_id in self._story_claims:
            return None

        # Create new lease
        lease = Lease(story_id=story_id, claimant_id=claimant_id)
        self._leases[story_id] = lease
        self._story_claims[story_id] = str(claimant_id)

        return lease

    def extend_lease(self, story_id: str, claimant_id: uuid.UUID) -> bool:
        """Extend an existing lease for a story.

        Returns True if the lease was extended, False if no active lease exists.
        """
        lease = self._leases.get(story_id)
        if lease and lease.is_active() and str(lease.claimant_id) == str(claimant_id):
            lease.extend()
            return True
        return False

    def get_lease(self, story_id: str) -> Optional[Lease]:
        """Get the current lease for a story, or None if no active lease exists."""
        lease = self._leases.get(story_id)
        if lease and lease.is_active():
            return lease
        # Clean up expired leases
        if lease and not lease.is_active():
            self._expire_lease(story_id)
        return None

    def is_story_claimed(self, story_id: str) -> bool:
        """Check if a story is currently claimed (has an active lease)."""
        lease = self._leases.get(story_id)
        if lease and lease.is_active():
            return True
        # Clean up expired leases
        if lease and not lease.is_active():
            self._expire_lease(story_id)
        return story_id in self._story_claims and self._leases.get(story_id) is not None

    def get_claimant_id(self, story_id: str) -> Optional[uuid.UUID]:
        """Get the claimant ID for a claimed story, or None if not claimed."""
        lease = self.get_lease(story_id)
        if lease:
            return lease.claimant_id
        return None

    def _expire_lease(self, story_id: str) -> None:
        """Internal: expire and remove a lease."""
        self._leases.pop(story_id, None)
        if story_id in self._story_claims:
            del self._story_claims[story_id]

    def cleanup_expired_leases(self) -> list[str]:
        """Remove all expired leases and return the list of story_ids that were expired."""
        expired_stories = []
        for story_id, lease in list(self._leases.items()):
            if not lease.is_active():
                self._expire_lease(story_id)
                expired_stories.append(story_id)
        return expired_stories

    def get_all_active_lease_stories(self) -> list[str]:
        """Get all story_ids that currently have active leases."""
        return [
            story_id for story_id, lease in self._leases.items()
            if lease.is_active()
        ]
