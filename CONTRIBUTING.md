# Contributing

Exact local run steps for all three services, plus PostgreSQL setup. This document intentionally stops at "runs locally" — deployment topology (Kubernetes, serverless, environments) is out of scope for this stage of the project and is not documented here.

## Prerequisites

- **Python 3.13** — managed via [`uv`](https://docs.astral.sh/uv/) (installed separately: `curl -LsSf https://astral.sh/uv/install.sh | sh`, or `brew install uv`). `uv` will fetch and pin Python 3.13 itself; you do not need a system Python 3.13 install.
- **Node.js >= 20.9** (Next.js 16.3's minimum) with `npm`.
- **Docker** (for local PostgreSQL 18.x via `docker-compose.yml`) — or a locally installed PostgreSQL 18.x server if you prefer not to use Docker.

## Tooling choices (so later stories don't have to re-derive them)

- **Packaging (`backend/`, `client/`):** [`uv`](https://docs.astral.sh/uv/) — same tool for both Python tiers for consistency.
- **Python lint (`backend/`, `client/`):** [`ruff`](https://docs.astral.sh/ruff/).
- **Migrations (`backend/`):** [Alembic](https://alembic.sqlalchemy.org/) — the idiomatic choice for a FastAPI/SQLAlchemy stack.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — the repo already uses `.github/` for BMad agent definitions, so no new CI provider is introduced.
- **IHM lint/test:** ESLint (`npm run lint`, via the `create-next-app` scaffold) and Node's built-in test runner (`npm test`) as a placeholder until real UI logic (and a real test framework choice, if needed) lands in a later epic.

## 1. PostgreSQL (required before running the Backend)

Start a local PostgreSQL 18.x instance via Docker Compose (from the repo root):

```bash
docker compose up -d postgres
```

This provisions PostgreSQL 18 on `localhost:5433` (mapped to avoid clashing with any PostgreSQL you may already have on the default `5432`) with:

- user: `bmad`
- password: `bmad`
- database: `bmad_portal`

To stop it: `docker compose down` (add `-v` to also drop the data volume).

If you'd rather not use Docker, install PostgreSQL 18.x locally and create a database/role matching the above (or set `DATABASE_URL` per step 2 below to point at your own instance).

## 2. Backend (FastAPI)

```bash
cd backend
uv sync                      # installs pinned deps into backend/.venv, incl. dev tools
uv run alembic upgrade head  # applies the initial (empty) migration; needs Postgres from step 1 running
uv run uvicorn app.main:app --reload
```

Verify: `curl localhost:8000/health` → `{"status":"ok"}`.

By default, Alembic connects to `postgresql+psycopg://bmad:bmad@localhost:5433/bmad_portal` (matching `docker-compose.yml`). To point at a different PostgreSQL instance, set the `DATABASE_URL` environment variable before running Alembic commands, e.g.:

```bash
DATABASE_URL="postgresql+psycopg://<user>:<pass>@<host>:<port>/<db>" uv run alembic upgrade head
```

Lint and test (PostgreSQL from step 1 must still be running — `pytest` includes migration and auth tests that connect to it):

```bash
uv run ruff check .
uv run pytest
```

### Auth / RBAC env vars

The Backend's auth substrate (Story 0.2) signs JWT bearer tokens with `JWT_SECRET_KEY`. Like `DATABASE_URL`, it follows the same explicit-env-var convention: CI sets it explicitly (`.github/workflows/ci.yml`), local dev falls back to a documented non-secret default (`dev-only-insecure-secret-do-not-use-in-prod`, see `backend/app/config.py` / `.env.example`). To override it locally:

```bash
JWT_SECRET_KEY="some-other-dev-secret" uv run uvicorn app.main:app --reload
```

### Auth walkthrough (curl)

With the Backend running (`uv run uvicorn app.main:app --reload`) and PostgreSQL up, exercise register → login → the role-gated `/admin/ping` route:

```bash
# Register an admin and a developer
curl -s -X POST localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"correct-horse","role":"admin"}'

curl -s -X POST localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"correct-horse","role":"developer"}'

# Log in as each, capture the bearer token
ADMIN_TOKEN=$(curl -s -X POST localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"correct-horse"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

DEV_TOKEN=$(curl -s -X POST localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@example.com","password":"correct-horse"}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')

# Admin-only route: 200 for the admin token, 403 for the developer token, 401 with no token
curl -i -s localhost:8000/admin/ping -H "Authorization: Bearer $ADMIN_TOKEN" | head -1
curl -i -s localhost:8000/admin/ping -H "Authorization: Bearer $DEV_TOKEN" | head -1
curl -i -s localhost:8000/admin/ping | head -1
```

## 3. Client (Python agent)

```bash
cd client
uv sync
uv run python -m agent.main
```

Verify: prints a version/status line and exits `0`.

Lint and test:

```bash
uv run ruff check .
uv run pytest
```

## 4. IHM (Next.js)

```bash
cd ihm
npm install
npm run dev
```

Verify: open `http://localhost:3000` — the default Next.js starter page renders.

Lint and test:

```bash
npm run lint
npm test
```

## CI

Every PR runs, via `.github/workflows/ci.yml`:

- **Backend:** `ruff check .` + `pytest` (in `backend/`)
- **Client:** `ruff check .` + `pytest` (in `client/`)
- **IHM:** `npm run lint` + `npm test` (in `ihm/`)

A lint violation or failing test in any tier fails that tier's job and blocks merge.

## Out of scope here

Deployment/environment topology (Kubernetes vs. serverless, staging/prod environments) is explicitly undecided at this stage of the project and is not covered by this document or by anything in `docker-compose.yml` (which exists solely to provision a local dev/CI PostgreSQL instance, not to define a deployment topology).
