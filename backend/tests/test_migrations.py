"""I/O matrix test: the initial migration creates only the migration-tracking
schema against a fresh PostgreSQL 18.x instance, zero feature tables."""

from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect

from alembic import command

ALEMBIC_INI = Path(__file__).resolve().parent.parent / "alembic.ini"


def test_initial_migration_creates_no_feature_tables() -> None:
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

    assert tables == ["alembic_version"]
