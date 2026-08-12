"""Hub API router: contributor Git state queries, quality gates verification,
and the admin Git/Repos config surface."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_user
from app.auth.models import Role, User
from app.db import SessionLocal
from app.hub import service as hub_service
from app.hub.credentials import encrypt_credential
from app.hub.git_state_service import get_contributor_git_state
from app.hub.models import HubStatus, Space, SpaceMembership
from app.hub.quality_gates_schemas import QualityGatesVerificationOut
from app.hub.quality_gates_service import verify_quality_gates
from app.indexing.models import Artifact
from app.realtime.router import manager as websocket_manager

router = APIRouter()


def get_db():
    """FastAPI dependency yielding a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/hub/git-state/by-user/{user_id}")
def get_git_state_by_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    """Retrieve the canonical Git state for a contributor by user ID.

    Returns the state dictionary with staleness information.
    Implements AD-008: one stream, one canonical read model.
    Requires authenticated user context.
    """
    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id format",
        )

    git_state = get_contributor_git_state(db, user_uuid)

    if git_state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Git state not found for this contributor",
        )

    return git_state


@router.get("/quality-gates/verification")
def get_quality_gates_verification(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QualityGatesVerificationOut:
    """Quality gates verification with compliance score breakdown.

    Verifies specs presence, PR review status, and test linkage deterministically.
    Generates a compliance score with a per-section breakdown.
    Requires authenticated user context.
    """
    artifacts = db.query(Artifact).order_by(Artifact.file_path).all()

    verification = verify_quality_gates(db, artifacts)

    return QualityGatesVerificationOut.model_validate(verification)


# Git/Repos Project Configuration endpoints (Story 6.1, revised: multi-repo
# admin surface unified on the `Space` model -- see spec-6-1-...-2.md)

def _space_to_repo_out(space: Space) -> dict:
    """Serializes a `Space` for the admin repos list/detail responses.

    Never includes the raw or encrypted credential -- only a computed
    `has_credential: bool`, per this revision's "Always" boundary.
    """
    return {
        "id": str(space.id),
        "technical_identifier": space.technical_identifier,
        "short_name": space.short_name,
        "status": space.status.value,
        "origin": space.origin,
        "has_credential": bool(space.encrypted_credential),
        "created_at": space.created_at.isoformat(),
        "updated_at": space.updated_at.isoformat(),
    }


@router.get("/hub/admin/repos")
def list_admin_repos(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """List every known `Space` (discovered and manually-added), for the
    System Administration Git/Repos surface. Requires admin role.
    """
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    spaces = db.query(Space).order_by(Space.created_at).all()
    return {"repos": [_space_to_repo_out(space) for space in spaces]}


@router.post("/hub/admin/repos", status_code=status.HTTP_201_CREATED)
async def add_admin_repo(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Adds a repository manually (`origin=manual`). Requires admin role.

    Runs entirely in a threadpool: `get_or_create_space` itself performs
    the one real `git ls-remote` verification for a newly-created space
    (via `determine_space_status`) and persists the resolved status.
    Deliberately does *not* call `check_repo_access` again afterwards --
    that would both shell out to `git` a second time for the same request
    and, worse, run the (up to 6s) subprocess synchronously on the
    event-loop thread, stalling every other request/heartbeat this worker
    is serving.
    """
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    technical_identifier = payload.get("technical_identifier")
    is_valid = technical_identifier and hub_service.is_valid_technical_identifier(
        technical_identifier
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid technical_identifier",
        )

    space = await run_in_threadpool(
        hub_service.get_or_create_space, db, technical_identifier, "manual"
    )

    return _space_to_repo_out(space)


@router.patch("/hub/admin/repos/{repo_id}/credential")
async def set_admin_repo_credential(
    repo_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Stores an encrypted access credential for a `pending` repo and
    re-runs the access check. Requires admin role.
    """
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    try:
        space_uuid = uuid.UUID(repo_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid repo id",
        )

    credential = payload.get("credential")
    if not credential or not isinstance(credential, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="credential is required",
        )
    if "\n" in credential or "\r" in credential:
        # GIT_ASKPASS's protocol only reads the first line the askpass
        # script outputs -- an embedded newline would be silently
        # truncated at use time, corrupting the effective token with no
        # error surfaced. Reject at storage time instead of failing later
        # with no explanation.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="credential must not contain newlines",
        )

    space = db.query(Space).filter(Space.id == space_uuid).first()
    if space is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repo not found",
        )

    # Credential injection is HTTPS-only (this revision's "Never" boundary
    # scopes credential support to HTTPS; `check_repo_access` only injects
    # for identifiers starting with `https://`) -- reject storing one for
    # anything else (SSH, or a bare `http://` identifier that would
    # otherwise be accepted here but silently never unblock, since it can
    # never satisfy that injection condition).
    if not space.technical_identifier.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credential not applicable to this repo (HTTPS only)",
        )

    space.encrypted_credential = encrypt_credential(credential)
    db.commit()
    db.refresh(space)

    # Re-verify access with the newly-stored credential; a still-refused
    # access leaves the space `pending` (never a direct jump to `active`).
    has_access = await run_in_threadpool(
        hub_service.check_repo_access, db, space.technical_identifier
    )
    space.status = HubStatus.ACTIVE if has_access else HubStatus.PENDING
    db.commit()
    db.refresh(space)

    return _space_to_repo_out(space)


# Dashboard repos list endpoint (spec: dashboard-user-scoped-repos-list)

