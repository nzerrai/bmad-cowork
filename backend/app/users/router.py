"""User and role management API router."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import Role, User
from app.db import get_db
from app.users.schemas import UserDetailOut, UserListOut, UserUpdateRequest
from app.users.service import get_all_users, get_user_by_id, update_user_role

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=list[UserListOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
) -> list[UserListOut]:
    """List all users with their roles. Admin-only."""
    users = get_all_users(db)
    return [
        UserListOut(id=u.id, email=u.email, role=u.role)
        for u in users
    ]


@router.get("/{user_id}", response_model=UserDetailOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
) -> UserDetailOut:
    """Get a user's details. Admin-only."""
    import uuid

    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id format",
        )

    user = get_user_by_id(db, user_uuid)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserDetailOut(id=user.id, email=user.email, role=user.role)


@router.patch("/{user_id}/role", response_model=UserDetailOut)
def update_user_role_endpoint(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
) -> UserDetailOut:
    """Update a user's role. Admin-only."""
    import uuid

    try:
        user_uuid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id format",
        )

    try:
        user = update_user_role(db, user_uuid, payload.role)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return UserDetailOut(id=user.id, email=user.email, role=user.role)
