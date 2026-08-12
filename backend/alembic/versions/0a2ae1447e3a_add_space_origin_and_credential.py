"""add_space_origin_and_credential

Revision ID: 0a2ae1447e3a
Revises: 85698f923966
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a2ae1447e3a'
down_revision: Union[str, Sequence[str], None] = '85698f923966'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Unifies the admin Git/Repos surface on the `spaces` table (Story 6.1
    revision): adds `origin` (discovered vs. manual) and
    `encrypted_credential` (Fernet-encrypted access token, nullable) to
    `spaces`, and drops the now-obsolete `git_repos_config` table.
    """
    op.add_column(
        'spaces',
        sa.Column('origin', sa.String(length=32), nullable=False, server_default='discovered'),
    )
    op.add_column(
        'spaces',
        sa.Column('encrypted_credential', sa.Text(), nullable=True),
    )
    op.drop_table('git_repos_config')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'git_repos_config',
        sa.Column('id', sa.UUID(), primary_key=True),
        sa.Column('project_name', sa.String(512), nullable=False),
        sa.Column('primary_repo_url', sa.String(512), nullable=False),
        sa.Column('backup_repo_url', sa.String(512), nullable=True),
        sa.Column('webhook_url', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.drop_column('spaces', 'encrypted_credential')
    op.drop_column('spaces', 'origin')
