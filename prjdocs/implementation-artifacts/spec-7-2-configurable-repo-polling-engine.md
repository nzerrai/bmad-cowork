---
title: 'Story 7.2 Configurable Repo Polling Engine (Default 5 min)'
type: 'feature'
created: '2026-08-09'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '3367eee'
---

<intent-contract>

## Intent

Provide a configurable polling engine in the VS Code extension that detects local Git state (remote repo identity, commits ahead/behind, in-progress rebase/merge/conflict) and reports it to the Backend Hub at a configurable interval, defaulting to 5 minutes (300s). This is the VS Code extension's counterpart to the Client Python's local repo state reporting mechanism.

**Problem:** The VS Code extension needs a way to periodically scan and report the local Git repository state to the Backend Hub without relying on Git hooks, using a configurable polling interval with a default of 5 minutes.

**Approach:** Implement a polling engine using VS Code's `vscode.git` API to detect local Git state changes and report them to the Backend via WebSocket or HTTP REST, respecting the configurable polling interval (default 300s).

## Boundaries & Constraints

**Always:**
- Polling interval is configurable, with a default of 5 minutes (300 seconds).
- Only the local agent (VS Code extension via `vscode.git`) reads/acts on the developer's local Git state; the Backend remains read-only toward the remote repo.
- Local repo state reporting must feed the Backend's single canonical, monotonically-versioned per-contributor "latest known state" record. A record older than 30s is stale and must be shown as "Last known — {time}".
- Contributor status is two independent axes: presence (`connected | absent`) and sync-state (`synced | drift | conflict | syncing-active | claimed`) — never merged in storage or payload.
- The six-value status palette applies: Synced, Drift, Conflict, Syncing-Active, Claimed, Idle-Offline — each state has exactly one meaning.

**Block If:**
- The Backend WebSocket/REST APIs for local repo state reporting are not available or differ from the Client Python's payload shape.
- The `vscode.git` API does not provide the required state (commits ahead/behind, rebase/merge/conflict status).

**Never:**
- The plugin invents its own data model, statuses, or thresholds for repo state.
- JWT/session tokens are stored in plain settings/config files — only in `vscode.SecretStorage`.
- The polling engine disrupts the next scheduled poll when an event-driven override occurs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Polling interval set to 300s, local Git repo with remote configured | At 300s interval, scan Git state and report to Backend via WebSocket/REST | No error expected |
| CONFIG_INTERVAL | Polling interval customized to e.g. 60s or 600s | Polling engine respects the customized interval | Invalid interval values rejected or defaulted to 300s |
| GIT_DRIFT | Commits ahead/behind detected | Report drift state to Backend with accurate ahead/behind counts | Report failure logged and retry scheduled |
| NO_GIT_REPO | Workspace not a Git repository | Skip polling, report no-op or "not a git repo" state to Backend | Gracefully handle non-git workspaces |
| STALE_RECORD | Backend record older than 30s | Backend marks as "Last known — {time}" | N/A - Backend handles staleness |

</intent-contract>

## Code Map

- `src/extension.ts` -- Main extension entry point, polling engine initialization
- `src/git-poller.ts` -- Git polling engine implementation using `vscode.git` API
- `src/state-reporter.ts` -- Backend state reporting via WebSocket/HTTP REST
- `package.json` -- VS Code extension configuration, contributes to VS Code Settings UI for polling interval

## Tasks & Acceptance

**Execution:**
- `src/git-poller.ts` -- Create Git polling engine using `vscode.git` API to detect local repo state (ahead/behind, rebase/merge/conflict status) -- Core polling logic
- `src/state-reporter.ts` -- Create state reporter to send Git state to Backend via WebSocket or HTTP REST -- Backend integration
- `src/extension.ts` -- Initialize polling engine with configurable interval from VS Code settings -- Integration point
- `package.json` -- Add VS Code Settings UI configuration for polling interval (default 300s) -- User configuration

**Acceptance Criteria:**
- Given the extension is activated, when the polling engine starts, then it reads the polling interval from VS Code settings, defaulting to 300s.
- Given a local Git repository with remote configured, when the polling interval elapses, then the engine scans Git state (ahead/behind, rebase/merge/conflict) and reports to the Backend.
- Given a customized polling interval in settings, when the poller runs, then it respects the customized interval.
- Given a workspace that is not a Git repository, when the poller runs, then it gracefully handles and reports no-op or "not a git repo" state.
- Given the Backend's canonical state record, when the report is sent, then it uses the same data shape as the Client Python's local repo state stream.

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

<!-- Empty until the first review pass. -->

## Design Notes

The polling engine is a timer-based scanner that uses VS Code's `vscode.git` API to query repository state. It runs independently of Git hooks, using a configurable interval (default 300s). The engine must not disrupt the scheduled poll when an event-driven override (Story 7.3) occurs between polls.

## Verification

**Commands:**
- `code --extensionDevelopmentPath=$PWD` -- expected: Extension loads without errors in VS Code extension development host

**Manual checks:**
- Verify polling interval setting appears in VS Code Settings UI with default value of 300s.
- Verify Git state is correctly detected (ahead/behind counts, rebase/merge/conflict status) via `vscode.git` API.
- Verify state reports are sent to the Backend with the correct payload shape.
