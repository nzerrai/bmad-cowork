---
title: 'VS Code Extension Skeleton & package.json Setup'
type: 'chore'
created: '2026-08-09'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: true
context: ['{project-root}/prjdocs/implementation-artifacts/epic-7-context.md']
warnings: []
baseline_revision: 'a8d1261e6d27c7ff021807f991f69801578a4005'
final_revision: 'accb8cd4efe361dd18a0946aaebe978deafd65b6'
---

<intent-contract>

## Intent

**Problem:** Epic 7 (VS Code Plugin) has no code yet — only planning docs. Every later Epic 7 story (configurable polling, event-driven override, Secret Storage JWT, sidebar Web View, dashboard widgets, Command Palette integration) needs a real, buildable, installable extension skeleton with its contribution points already declared, instead of improvising `package.json` structure mid-feature.

**Approach:** Scaffold `vscode-extension/` as a fourth sibling top-level tier (TypeScript, compiled via `tsc`), with a `package.json` manifest declaring VS Code contributions (commands, a `bmadPortal.*` configuration section covering every setup parameter later stories read, and an activity-bar view container + webview view) plus a minimal `extension.ts` that registers those commands, creates a status bar widget, and registers a placeholder `WebviewViewProvider`. Wire lint/compile/package/test scripts, a 4th CI job, and CONTRIBUTING.md docs, matching the existing three tiers' conventions.

## Boundaries & Constraints

**Always:**
- `vscode-extension/` is a new sibling top-level tier alongside `backend/`, `client/`, `ihm/`.
- `package.json` declares: `engines.vscode`, at least one command, a webview view inside a dedicated activity-bar view container (requires a view container icon asset), and a `bmadPortal.*` `contributes.configuration` section with a working default + description for each of: `backendHubUrl`, `repoPollingIntervalSec` (default 300s), `authMethod`, `dashboardDisplayMode`, `enableEventDrivenPolling`, `dashboardRefreshIntervalSec` — the six setup parameters named or implied across Epic 7's stories.
- `extension.ts` registers every command and view `package.json` declares (a handler may be a documented placeholder where the real behavior is a later story) and creates the status bar item in code — VS Code has no stable `package.json` contribution point for status bar items, only for commands/views/configuration.
- Where the architecture spine is silent on this tier's stack (it has no dedicated Epic 7 entry), follow the IHM tier's existing TypeScript/Node conventions: Node >= 20.9, TypeScript ^5, ESLint flat config.
- The extension is buildable (`npm run compile` exits 0) and packageable into an installable `.vsix` (`npm run package`, backed by `@vscode/vsce`) without requiring a real Marketplace publisher account — packaging, not publishing, is this story's bar for "installable."
- CI gets a 4th job (`vscode-extension`) running lint + compile + test on every PR, matching the existing per-tier job pattern; `CONTRIBUTING.md` documents local run/package steps; `README.md`'s tier table gains a row.

**Block If:**
- The npm registry is unreachable in this environment, making `@types/vscode`/`@vscode/vsce` uninstallable and the "buildable and installable" AC unverifiable end-to-end.

**Never:**
- No real polling engine, Git-event detection, Secret Storage JWT flow, populated dashboard widgets, or Command Palette feature-suggestion logic (Stories 7.2–7.7) — contribution points and placeholder handlers only.
- No Marketplace publish — this story stops at a locally packageable `.vsix`, per Epic 7's Implementation Notes and this story's AC wording ("buildable and installable"), not "published."
- No new Backend surface — the extension is a new client only; it consumes the existing WebSocket/REST APIs, never adds routes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compile | `npm run compile` in `vscode-extension/` | Exits 0, emits `out/extension.js` | Non-zero exit on a real TS error |
| Package | `npm run package` in `vscode-extension/` | Exits 0, produces a `.vsix` file | Non-zero exit if manifest is invalid |
| Activation | Extension host loads the packaged/installed extension | `activate()` runs without throwing; status bar item and dashboard view appear | Uncaught exception fails activation, visible in the Extension Host log |
| Configuration defaults | Fresh install, no user overrides | `vscode.workspace.getConfiguration('bmadPortal')` returns the documented default for every declared key | - |
| CI lint/test violation | PR introduces a lint violation or failing test in `vscode-extension/` | That job fails, blocks merge | CI status shows failure, not a false pass |

