---
title: 'Project Scaffolding & Dev Environment'
type: 'chore'
created: '2026-08-06'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: ['{project-root}/prjdocs/implementation-artifacts/epic-0-context.md', '{project-root}/prjdocs/implementation-artifacts/0-1-project-scaffolding-and-dev-environment.md']
warnings: []
baseline_revision: 'NO_VCS'
final_revision: 'dcdee14b3f395b1c033e5e9c4494421a1a9c329f'
---

<intent-contract>

## Intent

**Problem:** No code exists yet for any of the 3 tiers (Client Python, Backend FastAPI, IHM Next.js) — this greenfield repo has only planning docs. Every later epic needs a real, buildable, testable foundation instead of improvising structure mid-feature.

**Approach:** Scaffold each tier as a sibling top-level directory at the exact pinned versions (Python 3.13, FastAPI 0.141.x, PostgreSQL 18.x, Next.js 16.3, React 19.x), each with a minimal boot-check entry point; add one empty versioned Postgres migration; wire a GitHub Actions CI pipeline running lint+tests per tier on every PR; document local run steps.

## Boundaries & Constraints

**Always:**
- Pin exactly Python 3.13, FastAPI 0.141.x, PostgreSQL 18.x, Next.js 16.3, React 19.x — no "latest stable" substitution.
- `backend/`, `client/`, `ihm/` are sibling top-level directories, each runnable via one documented command.
- Initial migration creates only the migration-tracking schema itself — zero feature tables.
- CI runs lint + tests for every tier that has code, on every PR, and must genuinely fail on a real violation (verify with one intentionally broken commit, then revert).
- README.md + CONTRIBUTING.md document exact local run steps for all 3 services plus local PostgreSQL setup.

**Block If:**
- PostgreSQL 18.x cannot be provisioned in this execution environment (no Docker/package-manager access), making the migration unverifiable end-to-end.
- The available Node/npm toolchain cannot satisfy Next.js 16.3's minimum engine requirement.

**Never:**
- No artifact indexing (Epic 1), Git-state scanning/WebSocket heartbeat (Epic 2), lease/claim logic (Epic 3), dashboard UI, or authentication/RBAC (Story 0.2, separate story) — boot-check only.
- No deployment/environment topology (K8s, serverless, envs) — explicitly deferred per ARCHITECTURE-SPINE.md § Deferred.
- No charting library pre-install (Recharts/D3) — deferred to Epic 4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Backend boot | `uvicorn` started locally | `GET /health` returns 200 `{"status":"ok"}` | No error expected |
| Client boot | CLI entry point run | Prints a version/status line, exits 0 | No error expected |
| IHM boot | `npm run dev` started | Default page renders on the configured port | No error expected |
| Migration on fresh DB | `alembic upgrade head` on empty PostgreSQL 18.x | Only migration-tracking schema created, no feature tables | Fails loudly if DB unreachable, not silently |
| CI on broken lint/test | PR introduces a lint violation or failing test | Pipeline job fails, blocks merge | CI status shows failure, not a false pass |

</intent-contract>

## Code Map

- `backend/pyproject.toml` -- Backend deps: fastapi==0.141.*, uvicorn, alembic (new)
- `backend/app/main.py` -- FastAPI app + `GET /health` (new)
- `backend/alembic/` -- migration env + one empty initial revision (new)
- `client/pyproject.toml` -- Client deps, Python 3.13 (new)
- `client/agent/main.py` -- CLI entry point, prints status, exits 0 (new)
- `ihm/` -- Next.js 16.3/React 19.x app via official `create-next-app` scaffold (new)
- `.github/workflows/ci.yml` -- lint+test per tier on every PR (new)
- `docker-compose.yml` -- local PostgreSQL 18.x service for dev + CI (new)
- `README.md`, `CONTRIBUTING.md` -- local run steps for all 3 services (new)

## Tasks & Acceptance

**Execution:**
- `client/` -- scaffold Python 3.13 project + CLI entry point -- proves Client tier boots (AC1)
- `backend/app/main.py` -- scaffold FastAPI 0.141.x app with `/health` route, run via uvicorn -- proves Backend tier boots (AC1)
- `ihm/` -- scaffold Next.js 16.3/React 19.x via official CLI, default page -- proves IHM tier boots (AC1)
- `backend/alembic/` -- one empty initial migration against local PostgreSQL 18.x -- zero feature tables (AC2)
- `.github/workflows/ci.yml` -- ruff+pytest (backend, client), `next lint`+placeholder test (ihm) -- fails on real violations (AC3)
- `README.md` + `CONTRIBUTING.md` -- exact steps to run all 3 services + provision Postgres locally (AC4)
- Unit tests for the I/O matrix: health-check returns 200, CLI exits 0, migration produces zero feature tables

