# BMad Portal Hub

A three-tier system for tracking and coordinating BMad-driven development work:

- **`client/`** — a Python agent that runs on a developer's machine, owning the local filesystem and Git operations.
- **`backend/`** — a FastAPI service that owns orchestration and temporal state (sessions, leases, artifact index) backed by PostgreSQL.
- **`ihm/`** — a Next.js/React dashboard for visualizing project state.

For the full product picture (epics, requirements, architecture), see [`prjdocs/planning-artifacts/epics.md`](prjdocs/planning-artifacts/epics.md).

## Status

This repository has completed **Epic 0: Project Scaffolding & Dev Environment** and **Epic 1: Artifact Health & Traceability Catalog**, and **Epic 2: Distributed Sync & Zero-Setup Onboarding** is now in progress. Story 0.1 gave each tier a minimal boot-check entry point (health route, CLI status line, default page). Story 0.2 added the Backend's auth/RBAC foundation: email/password registration and login, a JWT bearer session, and a `require_role` dependency demonstrated on one admin-only route (`GET /admin/ping`). Story 1.1 added the artifact indexing engine: an idempotent scan (`uv run python -m app.indexing.cli`) that catalogues BMAD artifacts (Brief, PRD, Architecture, UX, Specs, Epics, Stories, etc.) and their frontmatter cross-references into `artifacts`/`artifact_links` — Backend-only, no UI yet. Story 1.2 added the Artifact Health Dashboard: a `GET /artifacts/health` endpoint (per-type completeness rollup, per-artifact sync status against disk, and broken-link detection) plus the IHM's first real UI — a minimal `/login` page and an `/artifacts` dashboard rendering that data, styled with DESIGN.md's dark-only Command Center tokens — the first cross-tier (Backend↔IHM) feature in the project, including the CORS configuration it required. Story 1.3 added the Traceability Matrix: a `GET /artifacts/traceability` endpoint deriving the Idea/Brief → PRD → Architecture → UX → Story → PRs → Tests lineage for every Epic/Story pair in `epics.md`'s roadmap, plus an `/artifacts/traceability` IHM page — completing Epic 1. Story 2.1 added the WebSocket Pillar, Epic 2's first story: a `GET`-upgraded `/ws` Backend endpoint (auth via query-param bearer token, an in-memory connection registry, a connect/disconnect presence broadcast, and silent heartbeat bookkeeping) plus reconnect-with-backoff WebSocket client modules on both the Client agent and the IHM — the connection/auth/heartbeat/reconnect substrate later Epic 2/3 stories (notifications, command dispatch, leases, state reporting) will attach real payloads to. No lease/claim logic has landed yet; that arrives in Epic 3.

## Getting Started

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for exact steps to run all three services locally, plus local PostgreSQL setup.

## Stack

| Tier | Technology | Pinned Version |
|------|------------|-----------------|
| Client | Python | 3.13 |
| Backend | FastAPI | 0.141.x |
| Backend | PostgreSQL | 18.x |
| IHM | Next.js | 16.3 |
| IHM | React | 19.x |
| IHM | Node.js | >= 20.9 (Next.js 16.3's minimum) |

Versions are pinned per the project's architecture spine — do not substitute "latest stable" equivalents.
