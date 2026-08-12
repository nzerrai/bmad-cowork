"""Hub API router for contributor Git state queries, quality gates verification, and git repos config."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.models import Role, User
from app.db import SessionLocal
from app.hub.git_repos_config_models import GitReposConfig
from app.hub.git_repos_config_service import create_git_repos_config as create_git_repos_config_service
from app.hub.git_repos_config_service import get_git_repos_config as get_git_repos_config_service
from app.hub.git_repos_config_service import update_git_repos_config as update_git_repos_config_service
from app.hub.git_state_service import get_contributor_git_state
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
    import uuid

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


# Git/Repos Project Configuration endpoints (Story 6.1)

class GitReposConfigOut:
    """Git repos configuration response schema."""

    def __init__(self, config: GitReposConfig):
        self.project_name = config.project_name
        self.primary_repo_url = config.primary_repo_url
        self.backup_repo_url = config.backup_repo_url
        self.webhook_url = config.webhook_url


class GitReposConfigIn:
    """Git repos configuration request schema."""

    def __init__(self, project_name: str, primary_repo_url: str, backup_repo_url: str | None = None, webhook_url: str | None = None):
        self.project_name = project_name
        self.primary_repo_url = primary_repo_url
        self.backup_repo_url = backup_repo_url
        self.webhook_url = webhook_url


@router.get("/hub/git-repos-config")
def get_git_repos_config_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get the Git repositories project configuration.

    Requires admin role.
    """
    # Check if user has admin role
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    config = get_git_repos_config_service(db)

    if config is None:
        # Return default configuration if none exists
        return {
            "project_name": "",
            "primary_repo_url": "",
            "backup_repo_url": None,
            "webhook_url": None,
        }

    return {
        "project_name": config.project_name,
        "primary_repo_url": config.primary_repo_url,
        "backup_repo_url": config.backup_repo_url,
        "webhook_url": config.webhook_url,
    }


@router.post("/hub/git-repos-config")
def save_git_repos_config_endpoint(
    config_in: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Save the Git repositories project configuration.

    Requires admin role.
    """
    # Check if user has admin role
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    project_name = config_in.get("project_name")
    primary_repo_url = config_in.get("primary_repo_url")
    backup_repo_url = config_in.get("backup_repo_url")
    webhook_url = config_in.get("webhook_url")

    if not project_name or not primary_repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_name and primary_repo_url are required",
        )

    # Check if config exists
    config = get_git_repos_config_service(db)

    if config:
        # Update existing config
        config = update_git_repos_config_service(
            db,
            config,
            project_name=project_name,
            primary_repo_url=primary_repo_url,
            backup_repo_url=backup_repo_url,
            webhook_url=webhook_url,
        )
    else:
        # Create new config
        config = create_git_repos_config_service(
            db,
            project_name=project_name,
            primary_repo_url=primary_repo_url,
            backup_repo_url=backup_repo_url,
            webhook_url=webhook_url,
        )

    return {
        "project_name": config.project_name,
        "primary_repo_url": config.primary_repo_url,
        "backup_repo_url": config.backup_repo_url,
        "webhook_url": config.webhook_url,
    }


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
