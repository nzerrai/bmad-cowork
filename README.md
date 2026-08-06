# BMad Portal Hub

A three-tier system for tracking and coordinating BMad-driven development work:

- **`client/`** — a Python agent that runs on a developer's machine, owning the local filesystem and Git operations.
- **`backend/`** — a FastAPI service that owns orchestration and temporal state (sessions, leases, artifact index) backed by PostgreSQL.
- **`ihm/`** — a Next.js/React dashboard for visualizing project state.

For the full product picture (epics, requirements, architecture), see [`prjdocs/planning-artifacts/epics.md`](prjdocs/planning-artifacts/epics.md).

## Status

This repository is at **Epic 0: Project Scaffolding & Dev Environment** — each tier boots locally with a minimal boot-check entry point (health route, CLI status line, default page). No feature functionality (artifact indexing, Git-state sync, lease/claim logic, dashboard UI, authentication) has landed yet; those arrive in later epics/stories.

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
