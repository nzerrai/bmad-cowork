"""Pydantic request/response schemas for the auth endpoints."""

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.auth.models import Role

# Deliberately a simple regex, not the `email-validator`/`pydantic[email]`
# dependency (that was a deliberate choice in the original implementation,
# see backend/pyproject.toml) — just enough to reject obviously-malformed
# input like "not-an-email".
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# bcrypt silently truncates/raises past 72 bytes and on embedded null bytes;
# reject those with a controlled 422 instead of letting them reach bcrypt.
_MAX_BCRYPT_PASSWORD_BYTES = 72


def _check_email_format(value: str) -> str:
    if not _EMAIL_RE.match(value):
        raise ValueError("Invalid email format")
    return value


def _check_password_is_bcrypt_safe(value: str) -> str:
    if "\x00" in value:
        raise ValueError("Password must not contain a null byte")
    if len(value.encode("utf-8")) > _MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {_MAX_BCRYPT_PASSWORD_BYTES} bytes")
    return value


class RegisterRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=8)
    role: Role

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        return _check_email_format(v)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return _check_password_is_bcrypt_safe(v)


class LoginRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str

    @field_validator("email")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        return _check_email_format(v)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return _check_password_is_bcrypt_safe(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: Role