@router.get("/hub/dashboard/repos")
def list_dashboard_repos(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """List the repos to show on `/hub/dashboard`'s Overview, scoped by role.

    Admin sees every known `Space` (same universe as `/hub/admin/repos`).
    Every other role sees only the `Space`s they have a `SpaceMembership`
    for -- established automatically when their Client reports identity for
    a repo (`_process_client_identity`), never via a manual action in this
    revision's scope.

    Reuses `_space_to_repo_out` for each repo's base shape, then enriches it
    with a `git_state` sub-object sourced from the current user's
    `ContributorGitState` when its `technical_identifier` matches this repo
    -- `None` otherwise (never fabricated). PRs are out of scope for this
    revision (no backend PR integration exists) so no `prs` field is added
    here, consistent with `get_dashboard_data`'s empty `claims`/`riskSignals`
    convention.
    """
    if user.role == Role.ADMIN:
        spaces = db.query(Space).order_by(Space.created_at).all()
    else:
        spaces = (
            db.query(Space)
            .join(SpaceMembership, SpaceMembership.space_id == Space.id)
            .filter(SpaceMembership.user_id == user.id)
            .order_by(Space.created_at)
            .all()
        )

    git_state = get_contributor_git_state(db, user.id)

    repos = []
    for space in spaces:
        repo = _space_to_repo_out(space)
        if git_state is not None and git_state["technical_identifier"] == space.technical_identifier:
            repo["git_state"] = git_state
        else:
            repo["git_state"] = None
        repos.append(repo)

    return {"repos": repos}


# Git State Report HTTP Endpoint (VS Code Extension)

@router.post("/api/git-state-report")
async def post_git_state_report(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Receive a Git state report from the VS Code extension via HTTP REST API.

    Tracks the connection and git state for connected users stats.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body",
        )

    technical_identifier = body.get("technical_identifier")
    branch = body.get("branch")
    ahead = body.get("ahead", 0)
    behind = body.get("behind", 0)
    in_progress_action = body.get("in_progress_action", "none")

    if not technical_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="technical_identifier is required",
        )

    # Store the canonical Git state in the database
    from app.hub.git_state_models import ContributorGitState
    from datetime import datetime, timezone

    user_id_str = str(user.id)

    git_state = db.query(ContributorGitState).filter(ContributorGitState.user_id == user_id_str).first()

    if git_state:
        # Update existing state
        git_state.technical_identifier = technical_identifier
        git_state.branch = branch
        git_state.ahead = max(0, int(ahead)) if ahead is not None else 0
        git_state.behind = max(0, int(behind)) if behind is not None else 0
        git_state.in_progress_action = in_progress_action or "none"
        git_state.last_updated = datetime.now(timezone.utc)
        db.commit()
    else:
        # Create new state record
        git_state = ContributorGitState(
            user_id=user_id_str,
            technical_identifier=technical_identifier,
            branch=branch,
            ahead=max(0, int(ahead)) if ahead is not None else 0,
            behind=max(0, int(behind)) if behind is not None else 0,
            in_progress_action=in_progress_action or "none",
            last_updated=datetime.now(timezone.utc),
        )
        db.add(git_state)
        db.commit()
        db.refresh(git_state)

    # Record git state report for connection tracking
    websocket_manager.record_git_state_report(user.id, technical_identifier)

    return {
        "status": "ok",
        "technical_identifier": technical_identifier,
    }


# Dashboard Data HTTP Endpoint (VS Code Extension)

@router.get("/api/dashboard/data")
def get_dashboard_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Serve the VS Code extension's sidebar dashboard snapshot for the
    authenticated contributor, sourced from the same canonical Git state
    record `POST /api/git-state-report` writes (AD-008: one stream, one
    canonical read model).

    Claims and risk signals have no backing data model yet, so those lists
    are returned empty rather than fabricated.
    """
    git_state = get_contributor_git_state(db, user.id)

    if git_state is None:
        return {
            "status": "absent",
            "repoState": {
                "syncStatus": "Idle-Offline",
                "ahead": 0,
                "behind": 0,
                "hasInProgressRebase": False,
                "hasInProgressMerge": False,
                "hasInProgressConflict": False,
            },
            "claims": [],
            "riskSignals": [],
            "lastKnownTime": None,
            "isStale": False,
        }

    in_progress_action = git_state["in_progress_action"]
    ahead = git_state["ahead"]
    behind = git_state["behind"]

    if in_progress_action == "conflict":
        sync_status = "conflict"
    elif in_progress_action in ("rebase", "merge"):
        sync_status = "syncing-active"
    elif ahead or behind:
        sync_status = "drift"
    else:
        sync_status = "synced"

    return {
        "status": "connected",
        "repoState": {
            "syncStatus": sync_status,
            "ahead": ahead,
            "behind": behind,
            "hasInProgressRebase": in_progress_action == "rebase",
            "hasInProgressMerge": in_progress_action == "merge",
            "hasInProgressConflict": in_progress_action == "conflict",
        },
        "claims": [],
        "riskSignals": [],
        "lastKnownTime": git_state["last_updated"],
        "isStale": git_state["is_stale"],
    }


# Connected Users Stats endpoints (Story 6.3)

class ConnectedUserStatsOut:
    """Connected user stats response schema."""

    def __init__(self, users: list[dict]):
        self.users = users


@router.get("/hub/admin/connected-users-stats")
def get_connected_users_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get the connected users statistics sorted by repository with request counts by type.

    Requires admin role.
    """
    # Check if user has admin role
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    # Get connected users stats from the connection manager
    stats = websocket_manager.get_connected_users_stats()

    return {
        "users": stats
    }
