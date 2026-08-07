"""`POST /auth/register` and `POST /auth/login` — session establishment."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.auth.security import create_access_token, hash_password, verify_password
from app.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# Precomputed once at import time so `login()` can still run a real bcrypt
# comparison when the email lookup misses. Without this, an unknown-email
# login skips `verify_password` entirely and returns 401 measurably faster
# than a known-email/wrong-password login — a timing side-channel that lets
# an attacker enumerate registered emails.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-safety-padding")


def _normalize_email(email: str) -> str:
    """Case/whitespace-fold email so `Foo@x.com` and `foo@x.com` collide."""
    return email.strip().lower()


def _invalid_credentials() -> HTTPException:
    # A fresh instance per call — concurrent requests must not share one
    # HTTPException object, since raising sets `__traceback__` on it.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Create a new user. 409 on duplicate email; hashed password never returned."""
    email = _normalize_email(payload.email)
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Exchange valid credentials for a JWT bearer token. 401 on any mismatch."""
    email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        # No such user: still pay the bcrypt cost against a fixed dummy hash
        # so this path takes comparable time to a wrong-password match below.
        verify_password(payload.password, _DUMMY_PASSWORD_HASH)
        raise _invalid_credentials()
    if not verify_password(payload.password, user.hashed_password):
        raise _invalid_credentials()

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)
