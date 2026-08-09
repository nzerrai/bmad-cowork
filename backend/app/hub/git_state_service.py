"""Git state service for canonical state queries and staleness calculation (Story 2.5)."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.hub.git_state_models import ContributorGitState


# Staleness threshold in seconds (AD-008)
STALENESS_THRESHOLD_SECONDS = 30


def get_contributor_git_state(db: Session, user_id: UUID) -> dict | None:
    """Retrieve the canonical Git state for a contributor.

    Returns the state dictionary with staleness information.
    """
    git_state = db.query(ContributorGitState).filter(ContributorGitState.user_id == user_id).first()

    if not git_state:
        return None

    return _format_git_state_with_staleness(git_state)


def get_contributor_git_state_by_identifier(db: Session, technical_identifier: str) -> dict | None:
    """Retrieve the canonical Git state by technical identifier.

    Returns the state dictionary with staleness information.
    """
    # Note: ContributorGitState is keyed by user_id, but we can query by technical_identifier
    git_state = db.query(ContributorGitState).filter(
        ContributorGitState.technical_identifier == technical_identifier
    ).first()

    if not git_state:
        return None

    return _format_git_state_with_staleness(git_state)


def _format_git_state_with_staleness(git_state: ContributorGitState) -> dict:
    """Format Git state with staleness calculation.

    Implements AD-008: 30-second staleness threshold.
    Returns "Last known — {time}" when state is older than 30s.
    """
    now = datetime.now(timezone.utc)
    time_diff = (now - git_state.last_updated).total_seconds()

    is_stale = time_diff > STALENESS_THRESHOLD_SECONDS

    state_data = {
        "technical_identifier": git_state.technical_identifier,
        "branch": git_state.branch,
        "ahead": git_state.ahead,
        "behind": git_state.behind,
        "in_progress_action": git_state.in_progress_action or "none",
        "last_updated": git_state.last_updated.isoformat(),
        "is_stale": is_stale,
    }

    if is_stale:
        # Format the time difference for the "Last known" message
        seconds_ago = int(time_diff)
        state_data["status_message"] = f"Last known — {seconds_ago}s ago"

    return state_data


def is_contributor_active(db: Session, user_id: UUID) -> bool:
    """Check if a contributor's Git state is within the staleness threshold.

    Returns True if the state is fresh (within 30 seconds), False otherwise.
    """
    git_state = db.query(ContributorGitState).filter(ContributorGitState.user_id == user_id).first()

    if not git_state:
        return False

    now = datetime.now(timezone.utc)
    time_diff = (now - git_state.last_updated).total_seconds()

    return time_diff <= STALENESS_THRESHOLD_SECONDS
