"""Space (Hub) ORM model and HubStatus enum.

A Space represents a team's Hub space, identified by a remote Git repository's
technical identifier (host/org/repo).
"""

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Enum, ForeignKey, String, Text, UniqueConstraint
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
    # `discovered` (Epic 2 zero-setup onboarding, a Client reports a new
    # identity) or `manual` (an Admin adds a repo directly). Same `Space`
    # rows either way -- never a second identity scheme for the same repos.
    origin: Mapped[str] = mapped_column(String(32), default="discovered", nullable=False)
    # Fernet-encrypted access token/credential for HTTPS remotes (see
    # `app/hub/credentials.py`). Never returned in cleartext by the API --
    # GET responses expose only a computed `has_credential: bool`.
    encrypted_credential: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("technical_identifier", name="uq_technical_identifier"),)


class SpaceMembership(Base):
    """A user's membership in a `Space` (repo).

    Established automatically -- never via a manual admin action in this
    revision's scope -- when a Client reports its identity for a repo on
    behalf of an authenticated user (`_process_client_identity`, right
    after `get_or_create_space`). One row per (user, space) pair; used to
    scope `GET /hub/dashboard/repos` to "only the repos this user's Client
    has actually reported" for every role except admin (who sees every
    `Space`).

    Uses proper `UUID` types with real FKs to `users.id`/`spaces.id` --
    unlike `ContributorGitState.user_id`, which stores a stringified UUID
    for pre-existing reasons specific to that table; that convention is not
    repeated here.
    """

    __tablename__ = "space_memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "space_id", name="uq_space_membership_user_space"),
    )
