---
title: 'Authentication & RBAC Foundation'
type: 'feature'
created: '2026-08-06'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: ['{project-root}/prjdocs/implementation-artifacts/epic-0-context.md', '{project-root}/prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md']
warnings: []
baseline_revision: 'dcdee14b3f395b1c033e5e9c4494421a1a9c329f'
final_revision: '76a49afe057e826aaa9b5b22af87706ab6a50907'
---

<intent-contract>

## Intent

**Problem:** The Backend (Story 0.1) has no authentication or authorization — every route is open, and no session/role identity exists for the role-gated surfaces (Epic 6, claim ownership, contributor identity) that later epics assume already work.

**Approach:** Add a Backend-owned email/password identity substrate: password-hashed `User` records with one of five fixed roles, a stateless JWT bearer session issued on login, a `get_current_user` dependency that resolves the authenticated user+role on every protected request, and a `require_role` dependency for per-route RBAC — demonstrated on one concrete admin-only route.

## Boundaries & Constraints

**Always:**
- Auth lives entirely in the Backend (per `ARCHITECTURE-SPINE.md`); IHM/Client never validate tokens or store passwords.
- Passwords are hashed with bcrypt; plaintext passwords are never persisted or logged.
- JWT tokens carry `sub` (user id) and `role`; every protected route resolves the current user via one shared dependency, never ad hoc header parsing.
- `role` is exactly one of: `developer`, `product_manager`, `architect_tech_lead`, `ux_designer`, `admin`.
- An unauthenticated or malformed/expired-token request to a protected route returns 401, never a default/empty payload.
- A role-gated route rejects the wrong role with 403.
- `DATABASE_URL`/`JWT_SECRET_KEY` follow Story 0.1's explicit-env-var convention: CI sets both explicitly; local dev falls back to documented defaults.

