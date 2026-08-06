"""Backend FastAPI application entry point.

Story 0.1 scope: boot-check only. No business logic, no auth/RBAC (Story 0.2),
no artifact indexing (Epic 1), no Git-state scanning or WebSocket heartbeat
(Epic 2), no lease/claim logic (Epic 3).
"""

from fastapi import FastAPI

app = FastAPI(title="BMad Portal Backend")


@app.get("/health")
def health() -> dict[str, str]:
    """Boot-check route: proves the Backend tier starts locally."""
    return {"status": "ok"}
