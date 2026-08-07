"""`get_current_user` and `require_role`: the shared RBAC enforcement substrate.

Every protected route resolves the current user via `get_current_user` —
never ad hoc header parsing (Story 0.2 Boundaries & Constraints). Missing,
malformed, or expired tokens all resolve to 401; a role mismatch on a
role-gated route resolves to 403.
"""

import uuid
from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.models import Role, User
from app.auth.security import decode_access_token
from app.db import get_db

# auto_error=False so a missing header resolves to our own explicit 401,
# rather than FastAPI's HTTPBearer default (403 "Not authenticated").
_bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user (id + role) from the Bearer token.

    401 on: missing Authorization header, malformed token, expired token,
    or a token whose `sub` no longer maps to an existing user.
    """
    if credentials is None:
        raise _UNAUTHORIZED

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise _UNAUTHORIZED from exc

    user = db.get(User, user_id)
    if user is None:
        raise _UNAUTHORIZED

    return user


def require_role(*roles: Role) -> Callable[[User], User]:
    """Dependency factory: 403 unless `get_current_user`'s role is in `roles`."""

    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this action",
            )
        return user

    return _check