</intent-contract>

## Code Map

- `vscode-extension/package.json` -- manifest: commands, configuration, view container/view, engines, scripts (new)
- `vscode-extension/tsconfig.json` -- TS ^5 compiler config, `out/` outDir (new)
- `vscode-extension/eslint.config.mjs` -- ESLint flat config for `src/**/*.ts` (new)
- `vscode-extension/src/extension.ts` -- `activate`/`deactivate`: registers commands, status bar item, placeholder `WebviewViewProvider` (new)
- `vscode-extension/media/icon.svg` -- monochrome activity-bar view container icon (new)
- `vscode-extension/test/package-manifest.test.mjs` -- asserts `package.json` declares the required commands/configuration keys+defaults (new)
- `vscode-extension/.vscodeignore` -- excludes `src/`, `test/`, dev-only files from the packaged `.vsix` (new)
- `vscode-extension/.gitignore` -- excludes `out/`, `node_modules/`, `*.vsix` (new)
- `vscode-extension/README.md` -- extension-facing readme (settings table, commands) (new)
- `.github/workflows/ci.yml` -- add `vscode-extension` job (lint + compile + test) (modify)
- `CONTRIBUTING.md` -- add tier's local run/package steps (modify)
- `README.md` -- add tier row to the stack table (modify)

## Tasks & Acceptance

**Execution:**
- `vscode-extension/package.json` -- declare `engines.vscode`, `contributes.commands` (`bmadPortal.showDashboard`, `bmadPortal.showSuggestedFeatures`), `contributes.configuration` (6 keys above, each with default+description), `contributes.viewsContainers.activitybar` + `contributes.views` (webview view), `scripts` (`compile`, `watch`, `lint`, `test`, `package`) -- proves AC1/AC2
- `vscode-extension/src/extension.ts` -- `activate()` registers both commands, creates a status bar item (text + tooltip + command), registers a `WebviewViewProvider` for the declared view rendering a placeholder HTML body -- proves AC1 (contributions are real, not just declared) and AC3
- `vscode-extension/test/package-manifest.test.mjs` -- reads `package.json`, asserts every configuration key from the I/O matrix exists with its documented default, and both commands are declared -- unit-tests the I/O matrix's "Configuration defaults" row
- `npm run package` (`@vscode/vsce`) verified to produce a valid `.vsix` -- proves AC3 ("installable")
- `.github/workflows/ci.yml` -- add the `vscode-extension` job -- keeps CI's per-tier invariant intact
- `CONTRIBUTING.md` + `README.md` -- document the new tier -- keeps docs in sync with Story 0.1's established pattern

**Acceptance Criteria:**
- Given the `vscode-extension/` `package.json`, when inspected, then it declares VS Code contributions for commands, settings, a webview, and the extension registers a status bar widget at activation.
- Given the `bmadPortal.*` configuration section, when inspected, then it defines `backendHubUrl`, `repoPollingIntervalSec`, `authMethod`, `dashboardDisplayMode`, and every other setup parameter later Epic 7 stories reference by name, each with a working default.
- Given a clean checkout of `vscode-extension/`, when `npm install && npm run compile && npm run package` is run, then it exits 0 and produces an installable `.vsix`.
- Given a PR introduces a lint violation or failing test in `vscode-extension/`, when CI runs, then the pipeline fails and blocks merge.

## Spec Change Log

## Review Triage Log

