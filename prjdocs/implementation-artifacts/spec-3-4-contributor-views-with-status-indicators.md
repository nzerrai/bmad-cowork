---
title: 'Contributor Views with Status Indicators'
type: 'feature'
created: '2026-08-10'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '5b81de6ca2115cff1299f4376e28d9deabde7ec3'
---

<intent-contract>

## Intent

**Problem:** Team members and PMs need to see contributor rows with a Status Pill reflecting their state, so that they know who is currently active and what state their work is in.

**Approach:** Implement a contributor grid/table that displays contributor rows with a Status Pill. The Status Pill is computed by a fixed collapse rule based on two independent signals: presence signal (connected/absent) and sync-state signal (Synced/Drift/Conflict/Syncing-Active/Claimed). The rule is: if presence = absent, the Pill always shows Idle-Offline regardless of sync-state; otherwise the Pill shows the sync-state value. Clicking a Status Pill navigates to that contributor's Detail panel.

## Boundaries & Constraints

**Always:**
- Contributors have a presence signal (connected/absent) and a sync-state signal (Synced/Drift/Conflict/Syncing-Active/Claimed), stored and reported as two independent fields
- Each contributor shows a single Status Pill computed by the fixed collapse rule: if presence = absent, the Pill always shows Idle-Offline regardless of sync-state; otherwise the Pill shows the sync-state value
- Clicking a Status Pill navigates to that contributor's Detail panel

**Block If:**
- None specified in the acceptance criteria

**Never:**
- Do not infer one signal from the other (presence and sync-state must remain independent)
- Do not display separate presence and sync-state indicators as two distinct pills — the UI must show a single Status Pill

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH_CONNECTED | Contributor has presence=connected, sync-state=Synced | Status Pill shows "Synced" | No error expected |
| HAPPY_PATH_DRIFT | Contributor has presence=connected, sync-state=Drift | Status Pill shows "Drift" | No error expected |
| HAPPY_PATH_CONFLICT | Contributor has presence=connected, sync-state=Conflict | Status Pill shows "Conflict" | No error expected |
| HAPPY_PATH_SYNCING_ACTIVE | Contributor has presence=connected, sync-state=Syncing-Active | Status Pill shows "Syncing-Active" | No error expected |
| HAPPY_PATH_CLAIMED | Contributor has presence=connected, sync-state=Claimed | Status Pill shows "Claimed" | No error expected |
| ABSENT_IDLE_OFFLINE | Contributor has presence=absent, sync-state=any (Synced/Drift/Conflict/Syncing-Active/Claimed) | Status Pill always shows "Idle-Offline" regardless of sync-state | No error expected |

</intent-contract>

## Code Map

- `frontend/src/components/contributors/ContributorGrid.tsx` (or equivalent) -- Main contributor grid/table component
- `frontend/src/components/contributors/ContributorStatusPill.tsx` (or equivalent) -- Status Pill component with collapse rule logic
- `frontend/src/components/contributors/ContributorRow.tsx` (or equivalent) -- Individual contributor row component

## Tasks & Acceptance

**Execution:**
- `frontend/src/components/contributors/ContributorGrid.tsx` (or equivalent) -- Create or extend the contributor grid/table component -- to display contributor rows with Status Pills
- `frontend/src/components/contributors/ContributorStatusPill.tsx` (or equivalent) -- Create the Status Pill component -- to compute and display the single Status Pill based on the fixed collapse rule
- `frontend/src/components/contributors/ContributorRow.tsx` (or equivalent) -- Create or extend the contributor row component -- to show individual contributor rows with the Status Pill and handle click navigation to Detail panel

**Acceptance Criteria:**
- Given contributors have a presence signal (connected/absent) and a sync-state signal (Synced/Drift/Conflict/Syncing-Active/Claimed), stored and reported as two independent fields, when the contributor grid/table is displayed, then each contributor shows a single Status Pill computed by the fixed collapse rule: if presence = absent, the Pill always shows Idle-Offline regardless of sync-state; otherwise the Pill shows the sync-state value
- And clicking a Status Pill navigates to that contributor's Detail panel

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

## Design Notes

DESIGN_RATIONALE_AND_EXAMPLES:
- Status Pill collapse rule: presence=absent -> "Idle-Offline"; presence=connected -> sync-state value (Synced/Drift/Conflict/Syncing-Active/Claimed)
- Status Pill must be a single pill, never two separate indicators for presence and sync-state

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS

**Manual checks (if no CLI):**
- Verify contributor grid displays contributor rows with Status Pills
- Verify Status Pill shows "Idle-Offline" when presence=absent, regardless of sync-state
- Verify Status Pill shows sync-state value when presence=connected
- Verify clicking a Status Pill navigates to the contributor's Detail panel
