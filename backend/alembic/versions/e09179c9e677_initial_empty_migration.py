"""initial empty migration

Revision ID: e09179c9e677
Revises: 
Create Date: 2026-08-06 21:47:39.358374

"""
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = 'e09179c9e677'
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema.

    Intentionally empty. Applying this revision only causes Alembic to
    create its own `alembic_version` tracking table — zero feature tables.
    Feature tables (artifact index, Space/Contributor/Lease, etc.) are added
    by the stories that need them.
    """
    pass


def downgrade() -> None:
    """Downgrade schema. Intentionally empty — see upgrade()."""
    pass
