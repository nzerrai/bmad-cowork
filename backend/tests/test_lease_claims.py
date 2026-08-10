"""I/O matrix tests for lease-based story claiming (Story 3.1).

Tests for the lease-based story claiming system where:
- Backend issues a time-limited lease when a developer claims an available story
- Client maintains a WebSocket heartbeat to keep the lease alive
- If the heartbeat stops for more than 60 seconds, Backend automatically expires the lease
"""

import time
import uuid

import pytest

from app.lease_service import Lease, LeaseService
from app.story_state import StoryState


class TestLeaseService:
    """Tests for the LeaseService class."""

    def test_create_lease_succeeds_for_available_story(self):
        """HAPPY_PATH: User Story is available (unclaimed) -> Developer claims it, Backend issues a time-limited lease."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        lease = lease_service.create_lease(story_id, claimant_id)

        assert lease is not None
        assert lease.story_id == story_id
        assert lease.claimant_id == claimant_id
        assert lease.is_active() is True

    def test_create_lease_fails_for_already_claimed_story(self):
        """Prevent double-claiming: no two developers can claim the same story simultaneously."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id_1 = uuid.uuid4()
        claimant_id_2 = uuid.uuid4()

        # First claim succeeds
        lease1 = lease_service.create_lease(story_id, claimant_id_1)
        assert lease1 is not None

        # Second claim fails (double-claiming prevented)
        lease2 = lease_service.create_lease(story_id, claimant_id_2)
        assert lease2 is None

    def test_extend_lease_keeps_lease_active(self):
        """HEARTBEAT_ALIVE: Developer's WebSocket heartbeat is maintained -> Lease remains active, story stays Claimed."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        lease = lease_service.create_lease(story_id, claimant_id)
        assert lease is not None
        assert lease.is_active() is True

        # Extend the lease
        result = lease_service.extend_lease(story_id, claimant_id)
        assert result is True

        # Verify lease is still active with extended expiration
        extended_lease = lease_service.get_lease(story_id)
        assert extended_lease is not None
        assert extended_lease.is_active() is True

    def test_get_lease_returns_none_for_nonexistent_story(self):
        """Test that get_lease returns None for a story that has no lease."""
        lease_service = LeaseService()
        story_id = "story-999"

        lease = lease_service.get_lease(story_id)
        assert lease is None

    def test_get_claimant_id_returns_correct_id(self):
        """Test that get_claimant_id returns the correct claimant ID for a claimed story."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        lease_service.create_lease(story_id, claimant_id)

        result_id = lease_service.get_claimant_id(story_id)
        assert result_id == claimant_id

    def test_get_claimant_id_returns_none_for_unclaimed_story(self):
        """Test that get_claimant_id returns None for an unclaimed story."""
        lease_service = LeaseService()
        story_id = "story-999"

        result_id = lease_service.get_claimant_id(story_id)
        assert result_id is None

    def test_cleanup_expired_leases_removes_expired_stories(self):
        """Test that cleanup_expired_leases removes and returns expired stories."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        # Create a lease with a custom short duration for testing
        lease_service._leases[story_id] = Lease(
            story_id=story_id,
            claimant_id=claimant_id,
            issued_at=time.monotonic() - 100,  # Expired 100 seconds ago
            heartbeat_interval=60.0,
        )

        expired_stories = lease_service.cleanup_expired_leases()
        assert story_id in expired_stories

        # Verify lease is no longer active
        assert lease_service.get_lease(story_id) is None
        assert story_id not in lease_service._story_claims

    def test_is_story_claimed_returns_true_for_claimed_story(self):
        """Test that is_story_claimed returns True for a story with an active lease."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        lease_service.create_lease(story_id, claimant_id)

        assert lease_service.is_story_claimed(story_id) is True

    def test_is_story_claimed_returns_false_for_unclaimed_story(self):
        """Test that is_story_claimed returns False for an unclaimed story."""
        lease_service = LeaseService()
        story_id = "story-999"

        assert lease_service.is_story_claimed(story_id) is False

    def test_extend_lease_fails_for_wrong_claimant(self):
        """Test that extend_lease fails when the claimant doesn't match."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id_1 = uuid.uuid4()
        claimant_id_2 = uuid.uuid4()

        lease_service.create_lease(story_id, claimant_id_1)

        # Try to extend with wrong claimant
        result = lease_service.extend_lease(story_id, claimant_id_2)
        assert result is False


class TestStoryState:
    """Tests for the StoryState class."""

    def test_story_status_unclaimed_initially(self):
        """Test that a new story starts with 'unclaimed' status."""
        story_state = StoryState()
        story_id = "story-1"

        status = story_state.get_story_status(story_id)
        assert status == story_state.STATUS_UNCLAIMED

    def test_claim_story_marks_as_claimed_and_issues_lease(self):
        """Given a User Story is available (unclaimed), when a developer claims it, then the Backend issues a time-limited lease and marks the story as Claimed."""
        story_state = StoryState()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        lease = story_state.claim_story(story_id, claimant_id)

        assert lease is not None
        assert story_state.get_story_status(story_id) == story_state.STATUS_CLAIMED
        assert story_state.get_claimant_id(story_id) == claimant_id

    def test_extend_lease_keeps_lease_alive(self):
        """Given the lease is active, when the developer's Client maintains a WebSocket heartbeat, then the lease remains alive."""
        story_state = StoryState()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        # Claim the story
        story_state.claim_story(story_id, claimant_id)

        # Maintain heartbeat (extend lease)
        result = story_state.extend_lease(story_id, claimant_id)
        assert result is True

        # Verify lease is still active
        assert story_state.get_story_status(story_id) == story_state.STATUS_CLAIMED

    def test_lease_expiration_marks_story_available(self):
        """Given the lease is active, when the developer's heartbeat stops for more than 60 seconds, then the Backend automatically expires the lease and marks the story available again."""
        story_state = StoryState()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        # Claim the story
        story_state.claim_story(story_id, claimant_id)
        assert story_state.get_story_status(story_id) == story_state.STATUS_CLAIMED

        # Simulate expired lease by manually adding an expired lease
        import time
        from app.lease_service import Lease

        story_state._lease_service._leases[story_id] = Lease(
            story_id=story_id,
            claimant_id=claimant_id,
            issued_at=time.monotonic() - 100,  # Expired 100 seconds ago
            heartbeat_interval=60.0,
        )

        # Cleanup expired leases
        expired_stories = story_state.cleanup_expired_leases()
        assert story_id in expired_stories

        # Verify story is now unclaimed
        assert story_state.get_story_status(story_id) == story_state.STATUS_UNCLAIMED
        assert story_state.get_claimant_id(story_id) is None

    def test_get_all_claimed_stories_returns_only_claimed(self):
        """Test that get_all_claimed_stories returns only stories with active leases."""
        story_state = StoryState()
        story_id_1 = "story-1"
        story_id_2 = "story-2"
        claimant_id = uuid.uuid4()

        # Claim story 1
        story_state.claim_story(story_id_1, claimant_id)

        # Story 2 is not claimed

        claimed_stories = story_state.get_all_claimed_stories()
        assert story_id_1 in claimed_stories
        assert story_id_2 not in claimed_stories


class TestLeaseExpirationTimeout:
    """Tests for the 60-second lease expiration timeout."""

    def test_lease_expires_after_60_seconds(self):
        """Test that a lease expires automatically after 60 seconds of no heartbeat."""
        lease_service = LeaseService()
        story_id = "story-1"
        claimant_id = uuid.uuid4()

        # Create a lease
        lease = lease_service.create_lease(story_id, claimant_id)
        assert lease is not None
        assert lease.is_active() is True

        # Verify it's claimed
        assert lease_service.is_story_claimed(story_id) is True

        # Simulate time passing by adding an expired lease
        import time

        lease_service._leases[story_id] = Lease(
            story_id=story_id,
            claimant_id=claimant_id,
            issued_at=time.monotonic() - 70,  # Expired 70 seconds ago
            heartbeat_interval=60.0,
        )

        # Cleanup expired leases
        expired_stories = lease_service.cleanup_expired_leases()
        assert story_id in expired_stories

        # Verify lease is no longer active
        assert lease_service.get_lease(story_id) is None
        assert lease_service.is_story_claimed(story_id) is False
