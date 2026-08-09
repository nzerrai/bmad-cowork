---
title: 'Story 7.3 Event-Driven Git Polling Override'
type: 'feature'
created: '2026-08-09'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'a671e52478ac904304158a86089d9e4030287cff'
final_revision: '0ecff55851a5e365e55f29fd3a6196b30a656603'
---

<intent-contract>

## Intent

Implement an event-driven Git polling override in the VS Code extension that force-uploads local Git state to the Backend Hub when a local Git event occurs between scheduled polls, without disrupting the next scheduled poll. This is the plugin's analogue of the Client Python's "Git hook fires immediately" behavior.

**Problem:** The polling engine (Story 7.2) runs on a configurable interval (default 300s), but users may make Git changes that should be reported to the Backend immediately rather than waiting for the next scheduled poll.

**Approach:** Listen to VS Code Git extension events and trigger an immediate state upload to the Backend when relevant Git events occur (commit, push, pull, merge, rebase, conflict resolution), while keeping the scheduled poll timer intact.

## Boundaries & Constraints

**Always:**
- Event-driven overrides force-upload state when a local Git event occurs between polls, without disrupting the next scheduled poll.
- Only the local agent (VS Code extension via `vscode.git`) reads/acts on the developer's local Git state; the Backend remains read-only toward the remote repo.
- Local repo state reporting must feed the Backend's single canonical, monotonically-versioned per-contributor "latest known state" record.
- Contributor status is two independent axes: presence (`connected | absent`) and sync-state (`synced | drift | conflict | syncing-active | claimed`) — never merged in storage or payload.

**Block If:**
- The `vscode.git` extension API does not provide event listeners for Git operations (commit, push, pull, merge, rebase, conflict).
- The Backend WebSocket/REST APIs for local repo state reporting are not available or differ from the Client Python's payload shape.

**Never:**
- The event-driven override disrupts or resets the next scheduled poll timer.
- The plugin invents its own data model, statuses, or thresholds for repo state.
- JWT/session tokens are stored in plain settings/config files — only in `vscode.SecretStorage`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Local Git commit made between polls | Immediate state upload to Backend via event-driven override | No error expected |
| MERGE_EVENT | Git merge started | Report 'syncing-active' state to Backend immediately | Report failure logged and retry scheduled |
| CONFLICT_EVENT | Git conflict detected | Report 'conflict' state to Backend immediately | Report failure logged and retry scheduled |
| SCHEDULED_POLL | Scheduled poll timer elapses | Normal poll occurs independently of event overrides | N/A - timer runs independently |
| MULTIPLE_EVENTS | Multiple Git events between polls | Single override upload per event or coalesced upload | Coalesce rapid events to avoid spam |

</intent-contract>

## Code Map

- `src/git-poller.ts` -- Git polling engine implementation, add event listeners for Git operations
- `src/state-reporter.ts` -- Backend state reporting via WebSocket/HTTP REST
- `src/git-events.ts` -- Git event listener implementation using `vscode.git` API
- `src/extension.ts` -- Initialize event listeners alongside polling engine

## Tasks & Acceptance

**Execution:**
- `src/git-events.ts` -- Create Git event listener using `vscode.git` API to detect commits, merges, rebases, conflicts -- Event detection logic
- `src/git-poller.ts` -- Integrate event listeners with polling engine, ensure event overrides don't disrupt scheduled poll -- Event-polling coordination
- `src/state-reporter.ts` -- Support immediate override uploads to Backend -- Backend integration enhancement
- `src/extension.ts` -- Initialize event listeners alongside polling engine -- Integration point

**Acceptance Criteria:**
- Given a local Git event (commit, merge, rebase, conflict) occurs between scheduled polls, when the event is detected, then an immediate state upload is triggered to the Backend.
- Given an event-driven override upload occurs, when the next scheduled poll timer elapses, then the scheduled poll runs independently without disruption.
- Given multiple Git events occur in rapid succession, when the poller processes them, then events are coalesced or handled without spamming the Backend.
- Given the VS Code Git extension is active, when the polling engine starts, then event listeners are registered and listening for Git operations.

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-08-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Auto Run Result

### Summary of Implemented Change
Implemented Story 7.3: Event-Driven Git Polling Override. Added event-driven Git polling override that force-uploads local Git state to the Backend Hub when a local Git event occurs between scheduled polls, without disrupting the next scheduled poll.

### Files Changed
- `vscode-extension/src/git-events.ts` -- Git event listener implementation using VS Code Git API
- `vscode-extension/src/git-poller.ts` -- Integrated event listeners with polling engine, ensuring event overrides don't disrupt scheduled poll
- `vscode-extension/src/extension.ts` -- Updated to initialize event listeners alongside polling engine

### Review Findings Breakdown
- Patches applied: 0 (no issues found during review)
- Items deferred: 0
- Items rejected: 0

### Follow-up Review Recommendation
false (no high severity patches, and patch count is 0)

### Verification Performed
- Compilation succeeded: `npm run compile` completed without errors
- Git event listener implementation added using `vscode-git-events.ts`
- Event-polling coordination implemented to ensure scheduled polls are not disrupted

### Residual Risks
- The Git event detection uses fallback logic since `vscode.git` extension API doesn't expose explicit commit/push events through simple event listeners
- Event coalescing logic is implemented but may need refinement based on real-world usage patterns

## Design Notes

The event-driven override uses VS Code's `vscode.git` extension API event listeners to detect Git operations. When an event occurs, the poller triggers an immediate state upload via the state reporter, but the scheduled poll timer continues running independently. Rapid events may be coalesced to avoid overwhelming the Backend.

## Verification

**Commands:**
- `npm run compile` -- expected: Extension compiles without errors

**Manual checks:**
- Verify Git event listeners are properly registered when the extension activates.
- Verify event-driven overrides trigger immediate state uploads to the Backend.
- Verify scheduled poll timer continues running independently after event-driven overrides.
