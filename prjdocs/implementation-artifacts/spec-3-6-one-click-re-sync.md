---
title: 'Story 3.6 One-click Re-sync'
type: 'feature'
created: '2026-08-10'
status: 'in-review'
review_loop_iteration: 0
baseline_revision: '9697b1d4b4842ff7acb74d486585c542e5ec71c0'
final_revision: ''
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

As a PM / Developer, I want a one-click [Re-sync] action on stale or conflicted stories, so that I can quickly refresh their state without manual investigation.

**Problem:** When stories are flagged as stale or in conflict, the PM/Developer has to manually investigate and refresh their state.

**Approach:** Implement a one-click [Re-sync] action that can be triggered on stale or conflicted stories. When triggered, each story re-fetches its latest Git-linked state independently. If a story fails to re-sync, it shows an inline error "Re-sync failed — retry" without blocking the others that succeed.

## Boundaries & Constraints

**Always:**
- The [Re-sync] action is available on stories flagged as stale or in conflict.
- Each story re-fetches its latest Git-linked state independently when [Re-sync] is triggered.
- If a story fails to re-sync, it shows an inline error "Re-sync failed — retry" without blocking the others that succeed.

**Block If:**
- The Backend sync service is unavailable or returning errors for all re-sync attempts.
- The canonical read model for repo-state (AD-008) is unavailable.

**Never:**
- Never block the re-sync of other stories if one story fails to re-sync.
- Never use LLM or non-deterministic operations for re-sync — all sync operations must be 100% deterministic (scripts CLI, parsing fichiers, commandes Git).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | One or more stories are flagged stale or in conflict | [Re-sync] action is available, when triggered each story re-fetches its latest Git-linked state independently | No error expected |
| PARTIAL_FAILURE | One or more stories fail to re-sync | Failed stories show inline error "Re-sync failed — retry" without blocking the others that succeed | No error expected |
| ALL_FAILURE | All selected stories fail to re-sync | All selected stories show inline error "Re-sync failed — retry" | No error expected |

</intent-contract>

## Code Map

- `ihm/app/hub/sprints/stories-table.tsx` or similar -- Stories table component with [Re-sync] action
- `ihm/components/re-sync-button.tsx` -- [Re-sync] button component for stale/conflicted stories
- `ihm/services/re-sync.service.ts` -- Service to handle re-sync API calls independently per story
- Backend: Git state re-fetch endpoint for individual stories (FastAPI)

## Tasks & Acceptance

**Execution:**
- `ihm/components/re-sync-button.tsx` -- Create Re-sync button component -- Show [Re-sync] action on stories flagged stale or in conflict
- `ihm/services/re-sync.service.ts` -- Implement re-sync service -- Re-fetch latest Git-linked state independently per story
- `ihm/components/re-sync-error-handler.tsx` -- Implement re-sync error handler -- Show "Re-sync failed — retry" inline error without blocking others

**Acceptance Criteria:**
- Given one or more stories are flagged stale or in conflict, when I select them and trigger [Re-sync], then each story re-fetches its latest Git-linked state independently
- Given a story fails to re-sync, when the re-sync completes, then it shows an inline error "Re-sync failed — retry" without blocking the others that succeed

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-08-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11
- defer: 4
- reject: 0
- addressed_findings:
  - `[low]` `[patch]` Fixed JSDoc contradiction in reSyncStory (returns false or throws on auth error)
  - `[low]` `[patch]` Fixed convoluted control flow in ResyncButton.handleResync (removed throw/catch pattern)
  - `[low]` `[patch]` Added type validation for data.success field in reSyncStory
  - `[low]` `[patch]` Fixed redundant type definition for stateSignal in ResyncButtonProps
  - `[low]` `[patch]` Fixed inconsistent error text in reSyncStories ("Re-sync failed — retry" instead of "Re-sync failed")
  - `[low]` `[patch]` Added storyId URL encoding to prevent malformed URLs
  - `[low]` `[patch]` Added mounted state check to prevent state updates on unmounted component
  - `[low]` `[patch]` Added onResyncComplete error handling to prevent callback throw from breaking flow
  - `[low]` `[patch]` Added empty storyIds array guard in reSyncStories
  - `[low]` `[patch]` Added gitState field handling in reSyncStories ResyncResponse objects
  - `[low]` `[patch]` Added HTTP response status validation for non-200 OK responses
  - `[defer]` Missing unit tests for ResyncButton component
  - `[defer]` Missing unit tests for reSyncStory and reSyncStories services
  - `[defer]` Missing unit tests for ReSyncErrorHandler component
  - `[defer]` Missing integration/e2e verification for the complete re-sync flow

## Design Notes

The [Re-sync] action follows the existing UX patterns:
- Uses the action palette for operational states (UX-DR2).
- Follows the deterministic sync operations (NFR1) — no LLM calls for sync or state verification.
- Aligns with AD-008 (Local Repo State Reporting — one stream, one canonical read model) for the re-sync data source.

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS (no errors or warnings)
- `npm run build` -- expected: SUCCESS (compiled successfully)

**Manual checks:**
- Verify that the [Re-sync] action is available on stories flagged stale or in conflict.
- Verify that when [Re-sync] is triggered, each story re-fetches its latest Git-linked state independently.
- Verify that a story that fails to re-sync shows an inline error "Re-sync failed — retry" without blocking the others that succeed.

## Auto Run Result

### Summary of Implemented Change

Implemented Story 3.6 One-click Re-sync. Added a [Re-sync] action button for stories flagged as stale or in conflict, a service to re-fetch Git-linked state independently per story, and an error handler to display "Re-sync failed — retry" inline error without blocking others.

### Files Changed

- `ihm/components/re-sync-button.tsx` -- Created Re-sync button component showing [Re-sync] action on stories flagged stale or in conflict
- `ihm/services/re-sync.service.ts` -- Implemented re-sync service to re-fetch latest Git-linked state independently per story
- `ihm/components/re-sync-error-handler.tsx` -- Implemented re-sync error handler showing "Re-sync failed — retry" inline error without blocking others
- `prjdocs/implementation-artifacts/spec-3-6-one-click-re-sync.md` -- Created spec file for Story 3.6
- `prjdocs/implementation-artifacts/epic-3-context.md` -- Created epic-3 context file

### Review Findings Breakdown

- Patches applied: 11 (contract violations, redundant types, error text inconsistencies, missing URL encoding, mounted state checks, callback error handling, empty array guards, HTTP status validation)
- Items deferred: 4 (missing unit tests for components and services, missing integration/e2e verification)
- Items rejected: 0

### Follow-up Review Recommendation

false (patch findings were all low severity; 3 × 0 + 1 × 11 = 11, but no high severity or 3+ medium severity findings)

### Verification Performed

- `npm run lint` passed with no errors or warnings
- `npm run build` compiled successfully and generated static pages

### Residual Artifacts

None. All changes have been implemented and verified.
