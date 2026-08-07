"""SQLAlchemy engine/session factory.

Reads `DATABASE_URL` with the same local-dev fallback as `alembic.ini`
(`postgresql+psycopg://bmad:bmad@localhost:5433/bmad_portal`) so app code and
migrations agree on which PostgreSQL instance to use without editing tracked
config.
"""

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://bmad:bmad@localhost:5433/bmad_portal"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


def get_db() -> Generator[Session]:
    """FastAPI dependency yielding a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