### 2026-08-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 0, medium 4, low 3)
- defer: 2: (high 0, medium 1, low 1)
- reject: 9: (high 0, medium 0, low 9)
- addressed_findings:
  - `[medium]` `[patch]` `vscode-extension/package.json` now has a `vscode:prepublish` script (`npm run compile`) so `vsce package` always compiles first, regardless of invocation order — previously a bare `npm run package` on a fresh checkout could ship a missing/stale `out/extension.js`.
  - `[medium]` `[patch]` `.github/workflows/ci.yml`'s `vscode-extension` job now runs `npm run package` (and removes the produced `.vsix`) after lint/compile/test, so a packaging regression (invalid manifest, broken `engines.vscode` semver) fails CI instead of merging silently — the story's "installable" AC previously had no CI coverage at all.
  - `[medium]` `[patch]` `vscode-extension/test/extension.test.mjs` now cross-checks the webview view id it captures from `extension.ts`'s `registerWebviewViewProvider` call against `package.json`'s own declared `contributes.views['bmadPortal-sidebar'][0].id`, so a future edit that renames the id in only one file fails a test instead of shipping an orphaned/errored sidebar view with a fully green CI run.
  - `[medium]` `[patch]` `vscode-extension/package.json`'s `lint` script now covers `test/` as well as `src/` (`eslint src test --max-warnings=0`), with `test/stubs/**` added to `eslint.config.mjs`'s `ignores` (a static CommonJS stub, not code under test) — previously a lint violation in `test/*.mjs` was invisible to `npm run lint`, contradicting the spec's own I/O matrix row promising any lint violation in `vscode-extension/` fails CI.
  - `[low]` `[patch]` `vscode-extension/package.json` now declares `engines.node: ">=22.3.0"` (the binding floor, since `npm test` needs it) so an old-Node contributor gets a clear `npm install`/`npm ci` engine mismatch instead of a cryptic unrecognized-flag crash.
  - `[low]` `[patch]` `vscode-extension/test/extension.test.mjs` now invokes the captured `bmadPortal.showSuggestedFeatures` handler and asserts it calls `vscode.window.showInformationMessage` exactly once, instead of only asserting the command was registered.
  - `[low]` `[patch]` `vscode-extension/src/extension.ts`'s module-level `let statusBarItem` (dead state — only ever read/written inside `activate()` before being pushed to `context.subscriptions`, which is what VS Code actually uses for disposal) is now a local `const` inside `activate()`.

