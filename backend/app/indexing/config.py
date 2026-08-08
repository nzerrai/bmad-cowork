"""`ARTIFACT_ROOT`: the filesystem root the indexing engine scans.

Same explicit-env-var convention as `DATABASE_URL` (`app/db.py`) and
`JWT_SECRET_KEY` (`app/config.py`): CI sets it explicitly, local dev falls
back to a documented default — this repo's own `prjdocs/` directory, the
live example this engine is built and tested against.
"""

import os
from pathlib import Path

# app/indexing/config.py -> app/indexing -> app -> backend -> repo root.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_ARTIFACT_ROOT = _REPO_ROOT / "prjdocs"

ARTIFACT_ROOT = Path(os.environ.get("ARTIFACT_ROOT") or _DEFAULT_ARTIFACT_ROOT)
