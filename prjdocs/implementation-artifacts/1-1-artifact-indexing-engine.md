---
baseline_commit: 5bad813b2caff6a86294f5437d6b36dbba68cdab
---

# Story 1.1: Artifact Indexing Engine

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**Enabler story — no direct human actor; the indexing engine itself has no UI.** It exists to make Stories 1.2 (Artifact Health Dashboard) and 1.3 (Traceability Matrix) buildable — they read what this story writes. Not framed as "As a [user]", per the PM Note in the 2026-08-06 Implementation Readiness review.

As the Portal's indexing engine,
I index all BMAD artifacts (Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Decisions, Cérémonies),
so that the Product Manager / Analyst (Stories 1.2, 1.3) can see artifact health and traceability instead of raw files.

**FR1, FR2 (partial — see Dev Notes), FR3 (partial — see Dev Notes)** — see FR Coverage Map in `epics.md`. Governed by `ARCHITECTURE-SPINE.md` AD-006 (MVP Data Layer). First story of Epic 1 (Sprint 1); depends on Epic 0's Backend scaffold (Story 0.1) and DB migration chain (Story 0.2), nothing else.

## Acceptance Criteria

1. **Given** BMAD artifacts exist under the indexing engine's configured root directory (Brainstorming, Brief, PRD, Architecture, UX, Tests, Specs, Epics, Stories, Decisions, Cérémonies), **when** the indexing engine runs, **then** every artifact whose file matches one of these types is discovered and catalogued with its metadata (artifact type, title/name where derivable, status where present, file path, parsed frontmatter, and any frontmatter-declared cross-references to other artifacts).
2. **And** re-running the indexing engine after artifacts are added or modified updates the index accordingly — new files appear as new rows, changed files get their metadata refreshed (by content change, not by naive re-insert), and unchanged files are left untouched (no duplicate rows, no needless rewrites).
3. **And** a malformed or unparseable artifact (e.g. invalid YAML frontmatter) is flagged in the index with an error state instead of being silently skipped or crashing the run — the row exists, its `error` field is populated, and every other file in the same run is still processed.

## Tasks / Subtasks

