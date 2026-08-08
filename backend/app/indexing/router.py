"""`GET /artifacts/health` — the read endpoint the dashboard consumes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db import get_db
from app.indexing.config import ARTIFACT_ROOT
from app.indexing.health import compute_health
from app.indexing.schemas import ArtifactHealthResponse, TraceabilityMatrixResponse
from app.indexing.traceability import compute_traceability

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.get("/health", response_model=ArtifactHealthResponse)
def get_artifact_health(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ArtifactHealthResponse:
    """Per-type completeness rollup + per-artifact sync status and links.

    Any authenticated role may call this — nothing in the PRD role table
    restricts artifact-health visibility.
    """
    report = compute_health(db, ARTIFACT_ROOT)
    return ArtifactHealthResponse.model_validate(report)


@router.get("/traceability", response_model=TraceabilityMatrixResponse)
def get_traceability_matrix(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TraceabilityMatrixResponse:
    """Idea/Brief -> PRD -> Architecture -> UX -> Story -> PRs -> Tests
    lineage for every Epic/Story pair in the project's roadmap (`epics.md`).

    Any authenticated role may call this — same as `/artifacts/health`,
    nothing in the PRD role table restricts traceability visibility.
    """
    matrix = compute_traceability(db, ARTIFACT_ROOT)
    return TraceabilityMatrixResponse.model_validate(matrix)
