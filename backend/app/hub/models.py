"""Space (Hub) ORM model and HubStatus enum.

A Space represents a team's Hub space, identified by a remote Git repository's
technical identifier (host/org/repo).
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class HubStatus(enum.StrEnum):
    """The status of a Hub space."""

    PENDING = "pending"
    ACTIVE = "active"
    ACCESS_REVOKED = "access_revoked"


class Space(Base):
    """A Hub space for a team's Git repository."""

    __tablename__ = "spaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    technical_identifier: Mapped[str] = mapped_column(
        String(512), unique=True, nullable=False, index=True
    )
    short_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[HubStatus] = mapped_column(
        Enum(HubStatus, name='hubstatus', values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=HubStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("technical_identifier", name="uq_technical_identifier"),)