- [x] Task 1: Artifact index data model — Alembic migration (AC: #1, #2, #3)
  - [x] New migration chained on `down_revision = 'bb90a694c827'` (the last applied revision — `add users table`, Story 0.2). Do not branch off `e09179c9e677` directly.
  - [x] Add a native Postgres enum for artifact type, named **`artifact_type`** — not the generic `type`. `deferred-work.md` already flags Story 0.2's `role` enum as a collision-prone generic name; don't repeat that mistake on a second enum in the same schema namespace. Values: `brainstorming`, `brief`, `prd`, `architecture`, `ux`, `tests`, `specs`, `epics`, `stories`, `decisions`, `ceremonies` (FR1's 10 types, English snake_case even though the FR text is French).
  - [x] Add `artifacts` table: `id` (UUID, `default=uuid.uuid4`, matching `app/auth/models.py`'s `User.id` pattern), `artifact_type` (the enum above, not null), `file_path` (unique, not null — path relative to the configured root, see Task 6), `title` (nullable text), `status` (nullable text — free text, not an enum: observed real values are `final`, `draft`, `done` and likely more later, no fixed vocabulary exists across artifact types), `frontmatter` (JSONB, nullable — the raw parsed frontmatter dict, per AD-006 "relational + JSONB"), `content_hash` (text, not null — for AC2's change detection), `error` (nullable text — non-null means AC3's malformed state), `indexed_at` (timestamptz, not null).
  - [x] Add `artifact_links` table (the "plain edge/adjacency model" AD-006 calls for): `id` (UUID), `source_artifact_id` (FK -> `artifacts.id`, not null), `source_field` (text, not null — which frontmatter key produced this edge, e.g. `inputDocuments`), `target_path` (text, not null — the raw referenced path exactly as written in frontmatter, before resolution), `target_artifact_id` (FK -> `artifacts.id`, **nullable** — null means the reference didn't resolve to an indexed artifact; this is deliberate data, not an error: Story 1.2's AC explicitly wants broken cross-references rendered as broken, not omitted), `created_at` (timestamptz, not null).
  - [x] **Update `backend/tests/test_migrations.py`.** It currently hardcodes `assert sorted(tables) == ["alembic_version", "users"]` — this will fail the moment this migration lands unless the assertion is extended to include `artifacts` and `artifact_links`. This is not optional cleanup, it's a guaranteed CI break if skipped.

- [x] Task 2: Artifact type classification by path/filename convention (AC: #1)
  - [x] New package `backend/app/indexing/` (sibling to `backend/app/auth/`, same layering convention). `types.py` holds the `ArtifactType` enum (mirror `app/auth/models.py`'s `Role(enum.StrEnum)` pattern) and the path-pattern → type mapping.
  - [x] **Classification must be by directory/filename convention, not by reading a frontmatter `type:` field.** Verified against this repo's actual planning artifacts: only the Architecture spine's frontmatter (`.memlog.md` companion, not the spine itself) and spec files carry a `type:`-like key at all, under different names (`type`, none, etc.) — Story files (`prjdocs/implementation-artifacts/<epic>-<story>-*.md`) have **zero frontmatter**. A design that trusts a uniform `type:` field will misclassify or drop most real artifacts on first run. Concrete mapping observed in this repo (extend, don't replace, if a new convention appears later):
    | Type | Pattern |
    |---|---|
    | `brief` | `**/briefs/*/brief.md` |
    | `prd` | `**/prds/*/prd.md` |
    | `architecture` | `**/architecture/*/*.md`, excluding `.memlog.md` |
    | `ux` | `**/ux-designs/*/DESIGN.md`, `**/ux-designs/*/EXPERIENCE.md` |
    | `epics` | `**/epics.md` |
    | `specs` | `**/implementation-artifacts/spec-*.md` |
    | `stories` | `**/implementation-artifacts/<digit>-<digit>-*.md`, excluding anything matching `spec-*` or `epic-*-context.md` |
    | `brainstorming`, `tests`, `decisions`, `ceremonies` | No file convention exists yet anywhere in this repo (no brainstorming output, no QA test-design docs, no standalone decision files — architectural decisions live embedded as `AD-XXX` entries inside the Architecture spine and `.memlog.md`, not as their own files; no ceremony artifacts exist before Epic 4). Define the enum values and leave their patterns matching nothing for now — **zero matches is correct behavior, not a bug** to work around. Do not invent a file convention for these that no planning artifact actually uses. |
  - [x] **`.memlog.md` files are explicitly excluded from the catalog.** They're audit-trail companions (NFR5), not one of FR1's 10 listed artifact types — do not index them as artifacts in their own right.

- [x] Task 3: Frontmatter parsing + metadata + cross-reference extraction (AC: #1)
  - [x] Parse the leading `---`-delimited YAML block when present. Its absence is valid for some types (Stories have none by convention) — only treat it as malformed per Task 4 if a `---` block exists and fails to parse.
  - [x] `title`: read from frontmatter (`title` or `name` key, whichever the type uses — see real examples in Dev Notes) where present; for `stories` (no frontmatter), derive from the file's `# Story X.Y: ...` heading instead — this is the one type-specific exception, not a general parsing rule.
  - [x] `status`: read from frontmatter `status` key where present; null otherwise (e.g. `stories` files carry status as a plain-text `Status: ...` line in the body, not frontmatter — out of scope to parse that for this story; leave `status` null for that type here, Story 1.2 can extend if needed).
  - [x] Cross-reference extraction: for whichever frontmatter keys the source actually uses to reference other artifacts (observed in this repo: `inputDocuments`, `sources`, `companions`, `context` — not a fixed universal key, extract whatever list-of-path-strings values exist under these known keys), resolve each path relative to the configured root and create one `artifact_links` row per reference, setting `target_artifact_id` if an indexed artifact matches that resolved path, else leaving it null.

- [x] Task 4: Malformed-artifact handling (AC: #3)
  - [x] A file matched to a type pattern whose frontmatter block is present but fails YAML parsing: still upsert the `artifacts` row, set `error` to the parse failure message, leave `frontmatter`/`title`/`status`/derived links null/empty for that row. Never skip the file, never raise out of the run.
  - [x] One bad file must not abort indexing of the rest — catch per-file, continue the scan, aggregate results.

- [x] Task 5: Idempotent scan / change detection (AC: #2)
  - [x] `run_index(root: Path) -> IndexResult` (or similar) walks the root, computes a content hash per matched file, and upserts by unique `file_path`: unchanged hash → leave the row untouched; changed hash → refresh metadata/frontmatter/links/`error`/`indexed_at`; new path → insert; a previously-indexed path that no longer exists on disk is out of scope for this story (no AC requires deletion handling — leave it, don't invent tombstoning).
  - [x] This is a full on-demand re-scan, not a background filesystem watcher. File-watching/push-based reporting is Epic 2's Client-side territory (AD-008); nothing in this story's AC requires it, and building one here would duplicate infra that Epic 2 owns.
  - [x] No HTTP endpoint is required by this story's AC. Expose `run_index` as an importable function plus a documented single-command CLI entry (same "runs via documented single command" bar Story 0.1 set for Client/Backend/IHM) — e.g. `uv run python -m app.indexing.cli`. Stories 1.2/1.3 will add their own read endpoints when the dashboard/matrix need to serve this data; don't pre-build unrequested REST surface here.

- [x] Task 6: Configuration (AC: #1, #2)
  - [x] `ARTIFACT_ROOT` env var, following the exact `DATABASE_URL`/`JWT_SECRET_KEY` explicit-env-var convention from `app/config.py`/`app/db.py`: CI sets it explicitly, local dev falls back to a documented default (this repo's own `prjdocs` directory is the natural default — it's the live example used to build and test against).
  - [x] Add to `.env.example` (same file, same header convention as the existing two vars) and document in `.github/workflows/ci.yml`'s backend job env alongside `DATABASE_URL`/`JWT_SECRET_KEY`.

- [x] Task 7: Tests (AC: #1, #2, #3)
  - [x] `backend/tests/test_indexing.py`: build fixtures under pytest's `tmp_path`, **not** against the live `prjdocs/` tree — a future edit to planning docs must not break this test suite. Cover: one file per implemented type (brief/prd/architecture/ux/epics/specs/stories) with valid frontmatter; a story file with no frontmatter (must classify fine, not be flagged malformed); a file with an invalid YAML frontmatter block (must land with `error` set, not crash the run, and not block the other fixtures in the same run); a file whose frontmatter references another fixture file by path (edge resolves, `target_artifact_id` set) and one referencing a nonexistent path (edge row exists, `target_artifact_id` null); a re-run with one file unchanged and one file's content modified (unchanged row untouched, changed row refreshed, no duplicate rows).
  - [x] Update `backend/tests/test_migrations.py` per Task 1.

- [x] Task 8: Documentation (AC: #1, #2)
  - [x] README.md "Status" section: Epic 1 begun, Story 1.1 landed (indexing engine, no UI yet).
  - [x] CONTRIBUTING.md: document `ARTIFACT_ROOT` and how to run the indexer locally (CLI command from Task 5).
  - [x] `.env.example`: add `ARTIFACT_ROOT` with the same comment style as the existing two entries.

### Review Findings

- [x] [Review][Patch] Cross-reference resolution never resolves against real repo data — decided: fix now. All real frontmatter cross-references use repo-root-relative paths (e.g. `prjdocs/planning-artifacts/...`), but `_resolve_target` (`backend/app/indexing/scanner.py:56-66`) resolves them relative to `ARTIFACT_ROOT` (`prjdocs`), so `(root / target_path).resolve()` never matches a real `file_path`. Verified live: 14/14 `artifact_links` rows against the real `prjdocs/` tree have `target_artifact_id = NULL`. Fix: normalize target paths so a reference written relative to the repo root resolves correctly against `ARTIFACT_ROOT` (e.g. strip the `ARTIFACT_ROOT` directory name as a leading path segment before resolving, or resolve against the repo root instead of `ARTIFACT_ROOT` and then re-relativize).

- [x] [Review][Patch] Per-file exceptions outside YAML-parse aren't caught — one bad file crashes and rolls back the entire scan [backend/app/indexing/scanner.py:92-103]
- [x] [Review][Patch] STORIES glob pattern `[0-9]-[0-9]-*.md` only matches single-digit epic/story numbers — double-digit files silently excluded from the catalog [backend/app/indexing/types.py:50]
- [x] [Review][Patch] No test exercises the `ArtifactLink` delete+recreate path for a file whose cross-references change on re-index [backend/app/indexing/scanner.py:139-154]
- [x] [Review][Patch] CLI entry point and `ARTIFACT_ROOT` config fallback have zero automated test coverage — the only documented way to run the feature is unverified [backend/app/indexing/cli.py:15-24, backend/app/indexing/config.py:16]
- [x] [Review][Patch] Frontmatter `status` values that parse as non-string (YAML bool/number) are silently dropped to `None` instead of stringified or flagged [backend/app/indexing/scanner.py:112-113]
- [x] [Review][Patch] Cross-reference frontmatter keys with a single string value (instead of a YAML list) are silently skipped rather than treated as a one-item reference [backend/app/indexing/parser.py:90-93]
- [x] [Review][Patch] Migration downgrade only guards the final enum-drop with `checkfirst=True`; preceding `op.drop_index`/`op.drop_table` calls aren't guarded, contradicting the migration's own "partial/re-run downgrade must no-op" docstring claim [backend/alembic/versions/4a9956e6f667_add_artifact_index_tables.py]
- [x] [Review][Patch] Stale comment says "FR1's 10 catalogued artifact types" but the enum has 11 values [backend/app/indexing/types.py:16]

## Dev Notes

- **No Epic 2/3 infrastructure exists yet — don't build against it.** `epic-1` runs before `epic-2` (Zero-Setup Onboarding, Space model, AD-007) in this project's sprint order, and Epic 2/3 are both still `backlog`. There is no "Space" table, no remote-repo-scoped multi-tenancy, and no Backend-side Git read access. This story therefore indexes a plain local filesystem root (`ARTIFACT_ROOT`), not a Space-scoped repo — do not invent multi-tenant scoping or Git-remote reading here; that's Epic 2's job when it lands. This is a scope decision made to keep this story buildable now without depending on unbuilt infra — flag it in review the same way Story 0.2 flagged its own scope calls, don't silently assume the reviewer already agrees.
- **AD-006 (`ARCHITECTURE-SPINE.md`) is the binding architectural rule for this story:** "MVP persistence is PostgreSQL, relational tables + JSONB... The graph-based indexing needed for artifact traceability (FR1–FR3) is a plain edge/adjacency model inside this same PostgreSQL store — it is **not** the deferred AI Knowledge Graph and must not be built to depend on it." That's why Task 1 includes `artifact_links` as a plain FK-based edge table, not a graph DB, not `pgvector`, not anything AI-Copilot-adjacent.
- **Why cross-reference extraction is in this story, not deferred to 1.2:** Story 1.2's AC says "links between artifacts are displayed" and "a broken cross-reference renders as broken" — that's a *display* concern. AD-006 ties the underlying edge/adjacency *model* to FR1–FR3 as a whole (Epic 1's capability, not a specific sub-story). If 1.1 only catalogued nodes and left edges to 1.2, Story 1.2 would silently have to redo indexing work under a "dashboard" story instead of extending it — that's exactly the kind of hidden-rework disaster this analysis step exists to catch. 1.1 builds and populates the edges; 1.2/1.3 read and render them.
- **Real frontmatter shapes vary by type — don't assume a uniform schema.** From direct inspection of this repo's actual planning artifacts:
  - `prd.md` (`prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md`): `title`, `status`, `created`, `updated`.
  - `brief.md` (`prjdocs/planning-artifacts/briefs/brief-tarmacacademy-2026-07-24/brief.md`): same shape as PRD (`title`/`status`/`created`/`updated`).
  - `ARCHITECTURE-SPINE.md`: much richer — `name`, `type: architecture-spine`, `purpose`, `altitude`, `scope`, `status`, `created`, `updated`, `binds` (list of FR ids, not a path list — don't treat as a cross-reference), `sources` (list of paths — **is** a cross-reference), `companions` (list of paths — **is** a cross-reference).
  - `DESIGN.md`/`EXPERIENCE.md` (UX): `name`, `status`, `sources` (paths), `updated`; no `title` key (use `name`).
  - `epics.md`: `stepsCompleted` (not a reference), `inputDocuments` (list of paths — **is** a cross-reference).
  - `spec-*.md`: `title`, `type: feature`, `status`, `context` (list of paths — **is** a cross-reference), plus `baseline_revision`/`final_revision` (git hashes, not paths — don't treat as references).
  - Story files (`<epic>-<story>-*.md` under `implementation-artifacts/`): **no frontmatter at all** — just a `# Story X.Y: Title` heading and a plain-text `Status: ...` line in the body. This is the one type needing the title-from-heading fallback in Task 3.
- **`test_migrations.py`'s current hardcoded assertion will break this story's CI unless updated** — see Task 1. This is the single most likely miss for a dev agent working from the AC text alone, since the AC says nothing about that file.
- **Enum naming:** name the new type enum `artifact_type`, explicitly to avoid repeating the naming-collision risk `deferred-work.md` already flagged for Story 0.2's generically-named `role` enum in the same schema namespace.
- **NFR1 (100% deterministic, zero LLM calls)** applies directly here: YAML parsing, path matching, and hashing are all deterministic; nothing in this engine should ever call an LLM.

### Project Structure Notes

- New: `backend/app/indexing/` package — `types.py` (type enum + path patterns), the scan/parse/hash engine module(s), and a CLI entry module, mirroring the existing `backend/app/auth/` package's internal layering (models/logic separated, no monolithic file).
- New: `backend/alembic/versions/<rev>_add_artifact_index_tables.py`, chained on `down_revision = 'bb90a694c827'`.
- New: `backend/tests/test_indexing.py`.
- Modified: `backend/tests/test_migrations.py` (table-list assertion), `.env.example`, `README.md`, `CONTRIBUTING.md`, `.github/workflows/ci.yml` (backend job env).
- No changes to `client/` or `ihm/` — this story is Backend-only, no UI (per the Enabler framing).

### References

- [Source: prjdocs/planning-artifacts/epics.md#Epic 1: Artifact Health & Traceability Catalog] — Story 1.1 text and AC origin.
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#AD-006 — MVP Data Layer: relational + JSONB only] — binding rule for the artifact index + edge model.
- [Source: prjdocs/planning-artifacts/architecture/architecture-bmad-portal-hub-2026-08-01/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — "Artifact indexing & Traceability Matrix (FR1–FR3) | Backend | AD-006" row.
- [Source: prjdocs/planning-artifacts/prds/bmad-portal-hub-2026-08-01/prd.md#4.2 Technical Stack (Proposed)] — "Data Layer: Graph-based indexing of Markdown/YAML/JSON artifacts."
- [Source: backend/app/auth/models.py] — `Mapped`/`mapped_column` SQLAlchemy 2.0 style, UUID PK pattern, native-Postgres-enum pattern to mirror for `artifact_type`.
- [Source: backend/alembic/versions/bb90a694c827_add_users_table.py] — current migration head this story's migration must chain onto (`down_revision`).
- [Source: backend/tests/test_migrations.py] — hardcoded table-list assertion that must be extended, not left to silently fail.
- [Source: prjdocs/implementation-artifacts/deferred-work.md] — the `role` generic-enum-name lesson this story must not repeat.
- [Source: prjdocs/planning-artifacts/implementation-readiness-report-2026-08-06.md] — PM Note establishing Story 1.1's Enabler framing (no "As a [user]").

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- A manual CLI smoke test against the live `prjdocs/` tree (not just `tmp_path` fixtures) surfaced a real bug: PyYAML parses unquoted `created:`/`updated:` frontmatter dates (e.g. `prd.md`, `brief.md`) as `datetime.date`, which psycopg cannot JSON-encode for the `frontmatter` JSONB column — `TypeError: Object of type date is not JSON serializable` on `db.flush()`. Fixed by recursively normalizing `date`/`datetime` values to ISO strings in `parser.extract_frontmatter` (`_json_safe`) before the frontmatter dict is stored. Added `test_unquoted_yaml_dates_in_frontmatter_are_stored_without_error` as a regression test.
- Verified against the real `prjdocs/` tree post-fix: 13 artifacts indexed cleanly on first run (0 errors), second run reports 13/13 `unchanged` (idempotent).
- **Post-review fix (code review, 2026-08-07):** `_resolve_target` now strips a leading path segment matching `root.name` before resolving, so repo-root-relative frontmatter references (e.g. `prjdocs/planning-artifacts/...`) resolve correctly against `ARTIFACT_ROOT=prjdocs`. Verified against the real `prjdocs/` tree: 8/14 links now resolve (up from 0/14 pre-fix). The remaining 6 unresolved links are unrendered template placeholders in source frontmatter (`{project-root}/...`, `{planning_artifacts}/...`) — genuinely broken references in the source docs themselves, correctly surfaced as broken rather than hidden, per Story 1.2's AC.

### Completion Notes List

- Implemented all 8 tasks: Alembic migration (`artifact_type` enum, `artifacts`, `artifact_links`), path/filename classification (`app/indexing/types.py`), frontmatter parsing + title/status derivation + cross-reference extraction (`app/indexing/parser.py`), malformed-artifact handling (per-file try/catch, `error` column), idempotent scan with content-hash change detection (`app/indexing/scanner.py`, `run_index`), `ARTIFACT_ROOT` config + CLI entry (`app/indexing/config.py`, `app/indexing/cli.py`), tests (`backend/tests/test_indexing.py`, 6 cases covering AC1-AC3), and documentation (README/CONTRIBUTING/.env.example).
- `test_migrations.py`'s hardcoded table-list assertion was updated and renamed (`test_migrations_create_only_the_expected_tables`) to include `artifacts`/`artifact_links`, per the story's explicit warning that skipping this breaks CI.
- Added `pyyaml` as an explicit `backend/pyproject.toml` dependency — it was already present transitively (via `uvicorn[standard]`) but this module imports it directly, so an explicit pin is correct rather than relying on another package's transitive dependency.
- Migration verified with a full upgrade/downgrade/upgrade round-trip against the local dev PostgreSQL instance (`docker-compose.yml`'s `bmad-portal-postgres`), plus the full existing + new test suite (20 tests) and `ruff check .`, all green.
- **Resolved in code review (2026-08-07):** the original implementation resolved every path literally relative to `ARTIFACT_ROOT`, which meant real repo-root-relative frontmatter references never matched. `_resolve_target` (`backend/app/indexing/scanner.py`) now normalizes a leading path segment matching `ARTIFACT_ROOT`'s own directory name before resolving, so real cross-references resolve correctly (verified: 8/14 on the live `prjdocs/` tree, up from 0/14). See Review Findings and Debug Log References above.

### File List

- `backend/pyproject.toml` (modified — added `pyyaml` dependency)
- `backend/alembic/versions/4a9956e6f667_add_artifact_index_tables.py` (new)
- `backend/app/indexing/__init__.py` (new)
- `backend/app/indexing/types.py` (new)
- `backend/app/indexing/models.py` (new)
- `backend/app/indexing/parser.py` (new)
- `backend/app/indexing/scanner.py` (new)
- `backend/app/indexing/config.py` (new)
- `backend/app/indexing/cli.py` (new)
- `backend/tests/test_indexing.py` (new)
- `backend/tests/test_migrations.py` (modified — table-list assertion extended, test renamed)
- `.env.example` (modified — added `ARTIFACT_ROOT`)
- `.github/workflows/ci.yml` (modified — added `ARTIFACT_ROOT` to backend job env)
- `README.md` (modified — Status section updated for Epic 1 / Story 1.1)
- `CONTRIBUTING.md` (modified — added Artifact indexing env var + walkthrough sections)

## Change Log

- 2026-08-07: Story 1.1 implemented — artifact indexing engine (migration, classification, parsing, malformed-artifact handling, idempotent scan, CLI, config, tests, docs). Status moved to `review`.
- 2026-08-07: Code review — 1 decision-needed (cross-reference path resolution, decided: fix now) + 9 patch findings, all applied: root-relative cross-reference resolution fixed, per-file exception handling hardened (non-UTF-8/read-failure no longer aborts the scan), double-digit epic/story classification fixed, non-string status coerced instead of dropped, single-string cross-reference values accepted, migration downgrade made idempotent, stale "10 types" comment corrected, plus new tests for link-refresh-on-rerun, CLI entry point, and `ARTIFACT_ROOT` config fallback. 29/29 backend tests pass, `ruff check` clean. 12 lower-severity findings dismissed as noise (see review discussion). Status moved to `done`.
