"""Pydantic response schemas for `GET /artifacts/health` (Story 1.2 Task 2)."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.indexing.types import ArtifactType


class ArtifactTypeHealth(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    artifact_type: ArtifactType
    completeness: Literal["complete", "incomplete", "missing"]
    count: int
    error_count: int


class ArtifactLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_field: str
    target_path: str
    target_artifact_id: uuid.UUID | None
    resolved: bool


class ArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    artifact_type: ArtifactType
    title: str | None
    file_path: str
    status: str | None
    error: str | None
    sync_status: Literal["synced", "stale", "deleted", "error"]
    indexed_at: datetime
    links_out: list[ArtifactLinkOut]


class ArtifactHealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    types: list[ArtifactTypeHealth]
    artifacts: list[ArtifactOut]


class TraceabilityNode(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Literal["completed", "pending", "linked", "not_started"]
    artifact_id: uuid.UUID | None
    title: str | None
    file_path: str | None


class TraceabilityRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    epic_num: int
    story_num: int
    epic_title: str
    story_title: str
    idea_brief: TraceabilityNode
    prd: TraceabilityNode
    architecture: TraceabilityNode
    ux: TraceabilityNode
    story: TraceabilityNode
    prs: TraceabilityNode
    tests: TraceabilityNode


class TraceabilityMatrixResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rows: list[TraceabilityRow]
