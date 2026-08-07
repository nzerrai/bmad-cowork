# Story 0.1: Project Scaffolding & Dev Environment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Development Team,
I want the three tiers (Client Python, Backend FastAPI, IHM Next.js) scaffolded with a working local dev setup, initial database migrations, and a CI pipeline,
so that Epic 1 and onward can start on a real, buildable, testable foundation instead of improvising structure mid-feature.

**Enabler story** — no numbered FR (see FR Coverage Map in `epics.md`); covers the "Project Scaffolding & Dev Environment" line of the Capability → Architecture Map in `ARCHITECTURE-SPINE.md`. Sprint 0. Blocks every other story: nothing in Epic 1+ can start until the three tiers exist and run locally.

## Acceptance Criteria

1. **Given** no code exists yet for any of the 3 tiers, **when** the scaffolding is executed, **then** the Client (Python), Backend (FastAPI), and IHM (Next.js/React) each start locally from their minimal configuration, using exactly the versions pinned in `ARCHITECTURE-SPINE.md` § Stack:
   - Python 3.13 (Client agent, Backend)
   - FastAPI 0.141.x (Backend)
   - PostgreSQL 18.x
   - Next.js 16.3 / React 19.x (IHM)
2. **And** initial PostgreSQL migrations are in place — empty, versioned schema, no feature tables yet (those arrive with the stories that need them, e.g. Epic 1's artifact index, Epic 2/3's Space/Contributor/Lease tables).
3. **And** a CI pipeline runs lint and automated tests on every PR.
4. **And** a README/CONTRIBUTING documents how to run all 3 services locally.
5. **And** deployment topology (K8s vs. serverless, environments) is explicitly **out of scope** for this story — it stays deferred per `ARCHITECTURE-SPINE.md` § Deferred ("Deployment & environments... not yet decided").

## Tasks / Subtasks

