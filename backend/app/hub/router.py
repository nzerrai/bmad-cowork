"""Hub API router for contributor Git state queries (Story 2.5)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db import SessionLocal
from app.hub.git_state_service import get_contributor_git_state

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
