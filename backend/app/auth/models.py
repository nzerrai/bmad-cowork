"""`User` ORM model and the fixed `Role` enum.

`role` is exactly one of the five platform roles (Story 0.2 Boundaries &
Constraints) — enforced at the DB layer via a native PostgreSQL enum type,
not just in application code.
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Role(enum.StrEnum):
    """The five fixed platform roles. MVP has exactly one gated role (admin)."""

    DEVELOPER = "developer"
    PRODUCT_MANAGER = "product_manager"
    ARCHITECT_TECH_LEAD = "architect_tech_lead"
    UX_DESIGNER = "ux_designer"
    ADMIN = "admin"


class User(Base):
    """A registered identity: email/password credentials plus one fixed role."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role", values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