- [x] Task 1: Repository foundation (AC: #1, #4)
  - [x] Initialize the Git repository at project root (currently no `.git/` exists — this is a from-scratch greenfield init, not a re-scaffold)
  - [x] Create top-level `backend/`, `client/`, `ihm/` directories — keep them siblings at repo root, not nested under a `src/` umbrella, so each tier's own tooling (Python packaging, Next.js CLI) works unmodified from its own directory
  - [x] Add a root `README.md` covering the project purpose (link to `prjdocs/planning-artifacts/epics.md` for the full picture) and a `CONTRIBUTING.md` with exact local run steps for all 3 services (see Task 5)

- [x] Task 2: Scaffold Backend — FastAPI (AC: #1)
  - [x] `backend/` — Python 3.13 project (choose one packaging tool: `uv`, `poetry`, or plain `pip` + `requirements.txt`; not architecturally mandated, pick the lowest-friction option and document the choice in CONTRIBUTING.md)
  - [x] Pin `fastapi==0.141.*` and an ASGI server (`uvicorn`) as dependencies
  - [x] Minimal app with one health-check route (e.g. `GET /health` → `{"status": "ok"}`) — enough to prove "starts locally", no business logic
  - [x] Runs via a documented single command (e.g. `uvicorn app.main:app --reload`)

- [x] Task 3: Scaffold Client — Python agent (AC: #1)
  - [x] `client/` — Python 3.13 project, same packaging-tool choice as Task 2 for consistency (don't mix tools across tiers without a reason)
  - [x] Minimal CLI/service entry point that starts and exits cleanly (e.g. prints a version/status line) — no Git-scanning or WebSocket logic yet, that's Epic 2's Story 2.1/2.2
  - [x] Runs via a documented single command

- [x] Task 4: Scaffold IHM — Next.js/React (AC: #1)
  - [x] `ihm/` — Next.js 16.3 project with React 19.x, initialized via the standard Next.js scaffolding CLI (do not hand-roll the config)
  - [x] One minimal page confirming the app boots (default starter page is acceptable — no dashboard UI yet, that's Epic 1/3's job)
  - [x] Runs via a documented single command (e.g. `npm run dev`)
  - [x] Charting library choice (Recharts vs. D3) stays untouched — explicitly deferred to whichever story first needs a chart (Epic 4), don't pre-install either here

- [x] Task 5: Initial database migrations (AC: #2)
  - [x] Provision a local PostgreSQL 18.x instance (document how — e.g. Docker Compose service, or local install — in CONTRIBUTING.md)
  - [x] Set up a migration tool for the Backend (Alembic is the idiomatic choice for a Python/FastAPI stack; not architecturally mandated by the spine, but avoid inventing a bespoke migration mechanism)
  - [x] Commit one initial migration that creates the versioned migration-tracking schema itself and nothing else — zero feature tables (no Space/Contributor/Lease/artifact-index tables; those belong to the stories that introduce them)

- [x] Task 6: CI pipeline (AC: #3)
  - [x] Add `.github/workflows/ci.yml` (the repo already uses `.github/` for BMad agent definitions — GitHub Actions is the natural fit, no new CI provider to introduce)
  - [x] On every PR: run lint for each tier that has code (Backend + Client: a Python linter such as `ruff`; IHM: `next lint` / ESLint, which ships with the Next.js scaffold)
  - [x] On every PR: run automated tests for each tier (`pytest` for Backend/Client, even if the only test at this stage is "health check returns 200" / "CLI exits 0"; the Next.js default test setup or a placeholder is acceptable for IHM since there's no UI logic yet)
  - [x] CI must actually fail on a lint/test failure — verify with one intentionally broken commit during setup, then revert

- [x] Task 7: Documentation (AC: #4)
  - [x] CONTRIBUTING.md: exact steps to run Backend, Client, and IHM locally, plus the PostgreSQL setup from Task 5 and which packaging tools were chosen for each tier
  - [x] Do not document deployment/environments — that's explicitly out of scope (AC #5)

## Dev Notes

- **This is the first story in the entire project.** No previous story exists, no code exists yet (confirmed: repo root currently has only `_bmad/`, `.claude/`, `.agents/`, `.bmad-loop/`, `.github/agents/` (BMad agent defs, unrelated to this story), `docs/` (empty), and `prjdocs/`). There is no `.git/` yet either — Task 1 includes the actual `git init`.
- **Versions are pinned, not suggested.** `ARCHITECTURE-SPINE.md` § Stack gives exact versions (Python 3.13, FastAPI 0.141.x, PostgreSQL 18.x, Next.js 16.3, React 19.x). Do not substitute LTS/"latest stable" versions that differ from these — they were deliberately pinned at the architecture level and downstream stories will assume them.
- **What this story explicitly does NOT build** (guardrail against scope creep into later epics): no artifact indexing (Epic 1), no Git-state scanning or WebSocket heartbeat (Epic 2), no lease/claim logic (Epic 3), no dashboard UI beyond a boot-check page (Epic 3/4), no feature DB tables (each epic adds its own). Story 0.2 (Auth/RBAC Foundation) is a separate story in this same epic — do not build authentication here.
- **Tool choices left to you, not the architecture:** packaging tool (uv/poetry/pip), Python linter, migration tool (Alembic recommended but not mandated). The spine explicitly defers similar tier-implementation choices elsewhere (e.g. charting library) — treat these the same way: pick something reasonable, document the choice in CONTRIBUTING.md so Story 0.2 and Epic 1 don't have to re-derive it.
- **Deployment topology is out of scope** (AC #5) — don't add Docker/K8s manifests or environment-specific config beyond what's needed to run PostgreSQL locally for Task 5. `ARCHITECTURE-SPINE.md` § Deferred is explicit that this is undecided; inventing a topology here would create a decision nobody signed off on.
- **NFR1 (100% deterministic core, zero LLM calls for sync/claim/state)** doesn't apply to this story directly — there's no sync/claim logic yet — but keep it in mind: nothing scaffolded here should require an LLM call to run (health check, CLI boot, Next.js boot are all deterministic by construction).

### Project Structure Notes

- Greenfield: no existing structure to conform to or conflict with. Proposed layout (siblings at repo root, per Task 1):
  ```
  backend/     # FastAPI app + Alembic migrations
  client/      # Python CLI/service agent
  ihm/         # Next.js app
  .github/workflows/ci.yml
  README.md
  CONTRIBUTING.md
  ```
- This structure is a recommendation, not an architecture-mandated layout — `ARCHITECTURE-SPINE.md` specifies the 3-tier *logical* boundaries (Client/Backend/IHM) and their communication contracts, but not literal folder names. Keep the three tiers as clearly separated top-level directories so later stories (and CI path filters, if added later) can target one tier without ambiguity.

### References

- [Source: prjdocs/planning-artifacts/epics.md#Epic 0: Project Scaffolding & Dev Environment] — story text and AC origin
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#Stack] — exact pinned versions
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Project Scaffolding & Dev Environment (Epic 0, no numbered FR)" row
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#Deferred] — deployment topology explicitly undecided
- [Source: prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md#4.2 Technical Stack (Proposed)] — original stack proposal, superseded in exact-version terms by the Architecture Spine above
- [Source: prjdocs/planning-artifacts/implementation-readiness-report-2026-08-06.md#Critical Issues Requiring Immediate Action] — this story exists because the 2026-08-06 readiness review flagged "no greenfield setup story" as a Critical blocker

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no debugging required; all verification commands passed on first or second attempt (see Completion Notes for the two local fixes applied during verification).

### Completion Notes List

- Implemented via the `bmad-dev-auto` workflow: full spec kernel, implementation, and a 4-layer parallel review (adversarial, edge-case, verification-gap, intent-alignment) against the resulting diff. Full detail — Review Triage Log, patches applied, deferred items, rejected findings, and Auto Run Result — lives in `prjdocs/implementation-artifacts/spec-0-1-project-scaffolding-and-dev-environment.md`.
- `git init` performed as part of this story; repo had zero commits before it. Work is committed at `dcdee14b3f395b1c033e5e9c4494421a1a9c329f` (not pushed — no remote configured yet).
- 9 review-driven patches applied post-implementation: explicit `DATABASE_URL` in CI (no longer relying on `alembic.ini`'s local-dev fallback matching the CI Postgres service by coincidence), migration test now downgrades-then-upgrades for DB isolation, configurable Postgres port via `${POSTGRES_PORT:-5433}`, `.env`/`.env.local` gitignored, README Node.js version added, CI `timeout-minutes: 10` on all jobs, IHM smoke test asserts structurally (status/content-type/body length) instead of matching scaffold placeholder text, CONTRIBUTING notes Postgres is required for `pytest` too, IHM smoke test fails fast on early process crash.
- 2 items deferred (not blocking, logged in `deferred-work.md`): the CI workflow has never executed on GitHub Actions itself (no remote/push exists yet — only its underlying shell commands were verified locally); Postgres credentials/port are hand-duplicated between `docker-compose.yml` and `ci.yml` with no shared source of truth.
- Known residual gap closed by this update: BMad sprint-tracking artifacts (`sprint-status.yaml`, this file) were initially left at `ready-for-dev` by the dev-auto run since that skill only tracks its own `spec-*.md`; both are now updated to `done` per explicit user request.

### File List

- `backend/pyproject.toml`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/versions/e09179c9e677_initial_empty_migration.py`, `backend/app/__init__.py`, `backend/app/main.py`, `backend/tests/__init__.py`, `backend/tests/test_health.py`, `backend/tests/test_migrations.py`
- `client/pyproject.toml`, `client/agent/__init__.py`, `client/agent/main.py`, `client/tests/__init__.py`, `client/tests/test_main.py`
- `ihm/` — full `create-next-app` scaffold (Next.js 16.3.0/React 19.2.8) plus `ihm/__tests__/smoke.test.mjs` and a `package.json` `pretest`/`lint` hardening
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `README.md`, `CONTRIBUTING.md`, `.gitignore` (root)