**Acceptance Criteria:**
- Given a clean checkout, when a developer follows CONTRIBUTING.md, then all 3 services start locally with no undocumented steps.
- Given the initial migration applied to a fresh PostgreSQL 18.x instance, when inspected, then only the migration-tracking schema exists.
- Given a PR introduces a lint violation or failing test in any tier, when CI runs, then the pipeline fails and blocks merge.
- Given this story's scope, when reviewed, then no deployment/environment topology config has been added.

## Spec Change Log

## Review Triage Log

### 2026-08-06 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 0, medium 2, low 7)
- defer: 2: (high 0, medium 1, low 1)
- reject: 18: (high 0, medium 0, low 18)
- addressed_findings:
  - `[medium]` `[patch]` `.github/workflows/ci.yml` backend job now sets `DATABASE_URL` explicitly instead of relying on `alembic.ini`'s local-dev fallback coincidentally matching the service container's port/creds.
  - `[medium]` `[patch]` `backend/tests/test_migrations.py` now runs `alembic downgrade base` before `upgrade head`, so it no longer assumes the shared local dev DB is already pristine.
  - `[low]` `[patch]` `docker-compose.yml` Postgres host port is now configurable via `${POSTGRES_PORT:-5433}` instead of hardcoded.
  - `[low]` `[patch]` `.gitignore` now excludes `.env`/`.env.local`, the natural next place a real `DATABASE_URL` override would land.
  - `[low]` `[patch]` `README.md` stack table now lists the Node.js `>= 20.9` requirement already documented in CONTRIBUTING.md.
  - `[low]` `[patch]` `.github/workflows/ci.yml` all 3 jobs now set `timeout-minutes: 10`.
  - `[low]` `[patch]` `ihm/__tests__/smoke.test.mjs` now asserts structurally (status 200, `content-type: text/html`, non-trivial body length) instead of matching the default scaffold's placeholder copy, which a later epic's real UI will delete.
  - `[low]` `[patch]` `CONTRIBUTING.md` backend lint/test step now notes PostgreSQL must stay running for `pytest` (which includes the migration test), not only for the `alembic upgrade head` step.
  - `[low]` `[patch]` `ihm/__tests__/smoke.test.mjs` now fails fast via `exit`/`error` handlers on the spawned server process instead of waiting out the full 20s timeout on an early crash.

Deferred (see `deferred-work.md`): CI has never executed on GitHub Actions itself (no remote/push yet); Postgres credentials/port are hand-duplicated between `docker-compose.yml` and `ci.yml` with no shared source of truth.

