"""Git state models for the canonical state reporting system (Story 2.5)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ContributorGitState(Base):
    """Canonical Git state record per contributor.

    Maintains a single versioned record per contributor's local Git state,
    as specified in AD-008 (Local Repo State Reporting: one stream, one
    canonical read model).
    """

    __tablename__ = "contributor_git_states"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True
    )
    technical_identifier: Mapped[str] = mapped_column(
        String(512), nullable=False, index=True
    )
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ahead: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    behind: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    in_progress_action: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="none"
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
