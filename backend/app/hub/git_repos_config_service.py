"""Git repos configuration service for project configuration (Story 6.1)."""

from sqlalchemy.orm import Session

from app.hub.git_repos_config_models import GitReposConfig


def get_git_repos_config(db: Session) -> GitReposConfig | None:
    """Get the git repos configuration from the database."""
    return db.query(GitReposConfig).first()


def create_git_repos_config(
    db: Session,
    project_name: str,
    primary_repo_url: str,
    backup_repo_url: str | None = None,
    webhook_url: str | None = None,
) -> GitReposConfig:
    """Create a new git repos configuration."""
    config = GitReposConfig(
        project_name=project_name,
        primary_repo_url=primary_repo_url,
        backup_repo_url=backup_repo_url,
        webhook_url=webhook_url,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def update_git_repos_config(
    db: Session,
    config: GitReposConfig,
    project_name: str | None = None,
    primary_repo_url: str | None = None,
    backup_repo_url: str | None = None,
    webhook_url: str | None = None,
) -> GitReposConfig:
    """Update the git repos configuration."""
    if project_name is not None:
        config.project_name = project_name
    if primary_repo_url is not None:
        config.primary_repo_url = primary_repo_url
    if backup_repo_url is not None:
        config.backup_repo_url = backup_repo_url
    if webhook_url is not None:
        config.webhook_url = webhook_url

    db.commit()
    db.refresh(config)
    return config
