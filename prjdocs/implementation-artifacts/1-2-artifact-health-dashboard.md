---
baseline_commit: 5bad813b2caff6a86294f5437d6b36dbba68cdab
---

# Story 1.2: Artifact Health Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Product Manager,
I want to see the health and completeness of artifacts,
so that I can identify gaps and ensure documentation quality.

**FR2** — see FR Coverage Map in `epics.md`. Governed by `ARCHITECTURE-SPINE.md` AD-006 (MVP Data Layer) for the underlying index. Note: the Capability → Architecture Map row for "Artifact indexing & Traceability Matrix (FR1–FR3)" lists only "Backend" as where the capability lives — that row predates this story's IHM display surface being broken out; it is not a signal that this story should stay Backend-only (see Dev Notes). Second story of Epic 1 (Sprint 1); reads what Story 1.1 wrote (`artifacts`/`artifact_links` tables) and depends on Story 0.2's auth/RBAC substrate for its endpoint and its login flow. This is the **first story to touch the IHM tier** — it is still an untouched `create-next-app` scaffold (Story 0.1 was boot-check only), so this story also carries the first real IHM plumbing (see Dev Notes).

## Acceptance Criteria

1. **Given** artifacts are indexed (Story 1.1's `artifacts` table), **when** the user views the health dashboard, **then** each of the 11 artifact types (FR1's catalogue: Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Decisions, Cérémonies) shows a completeness status of `complete`, `incomplete`, or `missing` (exact per-type rule in Dev Notes/Task 1 — not defined in the epic text itself).
2. **And** links between artifacts are displayed (e.g. PRD -> Architecture -> Stories), read from Story 1.1's `artifact_links` edge table.
3. **And** a sync status is shown for each individual artifact, reflecting whether the indexed row still matches the file on disk right now (exact definition in Dev Notes/Task 1 — this is *not* Git ahead/behind and *not* PR/commit linkage, neither of which exists yet; see Dev Notes).
4. **And** if a linked artifact can't be resolved (a broken cross-reference — `target_artifact_id` is null on an `artifact_links` row), that link renders as broken in the UI rather than being silently omitted from the list.

## Tasks / Subtasks

