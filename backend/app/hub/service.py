"""Space provisioning service for zero-setup onboarding and application identity."""

import os
import re
import stat
import subprocess
import tempfile
import uuid
from urllib.parse import urlparse

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.hub.credentials import InvalidToken, decrypt_credential
from app.hub.models import HubStatus, Space, SpaceMembership

# `git ls-remote` timeout, per Design Notes ("a few-second timeout") -- long
# enough for a real remote round-trip, short enough not to stall the
# threadpool worker on an unreachable host.
_GIT_LS_REMOTE_TIMEOUT_SECONDS = 6


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


def is_valid_technical_identifier(technical_identifier: str) -> bool:
    """Format-validates a technical identifier (Git remote URL) shape only --
    `git@host:org/repo` (SSH) or `https://host/org/repo` (HTTPS). Does not
    verify reachability; that's `check_repo_access`'s job. Used to reject a
    malformed URL with 400 before a `Space` is even created (ADMIN_ADD_MANUAL_REPO).
    """
    if not technical_identifier or not isinstance(technical_identifier, str):
        return False

    identifier = technical_identifier.replace(".git", "")

    git_ssh_pattern = r"^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+:(?:\d+:)?([^/]+)/(.+)$"
    if re.match(git_ssh_pattern, identifier):
        return True

    https_pattern = r"^https?://[a-zA-Z0-9.-]+/([^/]+)/(.+)$"
    if re.match(https_pattern, identifier):
        return True

    return False


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


