- source_spec: `spec-0-1-project-scaffolding-and-dev-environment.md`
  summary: The new `.github/workflows/ci.yml` pipeline has never executed on GitHub Actions itself — no git remote exists yet and nothing has been pushed, so only the underlying shell commands were verified locally.
  evidence: Verification-gap review confirmed no `actionlint`/`act`/nektos tooling exists in the repo to validate the workflow offline, and the repo has zero commits pushed to any remote; first real PR will be the first execution of this workflow on its actual target platform.

- source_spec: `spec-0-1-project-scaffolding-and-dev-environment.md`
  summary: Local PostgreSQL credentials/port (`bmad`/`bmad`/`bmad_portal`/`5433`) are hand-duplicated between `docker-compose.yml` and `.github/workflows/ci.yml`'s backend service container, with no single source of truth enforcing they stay in sync.
  evidence: Adversarial and verification-gap review both independently flagged this duplication; low risk today (fixed, non-production dev credentials) but worth consolidating (e.g. a shared `.env`/composite action) once a second consumer of this config appears.

- source_spec: `spec-0-2-authentication-and-rbac-foundation.md`
  summary: `POST /auth/login` and `POST /auth/register` have no rate limiting or brute-force protection, leaving them open to credential stuffing and mass account-creation spam.
  evidence: Adversarial review flagged the absence of any throttling; real gap but infra-level (needs middleware + request-counting storage), not a trivial one-file patch, and no requirement for it exists in this story's spec.

- source_spec: `spec-0-2-authentication-and-rbac-foundation.md`
  summary: The `users` table migration creates a native Postgres enum literally named `role`, a generic identifier in the shared schema namespace that risks colliding with an unrelated future "role" concept (e.g. a database role reference or project-role table).
  evidence: Adversarial review flagged the name choice; low urgency today (only consumer), but a rename later requires an `ALTER TYPE ... RENAME` migration rather than being free, so worth tracking before a second "role" concept appears.

## Deferred from: code review of story-1-2-artifact-health-dashboard (2026-08-07)

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: A transient read/decode failure on an already-indexed file resets its `content_hash` to `""` in `run_index`, which then makes the sync-status check falsely report `"stale"` on the next view even though the file's real content never changed.
  evidence: Edge-case-hunter review traced `backend/app/indexing/scanner.py:133-136,150` — the per-file exception handler zeroes `content_hash` regardless of whether the row already had a valid hash from a prior successful scan. Pre-existing Story 1.1 error-handling logic, unchanged by this diff besides the `hash_content` rename; Story 1.2's new sync-status feature is the first consumer to make the consequence visible.

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: Unchanged source rows never get their `links_out` refreshed during `run_index`, so a link can stay reported "broken" (AC4) even after its target artifact becomes indexed, until the source file itself changes and gets re-scanned.
  evidence: Edge-case-hunter review traced `backend/app/indexing/scanner.py:99-176` — rows with a matching content hash `continue` before reaching the link-refresh block. Pre-existing Story 1.1 change-detection scope, not modified by this diff; undermines AC4's live accuracy over time.

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: `compute_health`'s per-type rollup dict is keyed only by the current `ArtifactType` enum members; a DB row carrying a stale/removed enum value would `KeyError` the whole `/artifacts/health` request instead of degrading gracefully.
  evidence: Edge-case-hunter review flagged `backend/app/indexing/health.py:73-75`. Theoretical today — the `artifacts` table uses a native Postgres enum that already constrains stored values — but would become live if the `ArtifactType` enum is ever narrowed later without a matching data migration.

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: `compute_health` re-reads and re-hashes every indexed file's full bytes on every `/artifacts/health` request, uncached and with no pagination.
  evidence: Blind-hunter review flagged `backend/app/indexing/health.py:57-65,68-125` as an unbounded per-request filesystem+DB scan. Fine at today's scale (~14 artifacts per the story's own manual verification); revisit with caching or pagination before the catalogue grows significantly.

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: CORS is configured with `allow_methods=["*"]`/`allow_headers=["*"]` for an app that currently exposes exactly one GET endpoint to the browser, and `IHM_ORIGIN` supports only a single literal origin string with no trailing-slash normalization or multi-environment (staging/prod) support.
  evidence: Blind-hunter and edge-case-hunter reviews both flagged `backend/app/main.py:21-27`/`backend/app/config.py` as broader/more rigid than this feature currently needs. Low risk today (single explicit origin, `allow_credentials=False`); worth tightening as more routes and environments are added.

- source_spec: `1-2-artifact-health-dashboard.md`
  summary: `_resolve_target`'s cross-reference resolution strips a leading path segment only if it string-matches `ARTIFACT_ROOT`'s own directory name — fragile against a real repo where that name also legitimately appears as a nested subdirectory.
  evidence: Blind-hunter review flagged `backend/app/indexing/scanner.py:61-81`; no test covers the collision case. Pre-existing Story 1.1 logic, unchanged by this diff.

## Deferred from: code review of story-1-3-traceability-matrix (2026-08-07)

- source_spec: `1-3-traceability-matrix.md`
  summary: `compute_traceability` picks `epics_artifacts[0]` with no guard or log if more than one `EPICS`-typed artifact is ever indexed — it silently uses whichever sorts first by `file_path`.
  evidence: Blind-hunter and edge-case-hunter reviews both flagged `backend/app/indexing/traceability.py:178-181`. Low-likelihood today (a single canonical `epics.md`); mirrors the deterministic tie-break convention this module already uses for duplicate Story artifacts, just undocumented as intentional here.