**Block If:**
- PostgreSQL (Story 0.1's docker-compose service) cannot be reached to apply/verify the new `users` table migration.
- `bcrypt`/`pyjwt` cannot be installed via `uv sync` in this environment.

**Never:**
- No SSO/OAuth provider, password reset/email verification, refresh tokens, or logout/session-revocation blocklist — deferred per `ARCHITECTURE-SPINE.md` § Deferred.
- No IHM login UI or Client-side auth — out of scope tiers for this story.
- No Admin-management UI/endpoints for assigning roles post-registration (Epic 6) — `/auth/register` accepting a `role` field is this story's only bootstrap mechanism.
- No fine-grained per-action permission matrix beyond role-gated route access — deferred per `ARCHITECTURE-SPINE.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register new user | valid email + password + role | 201, user created, hashed password never returned | - |
| Register duplicate email | email already registered | 409 Conflict, no user created | Generic conflict message |
| Login, valid credentials | correct email + password | 200, JWT bearer token returned | - |
| Login, wrong credentials | unknown email or wrong password | 401 "invalid credentials" | Generic message, no field hint |
| Protected route, no token | missing `Authorization` header | 401 | Rejected outright, no route body |
| Protected route, bad token | garbage or expired JWT | 401 | Rejected outright, no route body |
| Role-gated route, wrong role | valid token, role ≠ required | 403 | Admin-only body never returned |
| Role-gated route, correct role | valid token, role = required | 200 | Route body returned |

</intent-contract>

## Code Map

- `backend/app/db.py` -- SQLAlchemy engine/session factory, reads `DATABASE_URL` (new)
- `backend/app/config.py` -- `JWT_SECRET_KEY`/`JWT_ALGORITHM`/`JWT_EXPIRE_MINUTES` from env with dev defaults (new)
- `backend/app/auth/models.py` -- SQLAlchemy `User` model + `Role` enum (new)
- `backend/app/auth/schemas.py` -- Pydantic `RegisterRequest`/`LoginRequest`/`TokenResponse`/`UserOut` (new)
- `backend/app/auth/security.py` -- bcrypt hash/verify, JWT encode/decode (new)
- `backend/app/auth/dependencies.py` -- `get_current_user`, `require_role` (new)
- `backend/app/auth/router.py` -- `POST /auth/register`, `POST /auth/login` (new)
- `backend/app/main.py` -- mount auth router, add demo `GET /admin/ping` (admin-only) (modify)
- `backend/alembic/versions/<rev>_add_users_table.py` -- `users` table + role enum (new)
- `backend/pyproject.toml` -- add `bcrypt`, `pyjwt` deps (modify)
- `.env.example` -- documents `DATABASE_URL`/`JWT_SECRET_KEY` dev defaults (new)
- `.github/workflows/ci.yml` -- backend job sets `JWT_SECRET_KEY` explicitly (modify)
- `README.md`, `CONTRIBUTING.md` -- document auth env vars + curl walkthrough (modify)
- `backend/tests/test_auth.py` -- covers I/O matrix (new)

## Tasks & Acceptance

**Execution:**
- `backend/app/db.py` -- add SQLAlchemy engine/sessionmaker reading `DATABASE_URL` (same fallback as `alembic.ini`) -- gives auth code a DB session
- `backend/app/config.py` -- add settings for `JWT_SECRET_KEY` (dev default), `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=60` -- centralizes JWT config
- `backend/alembic/versions/<rev>_add_users_table.py` -- create `users` table (id, email unique, hashed_password, role enum, created_at) -- persists identities (AC1)
- `backend/app/auth/models.py` + `schemas.py` -- `User` ORM model, `Role` enum, request/response schemas -- typed contract for auth endpoints
- `backend/app/auth/security.py` -- `hash_password`/`verify_password` (bcrypt), `create_access_token`/`decode_access_token` (JWT) -- core crypto (AC1)
- `backend/app/auth/dependencies.py` -- `get_current_user` (decode Bearer, 401 on missing/invalid/expired), `require_role(*roles)` (403 on mismatch) -- enforcement substrate (AC2, AC3)
- `backend/app/auth/router.py` -- `POST /auth/register` (201/409), `POST /auth/login` (200/401) -- session establishment (AC1)
- `backend/app/main.py` -- include auth router; add `GET /admin/ping` behind `require_role("admin")` -- concrete role-gated route proving AC2/AC3
- `backend/tests/test_auth.py` -- unit tests for every I/O matrix row
- `.env.example`, `README.md`, `CONTRIBUTING.md` -- document `JWT_SECRET_KEY`/`DATABASE_URL` and a curl walkthrough (register → login → call `/admin/ping` with and without the right role)
- `.github/workflows/ci.yml` -- backend job env sets `JWT_SECRET_KEY` explicitly (same rationale as its existing explicit `DATABASE_URL`)

**Acceptance Criteria:**
- Given a registered user with valid credentials, when they `POST /auth/login`, then they receive a JWT bearer token, and every subsequent request bearing it resolves to that user's id and role via `get_current_user`.
- Given a valid token for a non-admin role, when that user calls `GET /admin/ping`, then the response is 403 and the endpoint's admin-only body is never returned.
- Given no `Authorization` header or an invalid/expired token, when a protected route is called, then the response is 401 and no route body is ever returned.
- Given the `users` table migration applied to a fresh PostgreSQL 18.x instance, when inspected, then it adds exactly one new table (`users`) beyond `alembic_version`.

## Spec Change Log

## Review Triage Log

### 2026-08-07 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 12: (high 0, medium 4, low 8)
- defer: 2: (high 0, medium 1, low 1)
- reject: 8: (high 1, medium 1, low 6)
- addressed_findings:
  - `[low]` `[patch]` `backend/app/auth/router.py` `login()` now runs a dummy bcrypt comparison on the unknown-email path so lookup time no longer leaks whether an email is registered.
  - `[low]` `[patch]` `backend/app/auth/schemas.py` `RegisterRequest.password` now enforces a minimum length; empty/trivial passwords are rejected with 422 instead of accepted.
  - `[medium]` `[patch]` `backend/app/auth/schemas.py`/`security.py` password length (byte-length, ≤72) and null-byte content are now validated before hashing, returning 422 instead of an unhandled 500 from bcrypt.
  - `[low]` `[patch]` `backend/app/auth/schemas.py` email fields now get a basic format check (no external dependency added) rejecting obviously-malformed input.
  - `[medium]` `[patch]` `backend/alembic/versions/bb90a694c827_add_users_table.py` `downgrade()` now drops the `role` enum with `checkfirst=True` instead of `False`, so a re-run after partial failure no longer hard-crashes the downgrade (this migration's up/down cycle runs on every `test_auth.py`/`test_migrations.py` invocation).
  - `[low]` `[patch]` `backend/tests/test_auth.py` `test_login_unknown_email_returns_401`'s misleading `"field" not in detail` assertion replaced with a direct equality check against the generic "Invalid credentials" message.
  - `[medium]` `[patch]` `backend/tests/test_auth.py` gained a test asserting an expired JWT is rejected with 401 — closes an I/O-matrix coverage gap (the matrix's "garbage or expired JWT" row was only exercised by the garbage-token case).
  - `[low]` `[patch]` `backend/app/auth/schemas.py` email fields now capped at 320 chars (matching the DB column) so an oversized email is rejected with 422 instead of an unhandled DB error.
  - `[medium]` `[patch]` `backend/app/auth/router.py` `register()`/`login()` now normalize email (strip + lowercase) before the uniqueness check, storage, and lookup, so `Foo@x.com` and `foo@x.com` are correctly treated as the same account.
  - `[low]` `[patch]` `backend/app/config.py` `JWT_SECRET_KEY` now falls back to the dev default when the env var is unset *or* set to an empty string, instead of only when unset.
  - `[low]` `[patch]` `backend/tests/test_auth.py` gained a test covering the duplicate-email `IntegrityError` commit-time fallback branch (previously dead code from the test suite's perspective).
  - `[low]` `[patch]` `backend/tests/test_auth.py` gained a test asserting a token for a since-deleted user is rejected with 401.

Deferred (see `deferred-work.md`): no rate limiting/brute-force protection on `/auth/login` or `/auth/register`; the Postgres enum type is named the generic `role` rather than `user_role`, risking a future naming collision.

Rejected as out of scope or noise (8): `/auth/register` accepting a client-supplied `role` (privilege self-escalation on paper) is this story's explicitly documented interim bootstrap mechanism per the spec's Design Notes and "Never" list — no Epic 6 admin-management UI exists yet to gate it any other way; the dev-default `JWT_SECRET_KEY` having no startup/production safeguard is out of scope while deployment topology and any "production" environment concept remain explicitly deferred per `ARCHITECTURE-SPINE.md` § Deferred; the claim that `.env.example`/CONTRIBUTING.md document an unimplemented dotenv workflow is contradicted — `.env.example`'s own header already states neither the app nor Alembic auto-loads `.env` and instructs exporting vars manually; `db.query(User)` (SQLAlchemy 1.x-style) alongside 2.0-style `Mapped[...]` models is a cosmetic style mix, not a functional defect; the JWT payload's inert `role` claim (DB re-fetch is authoritative) was flagged by two reviewers themselves as the safer design, not a bug; the intent-alignment audit's three divergence notes (stateless "session" vs. a stateful one, the demo route vs. named product surfaces, Backend-only vs. Portal-wide framing) are each explicitly authorized by the spec's "Never" list and AC4's deferral clause, not gaps.

## Design Notes

Tool choices left open by `ARCHITECTURE-SPINE.md`'s deferral: `pyjwt` for JWT (actively maintained, no extra dependency surprises) and `bcrypt` directly (skips `passlib`'s stalled bcrypt-backend maintenance). Role bootstrap: since Epic 6's user-management UI doesn't exist yet, `POST /auth/register` accepts a `role` field directly — the only way to create a non-default-role user until Epic 6 ships; a deliberate interim tradeoff, not an oversight. The JWT session is stateless (no session table, no logout/blocklist) per the "Never" list — acceptable because MVP has no compliance requirement for instant revocation.

## Verification

**Commands:**
- `cd backend && uv sync` -- expected: installs `bcrypt`/`pyjwt` cleanly
- `cd backend && alembic downgrade base && alembic upgrade head` -- expected: adds only `users` table beyond `alembic_version`
- `cd backend && uvicorn app.main:app --reload`, then: register an admin and a developer user, log in as each, call `/admin/ping` with the admin token (200), with the developer token (403), and with no token (401)
- `ruff check backend` -- expected: exit 0
- `pytest backend` -- expected: all pass, including new `test_auth.py`

## Auto Run Result

Status: done
Blocking condition: none

**Summary:** Added the Backend's auth/RBAC substrate: email/password registration and login, bcrypt-hashed passwords, stateless JWT bearer sessions (`sub`+`role` claims, 60-minute expiry), a `get_current_user`/`require_role` dependency pair, and one concrete demo route (`GET /admin/ping`) proving role-gated enforcement. Ran a 4-layer parallel review (adversarial, edge-case, verification-gap, intent-alignment) against the diff, applied 12 patch-level fixes, deferred 2 items, and rejected 8 findings — most of them explicitly authorized by this story's own "Never" list and AC4's deferral clause (open-registration role bootstrap, the dev-default JWT secret with no production safeguard, and three intent-alignment divergence notes).

**Files changed:** `backend/app/auth/{__init__,models,schemas,security,dependencies,router}.py` (new auth package), `backend/app/db.py` + `config.py` (new DB session factory + JWT config), `backend/alembic/versions/bb90a694c827_add_users_table.py` (new `users` table + `role` enum migration), `backend/app/main.py` (mounts auth router + demo route), `backend/pyproject.toml`/`uv.lock` (add `bcrypt`, `pyjwt`), `backend/tests/test_auth.py` (new, 14 tests), `backend/tests/test_migrations.py` (updated AC4 assertion), `.env.example` (new), `.github/workflows/ci.yml` (explicit `JWT_SECRET_KEY`), `README.md`/`CONTRIBUTING.md` (status + curl walkthrough). Full listing in commit `76a49af`.

**Review findings breakdown:** 12 patched (0 high, 4 medium, 8 low — all applied and re-verified: login-timing side-channel, password min-length, bcrypt 72-byte/null-byte crash, email format/length validation, fragile Alembic downgrade, a misleading test assertion, missing expired-JWT/duplicate-email-race/deleted-user-token test coverage, case-insensitive email dedup, empty-string `JWT_SECRET_KEY` bypass), 2 deferred to `deferred-work.md` (no rate limiting on auth endpoints; generic `role` enum name risks a future naming collision), 8 rejected (privilege-escalation-on-paper via open registration and the dev-default JWT secret are this story's own documented interim tradeoffs; one contradicted documentation claim; one cosmetic ORM-style nit; three intent-alignment divergence notes and one inert-JWT-claim observation, all explicitly authorized by the spec).

**Follow-up review recommendation:** `true`. Computed from this pass's patched findings only (high=0, medium=4, low=8): score = 3×4 + 1×8 = 20 ≥ 5.

**Verification performed:** All commands in the Verification section above were run and passed after patches, independently re-run by the orchestrator (not just the implementation subagent): `ruff check backend` → clean; `alembic downgrade base && upgrade head` → clean, adds only `users` beyond `alembic_version`; `pytest backend` → 14 passed (9 original I/O-matrix tests + `test_login_unknown_email_returns_401`'s tightened assertion + 3 new tests added during the patch pass: expired-token rejection, duplicate-email race-condition fallback, deleted-user-token rejection). A live `uvicorn` walkthrough (both before and after patches) exercised register/login/`/admin/ping` across all three roles' token states (200/403/401) plus the newly-patched edge cases (mixed-case duplicate register → 409, short password → 422, malformed email → 422, mixed-case login → 200).

**Residual risks:**
- No rate limiting/brute-force protection on `/auth/login` or `/auth/register` (see `deferred-work.md`).
- The `users` table's Postgres enum is named the generic `role`, not `user_role` (see `deferred-work.md`).
- `/auth/register` accepting a client-supplied `role` remains this story's only role-bootstrap mechanism until Epic 6 ships a real admin-management surface — an explicitly accepted MVP tradeoff, not an oversight.
- The dev-default `JWT_SECRET_KEY` (`dev-only-insecure-secret-do-not-use-in-prod`) has no startup check preventing its use outside dev/CI; acceptable only because deployment topology and any "production" environment concept remain explicitly deferred per `ARCHITECTURE-SPINE.md` § Deferred — this should be revisited the moment a real deployment target exists.
- This repo's BMad sprint-tracking artifacts (`prjdocs/implementation-artifacts/sprint-status.yaml` and any `0-2-*.md` story file) were not updated by this run — `bmad-dev-auto` operates on its own `spec-*.md` tracking, separate from BMad's sprint-planning system.

**Residual artifacts (untouched, not part of this change, left in place):** `.agents/`, `.bmad-loop/`, `.claude/`, `.github/agents/`, `_bmad/`, `claudeomlc.sh`, `prjdocs/` — pre-existing project files predating this story, outside its reviewed diff (same residual set noted by Story 0.1).

final_revision: 76a49afe057e826aaa9b5b22af87706ab6a50907
