"""User management service for role changes and user listing."""

import uuid

from sqlalchemy.orm import Session

from app.auth.models import Role, User


def get_all_users(db: Session) -> list[User]:
    """Retrieve all users with their roles."""
    return db.query(User).order_by(User.email).all()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    """Retrieve a user by their ID."""
    return db.get(User, user_id)


def update_user_role(db: Session, user_id: uuid.UUID, new_role: Role) -> User:
    """Update a user's role."""
    user = db.get(User, user_id)
    if user is None:
        raise ValueError(f"User with id {user_id} not found")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user
