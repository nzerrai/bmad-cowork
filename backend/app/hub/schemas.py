"""Pydantic schemas for Space representation (API responses to IHM)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SpaceBase(BaseModel):
    """Base schema for Space."""

    technical_identifier: str
    short_name: str
    status: str


class SpaceCreate(SpaceBase):
    """Schema for creating a new Space."""

    pass


class SpaceUpdate(BaseModel):
    """Schema for updating a Space."""

    status: str | None = None


class SpaceResponse(SpaceBase):
    """Schema for Space API responses."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
