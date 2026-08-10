"""Story claim state management (Story 3.1).

This module tracks story status and lease ownership for the lease-based
story claiming system.
"""

import uuid
from typing import Optional

from app.lease_service import Lease, LeaseService


class StoryState:
    """Manages the state of story claims and their lease status."""

    # Story status constants
    STATUS_UNCLAIMED = "unclaimed"
    STATUS_CLAIMED = "claimed"

    def __init__(self) -> None:
        self._lease_service = LeaseService()
        # Track story status independently
        self._story_statuses: dict[str, str] = {}

    def get_story_status(self, story_id: str) -> str:
        """Get the current status of a story.

        Returns 'claimed' if the story has an active lease, 'unclaimed' otherwise.
        """
        if self._lease_service.is_story_claimed(story_id):
            self._story_statuses[story_id] = self.STATUS_CLAIMED
            return self.STATUS_CLAIMED
        else:
            self._story_statuses[story_id] = self.STATUS_UNCLAIMED
            return self.STATUS_UNCLAIMED

    def claim_story(self, story_id: str, claimant_id: uuid.UUID) -> Optional[Lease]:
        """Attempt to claim a story for a developer.

        Returns the lease if the claim is successful, None if the story is
        already claimed by someone else.
        """
        # Ensure the story is tracked
        if story_id not in self._story_statuses:
            self._story_statuses[story_id] = self.STATUS_UNCLAIMED

        # Attempt to create a lease
        lease = self._lease_service.create_lease(story_id, claimant_id)

        if lease:
            self._story_statuses[story_id] = self.STATUS_CLAIMED

        return lease

    def extend_lease(self, story_id: str, claimant_id: uuid.UUID) -> bool:
        """Extend an existing lease for a story.

        Returns True if the lease was extended, False if no active lease exists
        or the claimant doesn't match.
        """
        return self._lease_service.extend_lease(story_id, claimant_id)

    def get_lease(self, story_id: str) -> Optional[Lease]:
        """Get the current lease for a story, or None if no active lease exists."""
        return self._lease_service.get_lease(story_id)

    def get_claimant_id(self, story_id: str) -> Optional[uuid.UUID]:
        """Get the claimant ID for a claimed story, or None if not claimed."""
        return self._lease_service.get_claimant_id(story_id)

    def cleanup_expired_leases(self) -> list[str]:
        """Expire all expired leases and return the list of story_ids that were expired."""
        expired_stories = self._lease_service.cleanup_expired_leases()

        # Update story statuses for expired leases
        for story_id in expired_stories:
            self._story_statuses[story_id] = self.STATUS_UNCLAIMED

        return expired_stories

    def get_all_claimed_stories(self) -> list[str]:
        """Get all story_ids that are currently claimed."""
        return self._lease_service.get_all_active_lease_stories()
