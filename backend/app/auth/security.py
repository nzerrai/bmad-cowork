"""Password hashing (bcrypt) and JWT encode/decode (pyjwt).

Tool choices per Story 0.2 Design Notes: `pyjwt` (actively maintained, no
extra dependency surprises) and `bcrypt` directly (skips `passlib`'s stalled
bcrypt-backend maintenance).
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.auth.models import Role
from app.config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET_KEY


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt. Plaintext is never persisted."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: uuid.UUID, role: Role) -> str:
    """Issue a stateless JWT bearer token carrying `sub` (user id) and `role`."""
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role.value,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT bearer token.

    Raises `jwt.PyJWTError` (or a subclass, e.g. `ExpiredSignatureError`,
    `InvalidTokenError`) on any malformed/expired/invalid token — callers
    (the `get_current_user` dependency) translate that into a 401.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
