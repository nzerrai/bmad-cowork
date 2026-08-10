"""Pydantic schemas for user and role management."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.auth.models import Role


class UserUpdateRequest(BaseModel):
    """Request to update a user's role."""

    role: Role = Field(description="The new role to assign to the user")


class UserListOut(BaseModel):
    """Response for a list of users."""

    id: uuid.UUID
    email: str
    role: Role


class UserDetailOut(BaseModel):
    """Response for a single user's details."""

    id: uuid.UUID
    email: str
    role: Role

