"""Space provisioning service for zero-setup onboarding and application identity."""

import re
from urllib.parse import urlparse

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.hub.models import HubStatus, Space


def extract_short_name(technical_identifier: str) -> str:
    """Derives the display short name from the full remote path.

    Examples:
        - `git@github.com:org/repo.git` → `repo`
        - `https://github.com/org/repo.git` → `repo`
        - `git@gitlab.com:group/project.git` → `project`
    """
    # Remove .git suffix if present
    identifier = technical_identifier.replace(".git", "")

    # Match git@github.com:org/repo or git@gitlab.com:group/project
    git_ssh_pattern = r"^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+:([^/]+)/(.+)$"
    match_ssh = re.match(git_ssh_pattern, identifier)
    if match_ssh:
        org_or_user = match_ssh.group(1)
        repo_part = match_ssh.group(2)
        # Extract repo name from path
        repo_match = re.search(r"([^/]+)$", repo_part)
        if repo_match:
            return repo_match.group(1)

    # Match https://github.com/org/repo or https://gitlab.com/group/project
    https_pattern = r"^https?://[a-zA-Z0-9.-]+/([^/]+)/(.+)$"
    match_https = re.match(https_pattern, identifier)
    if match_https:
        org_or_user = match_https.group(1)
        repo_part = match_https.group(2)
        # Extract repo name from path
        repo_match = re.search(r"([^/]+)$", repo_part)
        if repo_match:
            return repo_match.group(1)

    # Fallback: try to extract the last path component
    fallback_match = re.search(r"([^/\\]+)$", identifier)
    if fallback_match:
        return fallback_match.group(1)

    return "unknown_repo"


def detect_git_provider(technical_identifier: str) -> str:
    """Determines the Git provider from the technical identifier.

    Returns: 'github', 'gitlab', 'bitbucket', or 'unknown'
    """
    identifier_lower = technical_identifier.lower()

    # GitHub detection
    if "github.com" in identifier_lower or "git@github.com:" in identifier_lower:
        return "github"

    # GitLab detection
    if "gitlab.com" in identifier_lower or identifier_lower.startswith("git@gitlab:"):
        return "gitlab"

    # Generic GitLab self-hosted detection
    if "gitlab." in identifier_lower:
        return "gitlab"

    # Bitbucket detection
    if "bitbucket.org" in identifier_lower or "bitbucket:" in identifier_lower:
        return "bitbucket"

    # Generic Bitbucket self-hosted detection
    if "bitbucket." in identifier_lower:
        return "bitbucket"

    return "unknown"


def generate_access_grant_link(provider: str, technical_identifier: str) -> str:
    """Generates a provider-scoped access-grant link for a pending space.

    Returns a generic text fallback if the provider cannot be determined.
    """
    provider_links = {
        "github": "https://github.com/settings/apps",
        "gitlab": "https://gitlab.com/-/profile/applications",
        "bitbucket": "https://bitbucket.org/account/settings/app-passwords/",
    }

    provider_name = {
        "github": "GitHub",
        "gitlab": "GitLab",
        "bitbucket": "Bitbucket",
    }.get(provider, "Git provider")

    link = provider_links.get(provider)

    if link:
        return f"Accordez l'accès en lecture au dépôt sur {provider_name} : {link}"

    return f"Accordez l'accès en lecture au dépôt auprès de votre fournisseur Git ({provider_name})."


def get_or_create_space(db: Session, technical_identifier: str) -> Space:
    """Atomic upsert keyed on the technical identifier.

    Uses PostgreSQL's INSERT ... ON CONFLICT DO NOTHING to ensure concurrent
    first-contact reports from multiple Clients for the same identity resolve
    to exactly one space, never a race.

    Returns the Space (either existing or newly created).
    """
    short_name = extract_short_name(technical_identifier)
    provider = detect_git_provider(technical_identifier)

    # Determine status based on access state
    # For now, we assume pending until we can verify read access
    # The check_repo_access function would be implemented based on the actual
    # access verification mechanism
    status = determine_space_status(db, technical_identifier)

    # Use PostgreSQL's INSERT ... ON CONFLICT DO UPDATE for atomic upsert
    stmt = insert(Space).values(
        technical_identifier=technical_identifier,
        short_name=short_name,
        status=status,
    )

    # On conflict, do nothing (we want to preserve the existing space)
    # This ensures concurrent first-contact reports resolve to exactly one space
    stmt = stmt.on_conflict_do_nothing(
        index_elements=["technical_identifier"]
    )

    db.execute(stmt)
    db.commit()

    # Fetch the space (it should exist after the upsert or conflict)
    space = db.query(Space).filter(Space.technical_identifier == technical_identifier).first()

    if space is None:
        # Fallback: create new space if not found after upsert
        space = Space(
            technical_identifier=technical_identifier,
            short_name=short_name,
            status=status,
        )
        db.add(space)
        db.commit()
        db.refresh(space)

    return space


def determine_space_status(db: Session, technical_identifier: str) -> HubStatus:
    """Determines the status of a space based on backend access state.

    If the Backend lacks read access at creation time, status is PENDING.
    Otherwise, status is ACTIVE.
    """
    # For now, default to PENDING as we need to verify read access
    # The actual access verification would involve checking if the backend
    # can successfully clone/pull from the repository
    return HubStatus.PENDING


def check_repo_access(db: Session, technical_identifier: str) -> bool:
    """Determines if the Backend has read access to the repository.

    This would typically involve attempting a git ls-remote or git clone operation
    to verify read access. For now, returns True to allow status transition to ACTIVE
    after initial space creation, with actual access verification to be implemented later.
    """
    # Placeholder implementation - would verify actual read access
    # by attempting to list remote refs or perform a shallow clone
    # For now, assume access is granted to allow space status transition
    return True
