"""I/O matrix test: migrating to head against a fresh PostgreSQL 18.x
instance adds exactly the feature tables added so far (`users` from Story
0.2 AC4; `artifacts`/`artifact_links` from Story 1.1 Task 1) beyond the
migration-tracking table."""

from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def test_migrations_create_only_the_expected_tables() -> None:
    cfg = Config(str(ALEMBIC_INI))
    # Guarantee a pristine slate before asserting: this runs against the same
    # shared dev database as `docker-compose.yml`/CONTRIBUTING.md, so a prior
    # interrupted run or manual session must not affect the assertion below.
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    engine = create_engine(cfg.get_main_option("sqlalchemy.url"))
    try:
        tables = inspect(engine).get_table_names()
    finally:
        engine.dispose()

    assert sorted(tables) == ["alembic_version", "artifact_links", "artifacts", "users"]
