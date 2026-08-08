"""Backend FastAPI application entry point.

Story 0.1 scope: boot-check only. Story 0.2 adds the auth/RBAC substrate
(email/password identity, JWT bearer sessions, role-gated routes). Story 1.1
adds the artifact indexing engine (Backend-only, no route). Story 1.2 adds
the first read endpoint (`GET /artifacts/health`) plus CORS, the first
cross-origin route the IHM tier calls. Story 2.1 adds the WebSocket Pillar
(`/ws`, connection registry, presence broadcast, heartbeat). No lease/claim
logic yet (Epic 3).
"""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.dependencies import require_role
from app.auth.models import Role, User
from app.auth.router import router as auth_router
from app.config import IHM_ORIGIN
from app.indexing.router import router as artifacts_router
from app.realtime.router import router as realtime_router

app = FastAPI(title="BMad Portal Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[IHM_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)
app.include_router(auth_router)
app.include_router(artifacts_router)
app.include_router(realtime_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Boot-check route: proves the Backend tier starts locally."""
    return {"status": "ok"}


@app.get("/admin/ping")
def admin_ping(user: User = Depends(require_role(Role.ADMIN))) -> dict[str, str]:
    """Demo admin-only route proving the RBAC enforcement substrate (AC2/AC3)."""
    return {"status": "pong", "user_id": str(user.id)}