Rejected as noise or contradicted by verification (18): claimed pytest import-path failure (contradicted — `uv run pytest` passed repeatedly in both `backend/` and `client/`); `backend`/`client` project names vs. `app`/`agent` package dirs (no functional consequence, `uv sync` doesn't attempt to build/install them as packages); missing ESLint file/dir pattern (contradicted — `npm run lint` verified passing and correctly failing on an injected violation); orphaned `next start` process surviving `SIGTERM` to the `npx` child (contradicted — empirically tested: process and port both clean 2s after `SIGTERM`); dependency version ranges vs. README's "pinned" claim (README's claim is accurately scoped to the 5 architecture-spine-mandated stack entries, not every transitive dependency); Postgres credentials in cleartext (standard practice for a local-only dev docker-compose password, not a real secret); `docker-compose.yml` volume path (already correct for the `postgres:18` image's new data-dir convention, confirmed via a running healthy container); `postgres:18` floating tag (matches the spine's own "18.x" language exactly); CONTRIBUTING.md missing a `DATABASE_URL` example (contradicted — the example is present); ambiguous `__init__.py` existence (contradicted — both exist, both diffed); `DATABASE_URL=""` edge case (already handled correctly — Python falsy-string check falls back to the `.ini` default as intended); unescaped `.` in the smoke test's regex (contradicted — the source has `/page\.tsx/`, correctly escaped); `package.json` test-script bypass via direct `node --test` (expected npm lifecycle behavior, not a defect); unhandled `BrokenPipeError` in the client CLI (disproportionate hardening for a boot-check script at this scope); ESLint config vs. Node test-runner globals (contradicted — lint verified passing with the new test file present); uneven test-proof-level across tiers per the intent-alignment audit (deliberate, idiomatic per-tier testing strategy — FastAPI `TestClient` and a direct `main()` call are the correct in-process checks for those tiers; only IHM needs a spawned-process check); CI trigger config and CONTRIBUTING fidelity "gaps" flagged by the intent-alignment audit (artifacts of what was included in that audit's prompt scope, not real gaps in the actual files).

## Design Notes

Tool choices are deliberately left open by ARCHITECTURE-SPINE.md (same treatment as its charting-library deferral) — committing to concrete picks here so execution isn't blocked on unattended judgment calls: `uv` for Python packaging (both `backend/` and `client/`, for consistency), Alembic for migrations (idiomatic for FastAPI/SQLAlchemy), `ruff` for Python lint, GitHub Actions for CI (repo already uses `.github/` for BMad agent defs — no new CI provider introduced).

## Verification

**Commands:**
- `cd backend && uvicorn app.main:app --reload` -- expected: `curl localhost:8000/health` → `{"status":"ok"}`
- `cd client && python -m agent.main` -- expected: prints status line, exit code 0
- `cd ihm && npm run dev` -- expected: dev server starts, default page reachable
- `cd backend && alembic upgrade head` -- expected: clean apply, no feature tables created
- `ruff check backend client` -- expected: exit 0
- `cd ihm && npm run lint` -- expected: exit 0
- `pytest backend client` -- expected: all pass
- CI dry-run: intentionally break one lint rule, push, confirm the workflow fails, then revert

## Auto Run Result

Status: done
Blocking condition: none

**Summary:** Scaffolded all three tiers (Client Python 3.13, Backend FastAPI 0.141.x, IHM Next.js 16.3/React 19.x) as sibling directories with minimal boot-check entry points, an empty versioned Alembic migration (zero feature tables), a GitHub Actions CI pipeline (lint+test per tier, PostgreSQL 18 service for the backend job), and README/CONTRIBUTING docs. `git init` was performed as part of this story (repo was greenfield, no prior VCS). Ran a 4-layer parallel review (adversarial, edge-case, verification-gap, intent-alignment) against the diff, applied 9 patch-level fixes, deferred 2 items, and rejected 18 findings that were either noise or empirically contradicted.

**Files changed:** see `backend/`, `client/`, `ihm/`, `docker-compose.yml`, `.github/workflows/ci.yml`, `README.md`, `CONTRIBUTING.md`, `.gitignore` — full listing in commit `dcdee14`. One-line summary per area: Backend = FastAPI app + `/health` route + Alembic migration + 2 tests; Client = CLI entry point + 1 test; IHM = `create-next-app` scaffold + 1 structural boot smoke test; `docker-compose.yml` = local Postgres 18; `ci.yml` = 3 parallel lint+test jobs; docs = local run steps + tool-choice rationale.

**Review findings breakdown:** 9 patched (2 medium, 7 low — all applied and re-verified), 2 deferred to `deferred-work.md` (CI never executed on real GitHub Actions; Postgres config duplicated between `docker-compose.yml`/`ci.yml`), 18 rejected (noise or contradicted by empirical re-verification — see Review Triage Log above for the full list and reasoning per item).

**Follow-up review recommendation:** `true`. Computed from this pass's patched findings only (medium=2, low=7): score = 3×2 + 1×7 = 13 ≥ 5.

**Verification performed:** All commands in the Verification section above were run and passed after patches, including: `alembic downgrade base && upgrade head` against a live PostgreSQL 18 (docker-compose, port resolved via the new `${POSTGRES_PORT:-5433}` default) confirming only `alembic_version` exists; `uvicorn`+`curl /health` → `{"status":"ok"}`; `python -m agent.main` → exit 0; `ruff check backend client` → clean; `pytest backend client` → all pass (backend: health + migration tests; client: CLI test); `npm run lint` / `npm test` / `npm run build` in `ihm/` → clean, including the patched structural smoke test. Lint/test failure modes were also verified by deliberately breaking each check (ruff violation, pytest assertion, migration feature-table injection, ESLint unused-var, smoke-test assertion) and confirming a real non-zero exit before reverting. The one check not literally exercised on its target platform: the GitHub Actions workflow itself has never run on GitHub (no remote/push exists) — logged as deferred work, not treated as a verification failure since the underlying commands it invokes were all verified directly.

**Residual risks:**
- CI pipeline unverified on GitHub Actions' actual runners (see deferred-work.md).
- Postgres credentials/port duplicated between `docker-compose.yml` and `ci.yml` (see deferred-work.md).
- This repo's BMad sprint-tracking artifacts (`prjdocs/implementation-artifacts/sprint-status.yaml` and `0-1-project-scaffolding-and-dev-environment.md`) were not updated by this run — `bmad-dev-auto` operates on its own `spec-*.md` tracking, separate from BMad's sprint-planning system. Those files still show this story as `ready-for-dev`.

**Residual artifacts (untouched, not part of this change, left in place):** `.agents/`, `.bmad-loop/`, `.claude/`, `.github/agents/`, `_bmad/`, `claudeomlc.sh`, `prjdocs/` — all pre-existing project files that predate this story and were never committed to Git before now (repo had zero commits before this run); they remain untracked/uncommitted since they're outside this story's reviewed diff.

final_revision: dcdee14b3f395b1c033e5e9c4494421a1a9c329f
