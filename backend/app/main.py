"""Backend FastAPI application entry point.

Story 0.1 scope: boot-check only. Story 0.2 adds the auth/RBAC substrate
(email/password identity, JWT bearer sessions, role-gated routes). No
artifact indexing (Epic 1), no Git-state scanning or WebSocket heartbeat
(Epic 2), no lease/claim logic (Epic 3).
"""

from fastapi import Depends, FastAPI

from app.auth.dependencies import require_role
from app.auth.models import Role, User
from app.auth.router import router as auth_router

app = FastAPI(title="BMad Portal Backend")
app.include_router(auth_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Boot-check route: proves the Backend tier starts locally."""
    return {"status": "ok"}


@app.get("/admin/ping")
def admin_ping(user: User = Depends(require_role(Role.ADMIN))) -> dict[str, str]:
    """Demo admin-only route proving the RBAC enforcement substrate (AC2/AC3)."""
    return {"status": "pong", "user_id": str(user.id)}
