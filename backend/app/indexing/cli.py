"""Single-command entry point: `uv run python -m app.indexing.cli`.

No HTTP endpoint is required by this story's AC — Stories 1.2/1.3 add their
own read endpoints when the dashboard/matrix need to serve this data.
"""

from app.db import SessionLocal
from app.indexing.config import ARTIFACT_ROOT
from app.indexing.scanner import run_index


def main() -> None:
    db = SessionLocal()
    try:
        result = run_index(ARTIFACT_ROOT, db)
    finally:
        db.close()
    print(
        f"Indexed {result.scanned} artifact(s) under {ARTIFACT_ROOT}: "
        f"{result.inserted} new, {result.updated} updated, "
        f"{result.unchanged} unchanged, {result.errors} error(s)."
    )


if __name__ == "__main__":
    main()
