"""Hub API router for contributor Git state queries and quality gates verification."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db import SessionLocal
from app.hub.git_state_service import get_contributor_git_state
from app.hub.quality_gates_schemas import QualityGatesVerificationOut
from app.hub.quality_gates_service import verify_quality_gates
from app.indexing.models import Artifact

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
