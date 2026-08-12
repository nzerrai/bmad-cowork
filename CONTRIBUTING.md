# Contributing

Exact local run steps for all four tiers, plus PostgreSQL setup. This document intentionally stops at "runs locally" — deployment topology (Kubernetes, serverless, environments) is out of scope for this stage of the project and is not documented here.

## Prerequisites

- **Python 3.13** — managed via [`uv`](https://docs.astral.sh/uv/) (installed separately: `curl -LsSf https://astral.sh/uv/install.sh | sh`, or `brew install uv`). `uv` will fetch and pin Python 3.13 itself; you do not need a system Python 3.13 install.
- **Node.js >= 20.9** (Next.js 16.3's minimum) with `npm`. Running `npm test` in either `ihm/` or `vscode-extension/` needs **Node.js >= 22.3** (node:test's `--experimental-test-module-mocks`, which both tiers' test scripts use) — `npm run dev`/`build`/`compile`/`lint` only need the 20.9 floor above.
- **Docker** (for local PostgreSQL 18.x via `docker-compose.yml`) — or a locally installed PostgreSQL 18.x server if you prefer not to use Docker.

## Tooling choices (so later stories don't have to re-derive them)

- **Packaging (`backend/`, `client/`):** [`uv`](https://docs.astral.sh/uv/) — same tool for both Python tiers for consistency.
- **Python lint (`backend/`, `client/`):** [`ruff`](https://docs.astral.sh/ruff/).
- **Migrations (`backend/`):** [Alembic](https://alembic.sqlalchemy.org/) — the idiomatic choice for a FastAPI/SQLAlchemy stack.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — the repo already uses `.github/` for BMad agent definitions, so no new CI provider is introduced.
- **IHM lint/test:** ESLint (`npm run lint`, via the `create-next-app` scaffold) and Node's built-in test runner (`npm test`) as a placeholder until real UI logic (and a real test framework choice, if needed) lands in a later epic.
- **VS Code Extension packaging/lint/test:** TypeScript ^5 compiled via `tsc` (matching the IHM tier's conventions, since the architecture spine has no dedicated Epic 7 entry), ESLint flat config (`npm run lint`), Node's built-in test runner (`npm test`), and [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce) (`npm run package`) to produce a locally installable `.vsix` — no Marketplace publish.

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

### Artifact indexing env var

The Backend's artifact indexing engine (Story 1.1) scans `ARTIFACT_ROOT` for BMAD artifacts. Like `DATABASE_URL`/`JWT_SECRET_KEY`, it follows the same explicit-env-var convention: CI sets it explicitly (`.github/workflows/ci.yml`), local dev falls back to this repo's own `prjdocs/` directory (see `backend/app/indexing/config.py` / `.env.example`). To override it locally:

```bash
ARTIFACT_ROOT="/path/to/other/artifact/root" uv run python -m app.indexing.cli
```

### CORS / IHM origin env var

The Backend allows cross-origin requests from the IHM (Story 1.2, `GET /artifacts/health` and any future browser-facing route) via `IHM_ORIGIN`. Same explicit-env-var convention as `JWT_SECRET_KEY`/`ARTIFACT_ROOT`: CI sets it explicitly (`.github/workflows/ci.yml`), local dev falls back to the IHM's default dev port (`http://localhost:3000`, see `backend/app/config.py` / `.env.example`). Only needs overriding if you run the IHM on a different port:

```bash
IHM_ORIGIN="http://localhost:3001" uv run uvicorn app.main:app --reload
```

### Artifact indexing walkthrough

With PostgreSQL up and migrations applied (`uv run alembic upgrade head`), run a one-shot scan:

```bash
uv run python -m app.indexing.cli
```

This walks `ARTIFACT_ROOT`, classifies each matched file by its directory/filename convention (Brief, PRD, Architecture, UX, Specs, Epics, Stories — see `app/indexing/types.py`), parses its frontmatter, and upserts the `artifacts`/`artifact_links` tables. It's idempotent: re-running after no changes reports everything as `unchanged`; a malformed frontmatter block is caught per-file and recorded on that row's `error` column rather than aborting the run. There is no HTTP endpoint yet — Stories 1.2/1.3 add read endpoints when the dashboard/matrix need to serve this data.

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

### Client env vars

The Client agent had zero env-driven config until Story 2.1's WebSocket module (`client/agent/realtime.py`). **Note:** `connect_and_run` itself takes `url`/`token`/`heartbeat_interval` as plain function parameters and does not read these env vars directly — they document the values a future story's `main.py` wiring (Story 2.2+) is expected to read and pass in. Same explicit-env-var convention as the Backend's vars above; local dev falls back to the documented defaults below (see `client/.env.example`):

- `BACKEND_WS_URL` — the Backend's WebSocket endpoint, default `ws://localhost:8000/ws`.
- `HEARTBEAT_INTERVAL_SECONDS` — seconds between heartbeat messages, default `10`.
- `BMAD_AUTH_TOKEN` — **temporary stand-in** for a real Client identity/auth flow (Story 2.3 will replace this): hand-copy a bearer token from the [Auth walkthrough](#auth-walkthrough-curl) below.

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

### IHM env var

The IHM calls the Backend at `NEXT_PUBLIC_API_BASE_URL` (`ihm/lib/auth.ts`, Story 1.2). Next.js reads `.env*` from this app directory (not the repo root) and inlines `NEXT_PUBLIC_*` vars at build time; the default below (in code, not requiring the var to be set) already matches the Backend's local dev server:

```bash
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000" npm run dev
```

The IHM's WebSocket module (`ihm/lib/websocket.ts`, Story 2.1) reads `NEXT_PUBLIC_WS_BASE_URL` the same way, defaulting to `ws://localhost:8000/ws`:

```bash
NEXT_PUBLIC_WS_BASE_URL="ws://localhost:8000/ws" npm run dev
```

### Artifact Health Dashboard walkthrough

With the Backend running (`uv run uvicorn app.main:app --reload`), PostgreSQL up, artifacts indexed (`uv run python -m app.indexing.cli`, from `backend/`), and the IHM running (`npm run dev`, from `ihm/`):

1. Open `http://localhost:3000/login` and sign in with a user registered via the [Auth walkthrough](#auth-walkthrough-curl) above (or the `curl`/`register` call directly).
2. On success you're redirected to `http://localhost:3000/hub/dashboard`. Navigate to `http://localhost:3000/artifacts`, which calls `GET /artifacts/health` and renders two tables: a per-type completeness rollup (all 11 FR1 types, `complete`/`incomplete`/`missing`) and a per-artifact table (type, title, file path, sync status against disk, and outbound links — broken links render distinctly rather than being dropped).
3. To see a `stale`/`deleted` sync status live: edit or delete an already-indexed file under `ARTIFACT_ROOT` without re-running the CLI scan, then reload `/artifacts`.

### Traceability Matrix walkthrough

With the Backend running (`uv run uvicorn app.main:app --reload`), PostgreSQL up, artifacts indexed (`uv run python -m app.indexing.cli`, from `backend/`), and the IHM running (`npm run dev`, from `ihm/`):

1. Call `GET /artifacts/traceability` directly (with a bearer token from the [Auth walkthrough](#auth-walkthrough-curl)), or open `http://localhost:3000/artifacts/traceability` (linked from `/artifacts`) after signing in.
2. Either way you get one row per Epic/Story pair defined in `prjdocs/planning-artifacts/epics.md`'s roadmap — not just the ones with a story file on disk — with a status per lineage stage: `idea_brief`/`prd`/`architecture`/`ux` reflect that type's overall completeness (same value on every row), `story` reflects the matching indexed Story file's own `completed`/`pending`/`not_started` state, and `prs`/`tests` are always `not_started` in this MVP (no Git/PR integration yet).

### Real-time WebSocket Pillar walkthrough

There is no clickable UI yet for Story 2.1 (Task 5 deliberately doesn't wire `ihm/lib/websocket.ts` into any page — Story 3.3's Real-time Status Bar will do that). The verification path is manual: open two authenticated WebSocket connections against the Backend and observe the presence broadcast when the second one connects/disconnects.

With the Backend running (`uv run uvicorn app.main:app --reload`) and PostgreSQL up:

1. Register + log in two users (reuse the [Auth walkthrough](#auth-walkthrough-curl) above) to get two bearer tokens, `TOKEN_A` and `TOKEN_B`.
2. Open the first connection, e.g. with the Client's own `websockets` dependency (from `client/`, after `uv sync`):

   ```bash
   uv run python -c "
   import asyncio, websockets

   async def main():
       async with websockets.connect('ws://localhost:8000/ws?token=$TOKEN_A') as ws:
           async for message in ws:
               print(message)

   asyncio.run(main())
   "
   ```

   (Alternatively, any WebSocket CLI you already have works the same way, e.g. `websocat "ws://localhost:8000/ws?token=$TOKEN_A"`.)

3. In a second terminal, open the same command with `TOKEN_B`. The first terminal prints a `{"type": "presence", "event": "connected", "user_id": "<user_b's id>"}` message.
4. Ctrl-C the second terminal. The first prints `{"type": "presence", "event": "disconnected", "user_id": "<user_b's id>"}`.

## 5. VS Code Extension

```bash
cd vscode-extension
npm install
npm run compile   # tsc -> out/extension.js
```

Lint and test:

```bash
npm run lint
npm test
```

Package into a locally installable `.vsix` (backed by `@vscode/vsce`; no Marketplace publish involved):

```bash
npm run package
```

Verify: `vscode-extension/bmad-portal-vscode-<version>.vsix` exists. To run it interactively, open `vscode-extension/` in VS Code and press `F5` (Extension Development Host) — confirm the "BMad Portal" status bar item appears and the BMad Portal activity-bar icon opens the (placeholder) dashboard view with no console errors. See `vscode-extension/README.md` for the full command/settings reference.

## CI

Every PR runs, via `.github/workflows/ci.yml`:

- **Backend:** `ruff check .` + `pytest` (in `backend/`)
- **Client:** `ruff check .` + `pytest` (in `client/`)
- **IHM:** `npm run lint` + `npm test` (in `ihm/`)
- **VS Code Extension:** `npm run lint` + `npm run compile` + `npm test` + `npm run package` (in `vscode-extension/`)

A lint violation or failing test in any tier fails that tier's job and blocks merge.

## Out of scope here

Deployment/environment topology (Kubernetes vs. serverless, staging/prod environments) is explicitly undecided at this stage of the project and is not covered by this document or by anything in `docker-compose.yml` (which exists solely to provision a local dev/CI PostgreSQL instance, not to define a deployment topology).