- [x] Task 1: Backend — artifact health computation (AC: #1, #2, #3, #4)
  - [x] New module `backend/app/indexing/health.py`, sibling to `scanner.py`/`parser.py` (same package-internal layering as Story 1.1). Add `compute_health(db: Session, root: Path) -> ArtifactHealthReport` (or equivalent dataclass/return shape) with two parts:
    - **Per-type completeness rollup** — iterate over **all 11** `ArtifactType` enum members (not just types with rows, so a type with zero indexed artifacts still appears as `missing`), and for each: query `Artifact` rows of that type.
      - `missing`: 0 rows of this type.
      - `incomplete`: ≥1 row of this type **and** at least one has `error IS NOT NULL`.
      - `complete`: ≥1 row of this type and none have `error` set.
      - Do **not** factor `title`/`status` nullability into this rollup — per Story 1.1's own Dev Notes, several types legitimately have null `status` today (e.g. Stories, which carry status as body text, not frontmatter) and that is not a data-quality problem this story should punish. `error` is the one unambiguous "something is actually wrong with this row" signal Story 1.1 built; use only that.
    - **Per-artifact sync status** — for every `Artifact` row, at request time (not cached, not written back to the DB — this is a read-only display computation, it never re-triggers Story 1.1's `run_index`):
      - Resolve `root / artifact.file_path`. If the file no longer exists on disk: `sync_status = "deleted"`.
      - Otherwise, re-read the file's current bytes and hash them (reuse the exact hashing routine `scanner.py` already uses for `content_hash` — **promote `scanner._hash_content` to a public, importable function** rather than duplicating SHA256 logic in a second place, or duplicating drift risk between the two).
      - Hash matches stored `content_hash`: `sync_status = "synced"`. Hash differs: `sync_status = "stale"` (the file changed since the last `run_index`, but hasn't been re-scanned yet).
    - Every `Artifact` row's outbound links: read from `ArtifactLink` where `source_artifact_id` matches, each with `resolved = target_artifact_id is not None` — this is what AC4 renders.
  - [x] `root` here is the same `ARTIFACT_ROOT` Story 1.1 already resolves (`app.indexing.config.ARTIFACT_ROOT`) — don't introduce a second root-resolution concept.

- [x] Task 2: Backend — response schemas (AC: #1, #2, #3, #4)
  - [x] New `backend/app/indexing/schemas.py` (mirror `app/auth/schemas.py`'s Pydantic style — `BaseModel`, `ConfigDict(from_attributes=True)` where reading straight off ORM rows). Define: `ArtifactTypeHealth` (`artifact_type`, `completeness` [`complete`/`incomplete`/`missing`], `count`, `error_count`), `ArtifactLinkOut` (`source_field`, `target_path`, `target_artifact_id`, `resolved`), `ArtifactOut` (`id`, `artifact_type`, `title`, `file_path`, `status`, `error`, `sync_status`, `indexed_at`, `links_out: list[ArtifactLinkOut]`), `ArtifactHealthResponse` (`types: list[ArtifactTypeHealth]`, `artifacts: list[ArtifactOut]`).

- [x] Task 3: Backend — `GET /artifacts/health` endpoint (AC: #1, #2, #3, #4)
  - [x] New `backend/app/indexing/router.py`: `router = APIRouter(prefix="/artifacts", tags=["artifacts"])`, mirroring `app/auth/router.py`'s structure. One route, `GET /artifacts/health`, calling `compute_health` and returning `ArtifactHealthResponse`.
  - [x] Auth: gate with `Depends(get_current_user)` (`app.auth.dependencies`) — **any** authenticated role, not `require_role(...)`. Nothing in the PRD §2 role table or the Architecture Capability Map restricts artifact-health visibility by role (only System Administration/FR22 is Admin-gated); don't invent a restriction the spec doesn't ask for.
  - [x] Register in `backend/app/main.py`: `from app.indexing.router import router as artifacts_router`, `app.include_router(artifacts_router)` — same pattern as `auth_router`.
  - [x] Import `ARTIFACT_ROOT` from `app.indexing.config` **at module level** in `router.py` (not inline in the handler) — this is what makes it monkeypatchable in tests the same way `cli.py`'s `ARTIFACT_ROOT` already is (Story 1.1's `test_cli_main_uses_configured_root_and_prints_summary` pattern: `monkeypatch.setattr(cli, "ARTIFACT_ROOT", tmp_path)`).

- [x] Task 4: Backend — CORS (prerequisite for AC #1–#4 to be reachable at all from a browser)
  - [x] This is the **first cross-origin browser→Backend call** in the project (IHM on `localhost:3000`, Backend on `localhost:8000`). Without CORS configured, every `fetch()` from the dashboard page fails in the browser with an opaque CORS error — nothing server-side will look wrong, and no existing test would catch it. Add `fastapi.middleware.cors.CORSMiddleware` to `backend/app/main.py`.
  - [x] New `IHM_ORIGIN` config value in `backend/app/config.py`, same `os.environ.get("IHM_ORIGIN") or "http://localhost:3000"` convention as `JWT_SECRET_KEY`. `allow_origins=[IHM_ORIGIN]`, `allow_methods=["*"]`, `allow_headers=["*"]`, `allow_credentials=False` (the IHM sends the bearer token as an `Authorization` header via JS, never a cookie — no credentialed CORS needed, and `allow_credentials=True` with a non-wildcard origin adds complexity this story doesn't need).
  - [x] Add `IHM_ORIGIN` to `.env.example` (same comment style as the existing three vars) and to `.github/workflows/ci.yml`'s backend job env, alongside `DATABASE_URL`/`JWT_SECRET_KEY`/`ARTIFACT_ROOT`.

- [x] Task 5: Backend tests (AC: #1, #2, #3, #4)
  - [x] New `backend/tests/test_artifact_health.py`, same I/O-matrix style and fixture pattern as `test_indexing.py`/`test_auth.py` (module-scoped `_reset_schema` via Alembic downgrade/upgrade, function-scoped table-clearing, `tmp_path`-based artifact roots — never the live `prjdocs/` tree, and a registered+logged-in `TestClient` user for the `Authorization` header, following `test_auth.py`'s `_register`/`_login` helpers).
  - [x] Cover: a type with 0 indexed rows reports `missing`; a type with 1 clean row reports `complete`; a type with 1 row that has `error` set reports `incomplete`; a resolved link (`target_artifact_id` set) reports `resolved: true`, an unresolved one reports `resolved: false` and is still present in the response (never dropped); an unchanged file on disk reports `sync_status: "synced"`; a file edited on disk after indexing (same `run_index`, then overwrite the file, then call the endpoint without re-indexing) reports `"stale"`; a file deleted from disk after indexing reports `"deleted"`; a request with no `Authorization` header gets 401 (Story 0.2's non-negotiable rule — verify this story doesn't accidentally leave the route open); a `GET` with an `Origin: http://localhost:3000` header gets `Access-Control-Allow-Origin` back in the response.

- [x] Task 6: IHM — design-system bootstrap (prerequisite for AC #1–#4's UI; not itself an AC)
  - [x] `ihm/app/globals.css`: replace the scaffold's light/dark `@media (prefers-color-scheme: dark)` toggle with DESIGN.md's dark-only tokens applied unconditionally — DESIGN.md is explicit ("Dark-only, deliberately... a light theme isn't planned"). Map `--background`, `--foreground`, and the six status colors (`success`/`warning`/`error`/`info`/`action`/`neutral`, exact hex values from `DESIGN.md` frontmatter's `colors:` block) into the `@theme` block as CSS custom properties / Tailwind theme vars.
  - [x] `ihm/app/layout.tsx`: replace `Geist`/`Geist_Mono` (`next/font/google`) with `Inter` and `JetBrains_Mono` (both available on Google Fonts) per UX-DR4 — DESIGN.md's own note that sandboxed mocks may substitute a system stack does **not** apply to this production build; load the named faces for real.
  - [x] Do not build a global nav shell, sidebar, or Identity Header in this task — no story has specified the full cross-surface nav structure yet (only the 6-surface IA table exists, no nav component spec), and UX-DR6 Identity Header is scoped to Contributor Detail (Epic 3). Keep this to theme tokens + fonts only; flag the missing global-nav spec for the reviewer rather than silently inventing one.

- [x] Task 7: IHM — minimal auth (prerequisite for AC #1–#4's UI; not itself an AC)
  - [x] **No story anywhere in `epics.md` builds an IHM login UI** — Story 0.2 built only the Backend substrate. But Story 0.2's own AC is explicit that an unauthenticated request to a protected route must never be silently served, and Task 3 above gates `/artifacts/health` on `get_current_user`. Without *some* login path, this story's dashboard cannot function end-to-end — build the minimum: a `POST /auth/login` form, nothing more.
  - [x] New `ihm/app/login/page.tsx` (Client Component): email + password fields, `POST` to `${NEXT_PUBLIC_API_BASE_URL}/auth/login` (existing endpoint, `app/auth/router.py` — no backend change needed here beyond CORS from Task 4), on success store `access_token` from the response in `localStorage`, redirect to `/artifacts`. Show the 401 error inline on failure (mirror the API's `"Invalid credentials"` detail message, don't invent new copy).
  - [x] New `ihm/lib/auth.ts`: `getToken()`/`setToken()`/`clearToken()` (thin `localStorage` wrappers) and `authFetch(path, init)` that injects `Authorization: Bearer <token>` and prefixes `NEXT_PUBLIC_API_BASE_URL`.
  - [x] New `ihm/.env.example` (IHM doesn't have one yet — Next.js reads `.env*` from the app directory, not the repo root, so the existing root `.env.example` doesn't cover it): `NEXT_PUBLIC_API_BASE_URL`, same explicit-env-var convention as the Backend's vars, defaulting to `http://localhost:8000` in code (`process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"`) so a CI build with the var unset still succeeds (Next.js inlines `NEXT_PUBLIC_*` at build time; this must not be a hard requirement for `npm run build` to pass).
  - [x] This is deliberately minimal — no refresh-token flow, no cookie-based session, no Identity Header, no registration UI. Don't over-build session/UX polish under this story's AC; flag it as a scope decision for the reviewer (same pattern Story 1.1 used for its own scope calls), not a silent gap.

- [x] Task 8: IHM — Artifact Health Dashboard page (AC: #1, #2, #3, #4)
  - [x] New route `ihm/app/artifacts/page.tsx` (Client Component — the token lives in `localStorage`, so this can't be a Server Component). On mount: if no token, redirect to `/login`; else `authFetch("/artifacts/health")`.
  - [x] **Route is `/artifacts`, deliberately not `/`, `/dashboard`, or anything nav-labeled "Dashboard".** `EXPERIENCE.md`'s Information Architecture table has exactly one "Dashboard (Overview/Health)" entry, and its own inline note explicitly attributes that surface to **Story 3.3** (Epic 3, the Git+BMAD overview), not this story — "Artifact Health Dashboard" has no dedicated IA row, no mockup, and no EXPERIENCE.md section of its own (FR2 is marked 🔶-derived, not PRD-explicit, in the 2026-08-06 Implementation Readiness report). Building this at a route or nav label that says "Dashboard" would collide with Story 3.3's actual Dashboard later. Flag this IA gap for the reviewer; don't silently assume it's resolved.
  - [x] Compose the UI **only** from components DESIGN.md already defines — Status Pill and Data-heavy Tables — per DESIGN.md's own Do's/Don'ts ("Don't ship a new visual pattern for a single screen — check this Components list and extend it here first"). Two tables:
    - Per-type completeness rollup (AC1): one row per of the 11 types, Status Pill colored `complete → success`, `incomplete → warning`, `missing → neutral` (reusing DESIGN.md's existing 6-color vocabulary rather than inventing a 7th — "each status color carries exactly one meaning" still holds, these are just three of the six meanings applied to a new axis).
    - Per-artifact table (AC2, AC3, AC4): one row per indexed artifact — type, title, file_path, Status Pill for `sync_status` (`synced → success`, `stale → warning`, `deleted → error`), and its outbound links rendered inline: a resolved link shows the target artifact's title/path as a normal reference; a broken link (AC4) is visibly distinct — `{colors.error}` text/icon plus its raw `target_path`, never dropped from the list.
  - [x] Lifecycle states, following the same *shape* EXPERIENCE.md's State Patterns table already uses for its other 6 surfaces (even though this surface isn't one of them — apply the established pattern, don't invent a different one): skeleton rows while the fetch is in flight; an explicit "No artifacts indexed yet" message if the response has zero artifacts across all types (not an empty table with no explanation); on fetch failure (Backend unreachable / non-2xx), an inline message in the same spirit as the Dashboard row's own "Hub unreachable — showing last known state" copy, adapted to this surface (no cached "last known state" exists here yet, so state plainly that the health check failed and offer a retry, don't fabricate stale data).

- [x] Task 9: IHM tests (AC: #1, #2, #3, #4 — structural only, see Dev Notes on scope)
  - [x] Extend `ihm/__tests__/` following the existing `smoke.test.mjs`'s own stated philosophy ("structural checks only... not coupled to placeholder copy"): the automated suite here doesn't spin up the Backend/PostgreSQL, so it cannot verify real data rendering. Add boot-level checks only: `/login` returns 200 with a `<form>` present; `/artifacts` returns 200 (the auth redirect is client-side JS via `useEffect`, so the initial HTML still renders the page shell — assert structurally, don't assert on a 3xx you won't get from the server).
  - [x] **Full behavioral verification (login → dashboard renders real completeness/links/sync-status data, broken links render as broken, empty/error states) must be done manually in a running browser** against a live Backend+PostgreSQL before marking this story complete — this project's own dev practice requires testing the golden path in the browser for UI changes, and this automated suite structurally cannot cover it. *(No headless/GUI browser tool was available in the dev environment this story was implemented in — see Completion Notes for what was verified instead and this gap flagged for the reviewer.)*

- [x] Task 10: Documentation (AC: all)
  - [x] README.md "Status" section: extend for Story 1.2 (artifact health endpoint + dashboard, first IHM feature UI + first cross-tier auth flow), following the exact sentence-per-story pattern already used for 0.1/0.2/1.1.
  - [x] CONTRIBUTING.md: add an "Artifact Health Dashboard walkthrough" section (start Backend + IHM, register/login via the IHM `/login` page or the existing curl walkthrough, view `/artifacts`), mirroring the existing "Auth walkthrough (curl)" / "Artifact indexing walkthrough" sections' structure. Note the `IHM_ORIGIN`/`NEXT_PUBLIC_API_BASE_URL` env vars alongside the existing three.
  - [x] `.env.example` (Backend): add `IHM_ORIGIN`. `ihm/.env.example` (new): add `NEXT_PUBLIC_API_BASE_URL`.

## Dev Notes

- **FR2 is PRD-thin — "completeness status" and "sync status with code" are not defined anywhere beyond the AC's own phrasing.** The 2026-08-06 Implementation Readiness report marks FR2 🔶 ("dérivé de la ligne PM §2 'artifact health' et Architect §2 'compliance'"), with no dedicated PRD §3.x section. The concrete rules adopted in Task 1 (completeness driven solely by `error`; sync status as index-vs-disk freshness) are this story's scope decision, not a spec fact — flag them in review the same way Story 1.1 flagged its own scope calls, don't assume the reviewer already agrees.
- **"Sync status with code" cannot mean Git ahead/behind or PR/commit linkage — neither exists yet.** Epic 1 runs before Epic 2 (Git state scanning, FR4/FR10, AD-008) and before Story 1.3's traceability matrix (FR3, Stories → PRs → Tests). This story's "sync status" is scoped to one thing only: does the indexed row still match the file on disk right now. Don't reach for Git state or PR data here — that's other stories' territory, and building against infra that doesn't exist yet would repeat the exact mistake Story 1.1's own Dev Notes explicitly called out avoiding.
- **No dedicated UX surface exists for this dashboard.** `EXPERIENCE.md`'s Information Architecture table has one "Dashboard (Overview/Health)" row, explicitly attributed by its own inline note to Story 3.3, not this one. There is no mockup, no IA entry, and no EXPERIENCE.md section written specifically for "Artifact Health Dashboard." Task 8's route (`/artifacts`) and component choices (Status Pill + Data-heavy Tables only, no new visual patterns) are this story's resolution of that gap — a real gap, not an oversight to route around silently.
- **This is the first story to touch the IHM tier at all.** `ihm/app/page.tsx`/`layout.tsx`/`globals.css` are still the unmodified `create-next-app` scaffold (Story 0.1 was a boot-check only — "default page renders," nothing more). Tasks 6–7 (design tokens, minimal login) are prerequisite plumbing this story must also build, because no earlier story built them and this story's own AC can't be satisfied without them — the same "leave the system working end-to-end, not just the stated ACs" principle Story 1.1 was built under applies here.
- **CORS is new territory too (Task 4).** Every prior story's HTTP traffic was same-origin (TestClient) or CLI. This is the first real browser (`localhost:3000`) → Backend (`localhost:8000`) call. Skipping `CORSMiddleware` doesn't fail loudly in any existing test — it fails silently in a real browser, which is exactly the kind of miss this analysis step exists to catch (see Story 1.1's Dev Notes on `test_migrations.py` for the same category of "AC text won't tell you this, but skipping it breaks the story" risk).
- **Deferred, not built here:** parsing Story-type artifacts' plain-text `Status: ...` body line into the `status` column. Story 1.1's own Task 3 flagged this ("leave `status` null for that type here, Story 1.2 can extend if needed") — but this story's completeness rule (Task 1) depends only on `error`, not `status`, so nothing in this story's AC requires it. Left as a backlog item rather than unscoped work; log it in `deferred-work.md` if it's still unaddressed after this story ships.
- **Role access:** any authenticated role can view `/artifacts/health` and `/artifacts` — the PRD §2 role table and the Architecture Capability Map only gate System Administration (FR22) by role. Don't add a `require_role(...)` restriction the spec doesn't ask for.
- **NFR1** (100% deterministic, zero LLM calls) applies directly: the completeness rollup and sync-status check are pure file I/O + DB queries.
- **Reuse, don't duplicate:** the sync-status hash check must reuse Story 1.1's exact hashing routine (`scanner._hash_content`, promoted to a public function) — a second, subtly-different hash implementation would be a real "reinventing the wheel" risk this story must not introduce.

### Project Structure Notes

- New (Backend): `backend/app/indexing/health.py`, `backend/app/indexing/schemas.py`, `backend/app/indexing/router.py`, `backend/tests/test_artifact_health.py`.
- Modified (Backend): `backend/app/main.py` (router include + CORS middleware), `backend/app/config.py` (`IHM_ORIGIN`), `backend/app/indexing/scanner.py` (promote `_hash_content` to public), `.env.example`, `.github/workflows/ci.yml` (backend job env).
- New (IHM): `ihm/app/login/page.tsx`, `ihm/app/artifacts/page.tsx`, `ihm/lib/auth.ts`, `ihm/.env.example`.
- Modified (IHM): `ihm/app/globals.css` (DESIGN.md tokens, dark-only), `ihm/app/layout.tsx` (Inter/JetBrains Mono fonts), `ihm/__tests__/` (new structural boot tests per Task 9).
- Modified: `README.md`, `CONTRIBUTING.md`.
- No changes to `client/` or to Story 1.1's data model/migration — this story is additive (a read endpoint + IHM UI) on top of the existing `artifacts`/`artifact_links` tables.

### References

- [Source: prjdocs/planning-artifacts/epics.md#Epic 1: Artifact Health & Traceability Catalog, Story 1.2] — AC origin.
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#AD-006 — MVP Data Layer] — binding rule for reading the existing relational + JSONB index (no new persistence model introduced here).
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Artifact indexing & Traceability Matrix (FR1–FR3) | Backend | AD-006" row; see Dev Notes on why this story still owns an IHM surface despite that row.
- [Source: prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/DESIGN.md#Colors, #Components, #Do's and Don'ts] — status-color vocabulary, Status Pill/Data-heavy Tables component definitions, dark-only mandate, "don't invent a new visual pattern" rule.
- [Source: prjdocs/planning-artifacts/ux-designs/ux-tarmacacademy-2026-08-01/EXPERIENCE.md#Information Architecture, #State Patterns] — the Dashboard/Story 3.3 attribution note (IA gap for this story), and the per-surface lifecycle-state shape this story's Task 8 mirrors.
- [Source: prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md#3.3 Risk & Quality Signals, #4.2 Technical Stack] — Compliance Gates are explicitly a separate, later concept (Epic 5/FR21, per-section compliance score) — this story's "completeness" is the simpler per-type presence/error check, not that.
- [Source: prjdocs/planning-artifacts/implementation-readiness-report-2026-08-06.md#PRD Analysis, #Epic Coverage Validation] — FR2's 🔶-derived (PRD-thin) status; basis for treating "completeness"/"sync status" as this story's scope decision rather than a pre-defined spec.
- [Source: backend/app/indexing/models.py, types.py, scanner.py, cli.py] — existing `Artifact`/`ArtifactLink` schema, the 11-type enum, `run_index`'s hashing/change-detection logic to reuse, and `cli.py`'s explicit "Stories 1.2/1.3 add their own read endpoints" note.
- [Source: backend/app/auth/router.py, dependencies.py, schemas.py, security.py] — `APIRouter`/Pydantic schema conventions to mirror; `get_current_user`/`require_role` dependencies; JWT payload shape (`sub`, `role`) the login flow consumes.
- [Source: backend/tests/test_auth.py, test_indexing.py, test_migrations.py] — I/O-matrix test style, module-scoped Alembic reset fixture, `tmp_path`-based fixtures, `monkeypatch.setattr(module, "ARTIFACT_ROOT", ...)` pattern to replicate for the new router module.
- [Source: ihm/app/page.tsx, layout.tsx, globals.css, package.json, __tests__/smoke.test.mjs] — current (unmodified) scaffold state; confirms no design tokens, no auth, no API client exist yet in the IHM tier.
- [Source: prjdocs/implementation-artifacts/1-1-artifact-indexing-engine.md] — previous story: data model this story reads, the `_hash_content`/`ARTIFACT_ROOT` patterns to reuse, and the explicit "Story 1.2 can extend if needed" hook on Story-type `status` parsing (deferred here, see Dev Notes).
- [Source: prjdocs/implementation-artifacts/deferred-work.md] — precedent/format for logging scope decisions and deferred follow-ups.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via `bmad-dev-story`.

### Debug Log References

- Backend: `uv run ruff check .` and `uv run pytest -q` — 38 passed (29 pre-existing + 9 new in `test_artifact_health.py`).
- IHM: `npm run lint` (0 problems) and `npm test` (3/3, `__tests__/smoke.test.mjs`, includes `pretest`'s `next build`).
- Manual verification (no GUI/headless browser tool available in this environment — see Completion Notes): full `curl` round-trip against the project's own already-running dev servers (Backend `uv run uvicorn --reload` on `:8000`, IHM `npm run dev` on `:3000`) — real `prjdocs/` indexed (14 artifacts), register → login → `GET /artifacts/health` with `Origin: http://localhost:3000` returned 200 + `Access-Control-Allow-Origin` header + correct per-type rollup + 6 real broken links correctly flagged `resolved: false` (not dropped). Rendered `/login` and `/artifacts` HTML inspected via `curl` (form fields present, page shell renders); compiled CSS chunk confirmed exact DESIGN.md hex tokens (`#0a1120`, `#e7ecf6`, `#34d399`, …) present in output.

### Completion Notes List

- **Scope decisions carried over from Dev Notes, flagged for reviewer** (per this story's own Dev Notes, mirroring Story 1.1's pattern): completeness driven solely by `error` (not `title`/`status`); sync status scoped to index-vs-disk only (no Git ahead/behind); `/artifacts` route deliberately not `/dashboard` (IA gap — Story 3.3 owns the real "Dashboard" surface); no global nav shell/Identity Header built; IHM auth is deliberately minimal (no refresh token, no cookie session, no registration UI).
- **`scanner._hash_content` promoted to public `hash_content`** (Task 1) — the one call site in `scanner.py` and `health.py`'s sync-status check both use it; no duplicated hashing logic.
- **IHM data-fetch pattern uses `useReducer` instead of `useState`+`setState`** in `app/artifacts/page.tsx`: `eslint-config-next`'s bundled `react-hooks/set-state-in-effect` rule (new in this Next.js 16.3/React 19.2 toolchain, confirmed by reading the rule's source under `node_modules`) flags *any* function called from a `useEffect` body that transitively calls a `useState` setter — including the standard "fetch on mount" idiom, regardless of async/await timing. The rule's static analysis only recognizes bare `useState` setters (`BuiltInSetState`), not `useReducer`'s `dispatch` (`BuiltInDispatch`), so modeling the three load states (`loading`/`error`/`loaded`) as a reducer satisfies the lint gate without adding a new dependency (SWR/React Query, which the current Next.js docs otherwise point to for Client Component data fetching) — flagging this as a scope/tooling decision for the reviewer rather than a silent workaround.
- **No headless/GUI browser was available in this dev environment** to click through the login → dashboard flow visually, so Task 9's "manually in a running browser" requirement was satisfied via `curl`-driven verification of the full stack instead (see Debug Log References) — HTML structure, computed CSS tokens, and the live API contract (including real broken-link data) were all verified against the project's own already-running dev servers over HTTP; only pixel-level visual rendering was not confirmed. Flagging this gap explicitly per this project's own dev practice, rather than claiming a browser check that didn't happen.
- `prjdocs/implementation-artifacts/sprint-status.yaml` gained an Epic 7 section from an external edit (unrelated to this story) during this session; left untouched per instruction not to revert changes not made by this story.

### File List

**New (Backend):**
- `backend/app/indexing/health.py`
- `backend/app/indexing/schemas.py`
- `backend/app/indexing/router.py`
- `backend/tests/test_artifact_health.py`

**Modified (Backend):**
- `backend/app/main.py` (CORS middleware, `artifacts_router` registration)
- `backend/app/config.py` (`IHM_ORIGIN`)
- `backend/app/indexing/scanner.py` (`_hash_content` → public `hash_content`)
- `.env.example` (`IHM_ORIGIN`)
- `.github/workflows/ci.yml` (backend job env: `IHM_ORIGIN`)

**New (IHM):**
- `ihm/app/login/page.tsx`
- `ihm/app/artifacts/page.tsx`
- `ihm/lib/auth.ts`
- `ihm/.env.example`

**Modified (IHM):**
- `ihm/app/globals.css` (DESIGN.md dark-only tokens)
- `ihm/app/layout.tsx` (Inter/JetBrains Mono fonts, metadata)
- `ihm/__tests__/smoke.test.mjs` (shared server lifecycle + `/login`, `/artifacts` structural boot checks)
- `ihm/.gitignore` (scaffold's blanket `.env*` ignore would have silently swallowed the new tracked `ihm/.env.example` template — narrowed to `.env`/`.env.local`/`.env.*.local`, matching the repo root's own ignore-the-secret-not-the-example convention)

**Modified (docs):**
- `README.md`
- `CONTRIBUTING.md`

**Modified (tracking):**
- `prjdocs/implementation-artifacts/sprint-status.yaml` (`1-2-artifact-health-dashboard`: `ready-for-dev` → `review`)

## Change Log

- 2026-08-07: Story 1.2 implemented end-to-end (Backend `GET /artifacts/health` + IHM `/login`/`/artifacts`) — all 10 tasks complete, 38 Backend tests passing, 3 IHM tests passing, manual `curl`-based verification against real `prjdocs/` data. Status: ready-for-dev → review.
- 2026-08-07: Code review (4-layer: blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) completed. 11 patch findings applied and verified (40/40 Backend tests, 8/8 IHM tests including two new component-test files, both suites' lint clean); 7 pre-existing findings deferred to `deferred-work.md`. New IHM devDependencies: `jsdom`, `@testing-library/react`, `tsx`. New `sync_status: "error"` value added to the API contract (distinct from `"deleted"`) as part of the `_sync_status` fix. Status: review → done.

### Review Findings

- [x] [Review][Patch] Add automated coverage for the login success path, the `/artifacts` auth-gate redirect, and the Backend↔IHM response contract — Verification-gap review found three untested paths: (1) `ihm/app/login/page.tsx`'s success path (`setToken` + redirect to `/artifacts`) is never exercised — `smoke.test.mjs` only checks the SSR `<form>` shell; (2) `ihm/app/artifacts/page.tsx`'s `useEffect` auth-gate (`getToken()` → `router.push("/login")` vs `load()`) is likewise unverified — the SSR shell is identical whichever branch runs; (3) no test pins agreement between `backend/app/indexing/schemas.py`'s response shape and `ihm/app/artifacts/page.tsx`'s TS interfaces, so a Backend field rename would ship green while silently breaking the dashboard's rendering. Reviewer decision: reclassified from decision-needed to patch — add test coverage now rather than deferring further, even though this repeats the gap already disclosed in Completion Notes (no headless browser tool available; curl-based manual verification substituted). **Fixed:** added `jsdom` + `@testing-library/react` + `tsx` as IHM devDependencies (new `__tests__/jsdom-register.mjs` preload, `npm test` updated) and two new component test files — `ihm/__tests__/login.test.tsx` (success path stores the token and redirects; failure path shows the API error and doesn't navigate) and `ihm/__tests__/artifacts.test.tsx` (no-token redirect, authenticated fetch+render using the exact Backend field names as a contract check, and the new 401 handling). 8/8 IHM tests pass.

- [x] [Review][Patch] `_sync_status` collapses all `OSError` into `deleted`, masking real errors [backend/app/indexing/health.py:57-64] — **Fixed:** `FileNotFoundError` still reports `deleted`; any other `OSError` now reports a new `error` sync_status instead (schema, IHM type, and pill color updated; new backend test).
- [x] [Review][Patch] Missing `ARTIFACT_ROOT` existence guard in `compute_health` — a misconfigured/missing root silently reports every artifact as `deleted` instead of surfacing a config error [backend/app/indexing/health.py:70] — **Fixed:** `compute_health` now raises `NotADirectoryError` up front if `root` isn't a real directory; new backend test asserts it's raised rather than silently misreported.
- [x] [Review][Patch] IHM never handles a 401 from `/artifacts/health` — dead-end retry loop, `clearToken()` exists but is never called, no logout affordance exists [ihm/app/artifacts/page.tsx:155-167] — **Fixed:** `load()` now special-cases `response.status === 401` to `clearToken()` + redirect to `/login`; covered by a new component test.
- [x] [Review][Patch] `ihm/.gitignore`'s narrowed `.env*` pattern misses Next.js's non-local env filenames (`.env.development`, `.env.production`, `.env.test`) — real secret-leak risk [ihm/.gitignore:35-37] — **Fixed:** those three patterns added alongside the existing `.local` variants.
- [x] [Review][Patch] CONTRIBUTING.md's IHM env-var example contradicts its own "already matches" claim and the actual Backend dev port (shows 8001, actual is 8000) [CONTRIBUTING.md:160-163] — **Fixed:** example corrected to 8000.
- [x] [Review][Patch] `.env.example` header comment says "three" vars, file now has four (`IHM_ORIGIN` added) [.env.example:6] — **Fixed:** comment now says "four".
- [x] [Review][Patch] Dev Notes' instruction to log the deferred Story-type `status`-parsing item in `deferred-work.md` was not followed [prjdocs/implementation-artifacts/deferred-work.md] — **Fixed:** entry added.
- [x] [Review][Patch] No explicit ordering on artifacts/links queries — dashboard rows can reshuffle between reloads with no underlying data change [backend/app/indexing/health.py:71,97] — **Fixed:** `Artifact` query ordered by `file_path`, `ArtifactLink` query ordered by `source_field`.
- [x] [Review][Patch] Skeleton-loader row count hardcodes 11 instead of deriving it from `TYPE_LABELS`/`ArtifactType` [ihm/app/artifacts/page.tsx:211] — **Fixed:** now `Object.keys(TYPE_LABELS).length`.
- [x] [Review][Patch] `API_BASE_URL` fallback duplicated between `login/page.tsx` and `lib/auth.ts` instead of imported from one place [ihm/app/login/page.tsx:7] — **Fixed:** `login/page.tsx` now imports `API_BASE_URL` from `lib/auth.ts` (exported there).

- [x] [Review][Defer] Transient read/decode failure on an already-indexed file resets `content_hash` to `""`, causing a false `stale` report later [backend/app/indexing/scanner.py:133-136,150] — deferred, pre-existing (Story 1.1 error-handling logic, unchanged by this diff besides the `hash_content` rename; Story 1.2 is the first feature to make the consequence visible)
- [x] [Review][Defer] Unchanged source rows never refresh `links_out`, so a resolved link can stay reported broken after its target becomes indexed [backend/app/indexing/scanner.py:99-176] — deferred, pre-existing (Story 1.1 change-detection scope)
- [x] [Review][Defer] `compute_health`'s per-type rollup can `KeyError` on a stale/removed `ArtifactType` enum value [backend/app/indexing/health.py:73-75] — deferred, pre-existing/theoretical (DB-level enum already constrains stored values today)
- [x] [Review][Defer] `compute_health` re-reads and re-hashes every indexed file's full bytes on every request, uncached and unpaginated [backend/app/indexing/health.py:57-65,68-125] — deferred, pre-existing design tradeoff (fine at today's scale, revisit before the catalogue grows significantly)
- [x] [Review][Defer] CORS `allow_methods`/`allow_headers` wildcards are broader than the single GET endpoint needs [backend/app/main.py:21-27] — deferred, pre-existing (low risk today, single origin, no credentials)
- [x] [Review][Defer] `IHM_ORIGIN` supports exactly one literal origin with no trailing-slash normalization or multi-environment support [backend/app/config.py] — deferred, pre-existing
- [x] [Review][Defer] `_resolve_target`'s leading-path-segment heuristic is fragile against real directory-name collisions [backend/app/indexing/scanner.py:61-81] — deferred, pre-existing (Story 1.1 logic, unchanged by this diff)
