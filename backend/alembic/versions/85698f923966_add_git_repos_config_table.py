"""add_git_repos_config_table

Revision ID: 85698f923966
Revises: 5b0000000002
Create Date: 2026-08-10 20:39:21.161485

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85698f923966'
down_revision: Union[str, Sequence[str], None] = '5b0000000002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
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


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('git_repos_config')
