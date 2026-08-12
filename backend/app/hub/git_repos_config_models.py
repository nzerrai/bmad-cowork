"""Git repos configuration model for the project configuration (Story 6.1)."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class GitReposConfig(Base):
    """Git repositories project configuration.

    Stores the connected Git repository configuration for the project.
    """

    __tablename__ = "git_repos_config"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_name: Mapped[str] = mapped_column(String(512), nullable=False)
    primary_repo_url: Mapped[str] = mapped_column(String(512), nullable=False)
    backup_repo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