- source_spec: `1-3-traceability-matrix.md`
  summary: `parser.py`'s "Story files carry no frontmatter by convention" comment/docstring is now false for real data — Story files, including this one, carry a `baseline_commit` frontmatter block (added by BMAD tooling).
  evidence: Verification-gap review flagged `backend/app/indexing/parser.py:17-24`. No live bug today (`STORIES` unconditionally derives title/status from the body regardless of frontmatter), but `extract_cross_references` would silently start acting on Story frontmatter if a `sources`/`context`-style key is ever added there — contrary to what the code currently documents as impossible for that type.

- source_spec: `1-3-traceability-matrix.md`
  summary: `load()` in both `ihm/app/artifacts/traceability/page.tsx` and `ihm/app/artifacts/page.tsx` has no request-id/`AbortController` guard — if invoked again (e.g. a rapid double Retry-click) before a prior fetch resolves, a stale response can overwrite newer state.
  evidence: Edge-case-hunter review flagged `ihm/app/artifacts/traceability/page.tsx:164-185` and `ihm/app/artifacts/page.tsx:154-175`. Pre-existing Story 1.2 pattern; Story 1.3's Task 6 explicitly directed duplicating it verbatim rather than inventing a variant.

- source_spec: `1-3-traceability-matrix.md`
  summary: `smoke.test.mjs`'s new `before()`/`after()` split (needed for the multi-route boot checks Story 1.3 added) could leak the spawned `next start` process if `before()` rejects and `after()` doesn't run.
  evidence: Edge-case-hunter review flagged `ihm/__tests__/smoke.test.mjs:14-27` (medium confidence — depends on `node:test`'s after-hook guarantee on a failed `before()`, which wasn't verified). Test-infra only, no production impact.

- source_spec: `1-3-traceability-matrix.md`
  summary: The Traceability Matrix page never surfaces the Story node's own `artifact_id`/`title`/`file_path` as a link, unlike `/artifacts`'s `LinkChip` for the same kind of data.
  evidence: Blind-hunter review flagged `ihm/app/artifacts/traceability/page.tsx:139-154`. Not a spec violation — Task 6 only mandated a Status-Pill-style cell per node — but the data is already in the API response and unused; candidate follow-up enhancement.

## Deferred from: code review of story-2-1-real-time-websocket-communication-pillar (2026-08-07)

- source_spec: `2-1-real-time-websocket-communication-pillar.md`
  summary: `RealtimeConnection.connect()` (IHM) has no re-entry guard — calling it while already connected/connecting orphans the previous socket, whose `onclose` still fires `scheduleReconnect`, producing duplicate sockets and reconnect timers.
  evidence: Edge-case-hunter review flagged `ihm/lib/websocket.ts:32-35`. Currently unreachable: the module isn't wired into any page/component yet, so no caller exists. Whichever later story (3.3) wires this in should add the guard or a regression test at that point.

- source_spec: `2-1-real-time-websocket-communication-pillar.md`
  summary: `get_current_user` raises `_UNAUTHORIZED` without exception chaining (`raise ... from exc`), discarding the root-cause JWT/DB exception and degrading 401-diagnosis traceability in logs.
  evidence: Edge-case-hunter review flagged `backend/app/auth/dependencies.py:58` (low confidence). Pre-existing pattern that predates this diff — Story 2.1 only added a second caller (`resolve_user_from_token`'s WS consumer) of the same existing code path, it didn't introduce this behavior.

- source_spec: `2-1-real-time-websocket-communication-pillar.md`
  summary: The bearer JWT travels as a raw `?token=<jwt>` WebSocket query-string parameter, which will land in server access logs, any intermediating reverse proxy's logs, and browser history on the IHM side — no mitigation (short-lived WS-specific token, log scrubbing) is discussed anywhere.
  evidence: Blind-hunter review flagged `backend/app/realtime/router.py:36` and the equivalent Client/IHM call sites. Inherent to browsers being unable to set custom WebSocket handshake headers — explicitly justified as the only viable option in this story's own Dev Notes. Not actionable as a one-file patch; revisit if/when this project moves toward an internet-facing deployment (still undecided per `ARCHITECTURE-SPINE.md`'s Deferred section).

## Deferred from: code review of story-2-2-local-repo-scan-and-git-state-detection (2026-08-08)

- source_spec: `2-2-local-repo-scan-and-git-state-detection.md`
  summary: Race Condition / TOCTOU: File system checks in `get_in_progress_git_action` using `os.path.exists()` for `.git/MERGE_HEAD`, `.git/rebase-apply/`, and `.git/rebase-merge/`, then subsequently running `git status --porcelain` and `git ls-files --unmerged`. Between these checks, the git state could change if another process or thread modifies the repository, creating a Time-of-Check to Time-of-Use (TOCTOU) race condition.
  evidence: Edge-case-hunter review flagged `client/agent/git_state.py:139-178`. Low risk today — Git operations are generally single-process, and this is the local Client agent, but TOCTOU vulnerabilities can manifest in multi-repository scanning or when external tools modify the `.git` directory.

## Deferred from: code review of 2-3-zero-setup-onboarding-and-application-identity (2026-08-08)

- source_spec: `2-3-zero-setup-onboarding-and-application-identity.md`
  summary: Missing test coverage for Hub service functions (extract_short_name, detect_git_provider, generate_access_grant_link, get_or_create_space, determine_space_status, check_repo_access).
  evidence: Verification Gap review confirmed no tests exist for `backend/app/hub/service.py` functions. Unit tests needed for Git provider detection, short name extraction, and access grant link generation with various URL formats and providers.

- source_spec: `2-3-zero-setup-onboarding-and-application-identity.md`
  summary: Missing test for client_identity_report / space_joined flow in WebSocket router tests.
  evidence: Verification Gap review confirmed `backend/tests/test_realtime.py` tests WebSocket connection, token validation, origin rejection, heartbeat messages, and unknown/missing type messages, but does not include a test for `client_identity_report` message or `space_joined` response flow.