def get_or_create_space(
    db: Session, technical_identifier: str, origin: str = "discovered"
) -> Space:
    """Atomic upsert keyed on the technical identifier.

    Uses PostgreSQL's INSERT ... ON CONFLICT DO NOTHING to ensure concurrent
    first-contact reports from multiple Clients for the same identity resolve
    to exactly one space, never a race.

    `origin` distinguishes a Client-discovered space (default, Epic 2
    zero-setup onboarding) from one an Admin adds manually (`"manual"`) --
    both live in the same `Space` table, never a second identity scheme.
    Ignored if the space already exists (its original origin is preserved).

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
        origin=origin,
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
            origin=origin,
        )
        db.add(space)
        db.commit()
        db.refresh(space)

    return space


def get_or_create_membership(
    db: Session, user_id: uuid.UUID, space_id: uuid.UUID
) -> SpaceMembership:
    """Idempotent user<->space membership upsert.

    Called from `_process_client_identity` right after `get_or_create_space`
    resolves the `Space` for a Client's reported identity -- this is the
    only place a `SpaceMembership` is ever created (spec's "Always"
    boundary: never via a manual admin action in this revision's scope).

    Same atomic-upsert shape as `get_or_create_space`: PostgreSQL's
    `INSERT ... ON CONFLICT DO NOTHING` on the `(user_id, space_id)` unique
    constraint, so concurrent identity reports for the same user/repo pair
    resolve to exactly one membership row, never a race or a duplicate.
    """
    existing = (
        db.query(SpaceMembership)
        .filter(SpaceMembership.user_id == user_id, SpaceMembership.space_id == space_id)
        .first()
    )
    if existing:
        return existing

    stmt = insert(SpaceMembership).values(user_id=user_id, space_id=space_id)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=["user_id", "space_id"]
    )
    db.execute(stmt)
    db.commit()

    membership = (
        db.query(SpaceMembership)
        .filter(SpaceMembership.user_id == user_id, SpaceMembership.space_id == space_id)
        .first()
    )

    if membership is None:
        # Fallback: create new membership if not found after upsert. Under a
        # genuine race (another request's upsert commits between our SELECT
        # above and this INSERT), the unique constraint on (user_id,
        # space_id) makes this raise `IntegrityError` rather than silently
        # succeed -- caught here and resolved to the row the other
        # transaction just created, instead of propagating up through
        # `_process_client_identity` and crashing the WebSocket message
        # handler (only a `WebSocketDisconnect`-only except guards that
        # call site).
        try:
            membership = SpaceMembership(user_id=user_id, space_id=space_id)
            db.add(membership)
            db.commit()
            db.refresh(membership)
        except IntegrityError:
            db.rollback()
            membership = (
                db.query(SpaceMembership)
                .filter(
                    SpaceMembership.user_id == user_id,
                    SpaceMembership.space_id == space_id,
                )
                .first()
            )

    return membership


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


def _fetch_stored_credential(db: Session, technical_identifier: str) -> str | None:
    """Looks up and decrypts the credential stored on this identifier's
    `Space`, if any. Returns `None` if there's no matching space, no stored
    credential, or the stored ciphertext can't be decrypted (e.g. the
    encryption key changed since it was stored) -- treated as "no usable
    credential" rather than an error, so the plain (unauthenticated)
    `git ls-remote` is still attempted.
    """
    space = db.query(Space).filter(Space.technical_identifier == technical_identifier).first()
    if space is None or not space.encrypted_credential:
        return None
    try:
        return decrypt_credential(space.encrypted_credential)
    except InvalidToken:
        return None


def _build_askpass_env(credential: str) -> tuple[str, dict[str, str]]:
    """Writes a short-lived `GIT_ASKPASS` script that echoes the credential
    from an env var, and returns (script_path, env) for the `git` subprocess.

    Per Design Notes: the token is injected via `GIT_ASKPASS` rather than
    embedded in the URL or argv, so it never shows up in `ps`/logs. Git
    invokes the askpass script once per prompt, passing the prompt text as
    `$1` (e.g. `"Username for 'https://...': "` vs `"Password for
    'https://...': "`). Conventional HTTPS PAT auth (GitHub/GitLab/
    Bitbucket) expects a fixed placeholder username and the token as the
    password, not the token on both prompts -- so the script branches on
    whether `$1` starts with "Username".

    The caller is responsible for deleting `script_path` once the
    subprocess exits. If writing/chmod-ing the script itself fails, the
    partially-created file is cleaned up here before re-raising, so the
    caller's own cleanup never has to guess whether one exists.
    """
    fd, script_path = tempfile.mkstemp(prefix="git-askpass-", suffix=".sh")
    try:
        with os.fdopen(fd, "w") as f:
            f.write(
                "#!/bin/sh\n"
                'case "$1" in\n'
                "  Username*) echo \"x-access-token\" ;;\n"
                '  *) echo "$REPO_CREDENTIAL_TOKEN" ;;\n'
                "esac\n"
            )
        os.chmod(script_path, stat.S_IRWXU)
    except OSError:
        try:
            os.unlink(script_path)
        except OSError:
            pass
        raise

    env = os.environ.copy()
    env["GIT_ASKPASS"] = script_path
    env["REPO_CREDENTIAL_TOKEN"] = credential
    # Never fall back to an interactive terminal prompt -- a `pending`
    # (privately inaccessible) repo must fail fast, not hang.
    env["GIT_TERMINAL_PROMPT"] = "0"
    return script_path, env


def check_repo_access(db: Session | None, technical_identifier: str) -> bool:
    """Determines if the Backend has read access to the repository.

    Runs a real `git ls-remote` against the identifier (never blocks the
    asyncio loop by itself -- callers run this in a threadpool, same as the
    existing `_process_client_identity` call site). For an `https://`
    identifier with a stored credential (`db` is not `None`), the decrypted
    token is injected via `GIT_ASKPASS`. An SSH identifier
    (`git@host:org/repo`) is always checked without credential injection --
    out of scope per this revision's "Never" boundary.

    Format-validates `technical_identifier` first (`is_valid_technical_identifier`)
    and returns False immediately on a mismatch, *before* any subprocess is
    spawned. This is the single choke point every caller goes through
    (admin POST, WebSocket discovery report, any future one) -- an
    unvalidated string must never reach `git ls-remote`'s argv: git
    recognizes remote-helper syntax (e.g. `ext::<command>`) that can
    execute an arbitrary command, and even a well-formed-looking URL is an
    SSRF vector against arbitrary hosts if accepted unchecked.

    Returns True if `git ls-remote` succeeds, False otherwise (invalid
    identifier, unreachable/private repo, or a timeout).
    """
    if not is_valid_technical_identifier(technical_identifier):
        return False

    askpass_path: str | None = None
    try:
        env = None
        if db is not None and technical_identifier.startswith("https://"):
            credential = _fetch_stored_credential(db, technical_identifier)
            if credential:
                askpass_path, env = _build_askpass_env(credential)

        result = subprocess.run(
            ["git", "ls-remote", technical_identifier],
            env=env,
            capture_output=True,
            timeout=_GIT_LS_REMOTE_TIMEOUT_SECONDS,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False
    finally:
        if askpass_path:
            try:
                os.unlink(askpass_path)
            except OSError:
                pass
