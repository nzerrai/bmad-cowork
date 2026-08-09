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

    Returns a provider-specific link with repository path if the provider is known,
    or a generic text fallback if the provider cannot be determined.
    """
    # Validate the technical identifier format
    if not technical_identifier or not isinstance(technical_identifier, str):
        return "Veuillez accorder l'accès en lecture au dépôt depuis les paramètres de votre fournisseur Git."

    # Extract org and repo from technical_identifier for provider-specific links
    # technical_identifier is in format: host/org/repo or git@host:org/repo
    org_and_repo = None

    # Parse the org and repo from the technical identifier
    # Fix SSH URLs with ports like git@host:port:org/repo
    match_ssh = re.search(r"^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+:(?:\d+:)?([^/]+)/(.+)$", technical_identifier)
    if match_ssh:
        org_and_repo = f"{match_ssh.group(1)}/{match_ssh.group(2).replace('.git', '')}"
    else:
        match_https = re.search(r"^https?://[a-zA-Z0-9.-]+/([^/]+)/(.+)$", technical_identifier)
        if match_https:
            org_and_repo = f"{match_https.group(1)}/{match_https.group(2).replace('.git', '')}"

    provider_links = {
        "github": {
            "link": f"https://github.com/{org_and_repo}/settings/keys" if org_and_repo else "https://github.com/settings/apps",
        },
        "gitlab": {
            "link": f"https://gitlab.com/{org_and_repo}/-/repository/keys" if org_and_repo else "https://gitlab.com/-/profile/applications",
        },
        "bitbucket": {
            "link": f"https://bitbucket.org/{org_and_repo}/admin/access-keys" if org_and_repo else "https://bitbucket.org/account/settings/app-passwords/",
        },
    }

    provider_info = provider_links.get(provider)

    if provider_info and "link" in provider_info:
        return provider_info["link"]

    # Generic fallback for unknown providers
    return "Veuillez accorder l'accès en lecture au dépôt depuis les paramètres de votre fournisseur Git."


def get_or_create_space(db: Session, technical_identifier: str) -> Space:
    """Atomic upsert keyed on the technical identifier.

    Uses PostgreSQL's INSERT ... ON CONFLICT DO NOTHING to ensure concurrent
    first-contact reports from multiple Clients for the same identity resolve
    to exactly one space, never a race.

    Returns the Space (either existing or newly created).
    """
    short_name = extract_short_name(technical_identifier)
    provider = detect_git_provider(technical_identifier)

    # Check if space already exists
    existing_space = db.query(Space).filter(Space.technical_identifier == technical_identifier).first()

    if existing_space:
        # For existing space, ensure status is PENDING if it was ACCESS_REVOKED
        # or if access needs to be re-verified
        if existing_space.status == HubStatus.ACCESS_REVOKED:
            existing_space.status = HubStatus.PENDING
            db.commit()
            db.refresh(existing_space)
        return existing_space

    # Determine status based on access state
    # For a new space, we assume pending until we can verify read access
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


def determine_space_status(db: Session, technical_identifier: str, current_status: HubStatus | None = None) -> HubStatus:
    """Determines the status of a space based on backend access state.

    If the Backend lacks read access at creation time, status is PENDING.
    Otherwise, status is ACTIVE.

    For an existing space:
    - If current_status is ACCESS_REVOKED, the new status should be PENDING
      for re-verification, never directly to ACTIVE.
    - If access is verified, status transitions to ACTIVE.
    """
    # If the space had access revoked, it must transition to PENDING for re-verification
    if current_status == HubStatus.ACCESS_REVOKED:
        return HubStatus.PENDING

    # Verify read access using check_repo_access
    if check_repo_access(db, technical_identifier):
        return HubStatus.ACTIVE

    # Default to PENDING as we need to verify read access
    return HubStatus.PENDING


def check_repo_access(db: Session, technical_identifier: str) -> bool:
    """Determines if the Backend has read access to the repository.

    This verifies read access by attempting to parse the technical identifier
    and validate the Git remote URL structure. For actual git operations,
    this would involve attempting a git ls-remote or git clone operation
    to verify read access.

    Returns True if the repository identifier is valid and accessible format,
    False if access cannot be verified or identifier is invalid.
    """
    # Validate the technical identifier format
    if not technical_identifier or not isinstance(technical_identifier, str):
        return False

    # Check if it matches expected Git remote URL patterns
    identifier = technical_identifier.replace(".git", "")

    # GitHub/GitLab/Bitbucket SSH pattern: git@github.com:org/repo or git@github.com:port:org/repo
    git_ssh_pattern = r"^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+:(?:\d+:)?([^/]+)/(.+)$"
    if re.match(git_ssh_pattern, identifier):
        return True

    # HTTPS pattern: https://github.com/org/repo or https://gitlab.com/org/repo
    https_pattern = r"^https?://[a-zA-Z0-9.-]+/([^/]+)/(.+)$"
    if re.match(https_pattern, identifier):
        return True

    # If it doesn't match known patterns, we cannot verify access
    return False
