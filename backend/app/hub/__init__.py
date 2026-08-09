"""Hub (Space) module for zero-setup onboarding and application identity."""

from app.hub.git_state_models import ContributorGitState
from app.hub.git_state_service import (
    get_contributor_git_state,
    get_contributor_git_state_by_identifier,
    is_contributor_active,
)
from app.hub.models import HubStatus, Space
from app.hub.service import (
    check_repo_access,
    detect_git_provider,
    generate_access_grant_link,
    get_or_create_space,
)

__all__ = [
    "ContributorGitState",
    "HubStatus",
    "Space",
    "check_repo_access",
    "detect_git_provider",
    "generate_access_grant_link",
    "get_contributor_git_state",
    "get_contributor_git_state_by_identifier",
    "get_or_create_space",
    "is_contributor_active",
]