Deferred (see `deferred-work.md`): the pre-existing, unmodified `ihm` CI job pins Node 20 while its own `npm test` script needs Node >= 22.3 for the same `--experimental-test-module-mocks` flag this story's new job was pinned to Node 22 to support (Epic 1 tier, out of this story's scope); no `LICENSE` file exists anywhere in the repo, which `vsce package` now surfaces as a non-fatal warning on every packaging run (pre-existing repo-wide gap, first made visible by this story's tooling).

Rejected as noise, unavoidable given the approach, or already the best available given environment constraints (9): a local devDependency literally named `vscode` (`file:test/stubs/vscode`) shadowing the real npm package name — deliberate and required by the mocking technique (the key name IS the specifier being resolved), already documented in the stub's own `description` field; `context.subscriptions.length === 4` being a "content-blind" count — supplementary to, not a replacement for, the more specific assertions already covering each of the four registrations individually; `eslint.config.mjs`'s `ignores` not covering `test/**` — superseded by the lint-scope patch above, which deliberately wants `test/**` linted, not ignored; running `npm run compile` as both an explicit CI step and again via `pretest` before `npm test` — mild redundancy, not a correctness issue, kept for clear per-step CI reporting; `media/icon.svg`'s hardcoded `fill="#000000"` — contradicted by VS Code's documented activity-bar icon model, which masks/recolors monochrome container icons per-theme regardless of the source fill value; the Activation and Configuration-defaults I/O matrix rows being verified via a mocked `vscode` module / direct `package.json` read rather than a real Extension Host or a real `vscode.workspace.getConfiguration` call — already explicitly disclosed in this spec's Design Notes and Verification's manual-check fallback, and the best available proxy given this environment has no VS Code GUI; a claimed missing `vscode-extension/package-lock.json` — contradicted, the file exists on disk (confirmed via `git status`) and was only omitted from the trimmed diff excerpt given to review layers for size reasons, not actually absent from the change.

### 2026-08-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 1, low 4)
- defer: 0
- reject: 17: (high 0, medium 0, low 17)
- addressed_findings:
  - `[medium]` `[patch]` `vscode-extension/test/extension.test.mjs` now invokes the captured `bmadPortal.showDashboard` handler and asserts the `executeCommand` target it passes equals `workbench.view.extension.${declaredContainerId}` (cross-checked against `package.json`'s own declared activity-bar container id) — previously only the command's *registration* was asserted; the Verification Gap reviewer demonstrated the prior gap by mutating the hardcoded target string in `extension.ts` and showing all 5 tests still passed.
  - `[low]` `[patch]` `.github/workflows/ci.yml`'s `vscode-extension` job's "Package" step now asserts the `.vsix` file exists (`ls -- *.vsix`) before removing it, so a `vsce package` that exits 0 without producing an artifact would fail CI instead of a silent no-op pass.
  - `[low]` `[patch]` `vscode-extension/.vscode/launch.json` (+ matching `tasks.json` default build task) now ships an explicit "Run Extension" debug config, so README.md's/CONTRIBUTING.md's documented "press F5" step launches the Extension Development Host directly instead of relying on VS Code's implicit QuickPick fallback.
  - `[low]` `[patch]` `vscode-extension/.vscodeignore` now excludes `package-lock.json` (previously shipped unnecessarily inside the packaged `.vsix`).
  - `[low]` `[patch]` `CONTRIBUTING.md`'s CI section now lists `npm run package` alongside lint/compile/test for the `vscode-extension` job, matching what `.github/workflows/ci.yml`'s job actually runs (previously undocumented).

Rejected as noise, already-settled prior-review decisions, factually incorrect, or out of this story's scope (17): `package.json`'s `repository.url` pointing to `nzerrai/bmad-cowork` flagged as a likely wrong/copy-pasted repo — contradicted, confirmed via `git remote -v` that this **is** the actual `origin` remote; `engines.node: ">=22.3.0"` as a blanket floor "contradicting" CONTRIBUTING's claim that build/lint only need Node 20.9 — not a real contradiction under npm's default (non-strict) engine-check behavior, and the exact tradeoff the prior review pass deliberately chose (fail-fast `npm install` warning on old Node) per this file's own prior triage entry; running `npm run compile` as both an explicit CI step and again via `pretest` — already rejected in the prior pass as mild, harmless redundancy; the `"vscode": "file:test/stubs/vscode"` shadow devDependency — already rejected in the prior pass as deliberate and required by the mocking technique; redundant view-id/command assertions split across `extension.test.mjs` and `package-manifest.test.mjs` — already the deliberate result of the prior pass's cross-check patch; no `LICENSE` file / missing `license` field surfacing a `vsce package` warning — already tracked as a deferred, pre-existing repo-wide gap in this file's prior triage entry and in `deferred-work.md`; missing CSP meta tag in the placeholder dashboard webview HTML — moot while `enableScripts: false`, and adding one now to a placeholder due for replacement in Stories 7.5/7.6 is premature; `deactivate()` never being unit-tested — it is an intentional no-op with nothing to assert; no top-level extension `icon` (PNG) for the Extensions view listing — not required by this story's Always list (which only requires the activity-bar container SVG, already present); `eslint.config.mjs`'s explicit `languageOptions` block being scoped only to `files: ['src/**/*.ts']` rather than also covering the linted `test/*.mjs` files — those files already lint clean under the tool defaults, a real but currently inert config gap not worth touching for a scaffold story; missing `enum` validation on `authMethod`/`dashboardDisplayMode` — out of scope per the intent's own "Never" boundary (real auth/dashboard logic, including its validation, belongs to Stories 7.4/7.6); missing `minimum` validation on the two interval settings — same "Never" boundary, belongs to the real polling engine (Story 7.2/7.6); CI running only on `ubuntu-latest` rather than a Windows/macOS matrix — matches the existing per-tier job pattern, which the intent explicitly directs this job to follow; missing `try`/`catch` around `activate()`'s registrations — defensive handling for a double-registration scenario that cannot occur under VS Code's normal single-activation lifecycle; no uncaught-rejection guard on `showDashboard`'s `executeCommand` call — same reasoning, defends against a VS Code-internal API failure that isn't a realistic scenario for this contribution; test files being run directly via `node --test` (bypassing the `pretest` compile hook) producing a confusing module-not-found error — only reachable by bypassing the documented `npm test` entry point.

## Design Notes

`package.json`'s contribution model has no stable point for status bar items (only a VS Code-proposed, non-stable `statusBarItems` contribution exists) — the AC's "status bar widget" is satisfied by creating it programmatically in `extension.ts`'s `activate()`, which is the standard, stable way every published extension does this. Configuration key set: `backendHubUrl`, `repoPollingIntervalSec`, `authMethod`, `dashboardDisplayMode` are named verbatim in this story's AC; `enableEventDrivenPolling` and `dashboardRefreshIntervalSec` are pulled from Stories 7.3/7.6's AC text (the only other setting names the epic ever specifies), covering the AC's "etc." Publisher packaging uses a placeholder `publisher` id (`bmad-portal`) sufficient for `vsce package`'s local `.vsix` output — a real Marketplace publisher account is an operator action out of scope for "buildable and installable," which this story satisfies via local packaging, not a Marketplace listing.

## Verification

**Commands:**
- `cd vscode-extension && npm install` -- expected: exits 0
- `cd vscode-extension && npm run compile` -- expected: exits 0, `out/extension.js` exists
- `cd vscode-extension && npm run lint` -- expected: exits 0
- `cd vscode-extension && npm test` -- expected: all assertions pass
- `cd vscode-extension && npm run package` -- expected: exits 0, produces `vscode-extension/*.vsix`

**Manual checks (if no CLI):**
- Open `vscode-extension/` in VS Code and press F5 (Extension Development Host): confirm the status bar item appears and the BMad Portal activity-bar icon opens the (placeholder) dashboard view with no console errors.

## Auto Run Result

Status: done

**Summary:** Story 7.1's implementation (VS Code extension skeleton: `package.json` contributions, `extension.ts`, tooling, CI job, docs) was already committed prior to this run (`accb8cd`). This run performed a fresh follow-up review pass (`review_loop_iteration` stayed `0`) requested by the prior pass's `followup_review_recommended: true`, applying 5 small patches on top.

**Files changed this pass:**
- `.github/workflows/ci.yml` -- the `vscode-extension` job's Package step now asserts the `.vsix` exists (`ls -- *.vsix`) before removing it
- `CONTRIBUTING.md` -- CI section now lists `npm run package` for the `vscode-extension` job, matching `ci.yml`
- `vscode-extension/.vscodeignore` -- now excludes `package-lock.json` from the packaged `.vsix`
- `vscode-extension/.vscode/launch.json` (new) + `vscode-extension/.vscode/tasks.json` (new) -- explicit "Run Extension" F5 debug config + default build task
- `vscode-extension/test/extension.test.mjs` -- now invokes the `bmadPortal.showDashboard` handler and asserts its `executeCommand` target matches `package.json`'s declared activity-bar container id
- `prjdocs/implementation-artifacts/spec-7-1-vscode-extension-skeleton-and-packagejson-setup.md` -- this pass's Review Triage Log entry, frontmatter status

**Review findings breakdown (this pass):** patch 5 (medium 1, low 4), defer 0, reject 17 (see Review Triage Log for detail — several rejects were prior-pass-settled decisions re-surfacing, one was a factually incorrect finding disproven via `git remote -v`).

**Verification performed:** `npm run compile`, `npm run lint`, `npm test` (5/5 passing, including the new `showDashboard` assertion), and `npm run package` (produces a valid `.vsix`, `package-lock.json` confirmed excluded from its contents) all re-run after applying patches — all exit 0.

**Residual risks:** None material. The pre-existing, unrelated `prjdocs/implementation-artifacts/sprint-status.yaml` modification (marking `7-1-...` as `done`) predates this run and is left uncommitted as a residual artifact, not part of this reviewed change.

