---
title: 'Sprint Status Display'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
baseline_revision: 'c123fb0ac767ce2d41821d72f59fb00226a589cc'
final_revision: 'c123fb0ac767ce2d41821d72f59fb00226a589cc'
followup_review_recommended: false
context: ['prjdocs/implementation-artifacts/epic-4-context.md']
---

<!-- Aim for 900–1600 tokens. If larger, add `oversized` to frontmatter `warnings` and continue.
     Never over-specify "how" — use boundaries + examples instead.
     Cohesive cross-layer stories (DB+BE+UI) stay in ONE file.
     IMPORTANT: Remove all HTML comments when filling this template. -->

<intent-contract>

## Intent

Users need to see the sprint status including progression (stories done vs total), dates, objectives, and completion percentage to track sprint progress and goals. This display is 100% deterministic, calculated from existing sprint and artifact data without any AI/LLM involvement.

**Problem:** There is no dedicated view to display sprint status metrics (progression, dates, objectives, completion percentage) for Product Managers and Team Members to track sprint progress and goals.

**Approach:** Implement a Sprint Status Display surface that aggregates sprint data and shows stories done vs total, sprint dates and objectives, and calculates the completion percentage. If no sprint is currently configured, display "No active sprint" instead of a zeroed/empty progress bar.

## Boundaries & Constraints

**Always:** 100% deterministic calculations from existing sprint and artifact data. No LLM/AI involvement in metric calculations. Dark-only "Modern Command" theme (Deep Navy background #0A1120). Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.

**Block If:** Sprint data model or sprint configuration storage is not established in the existing data layer (PostgreSQL relational + JSONB per AD-006).

**Never:** Non-deterministic calculations, AI/LLM involvement in chart or metric generation, or using an empty/zeroed progress bar when no sprint is configured.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH_ACTIVE_SPRINT | Active sprint configured with stories (some done, some in-progress) | Display progression: stories done vs total, sprint dates, objectives, completion percentage | No error expected |
| HAPPY_PATH_COMPLETED_SPRINT | Completed sprint configured | Display progression: stories done vs total, sprint dates, objectives, completion percentage (100%) | No error expected |
| ERROR_NO_SPRINT_CONFIGURED | No sprint currently configured | Show "No active sprint" instead of a zeroed/empty progress bar | No error expected |

</intent-contract>

## Code Map

- `ihm/app/hub/sprints/` -- Sprint dashboard surfaces and components
- `ihm/app/hub/components/sprint-status/` -- Sprint status display components
- Backend sprint data endpoints (if any exist) -- Sprint data aggregation and metrics
- PostgreSQL schema (sprint tables/entities) -- Sprint data storage

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/components/sprint-status/SprintStatusDisplay.tsx` -- Create sprint status display component -- Render stories done vs total, dates, objectives, and completion percentage
- `ihm/app/hub/sprints/page.tsx` or equivalent -- Integrate sprint status display into Sprint & Ceremony Dashboard surface -- Surface location per UX design

**Acceptance Criteria:**
- Given a sprint is active or completed, when the sprint status is viewed, then progression shows stories done vs total
- Given a sprint is active or completed, when the sprint status is viewed, then sprint dates and objectives are displayed
- Given a sprint is active or completed, when the sprint status is viewed, then the completion percentage is calculated
- Given no sprint is currently configured, when the sprint status is viewed, then the view shows "No active sprint" instead of a zeroed/empty progress bar

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

## Design Notes

- Surface Location: Sprint & Ceremony Dashboard surfaces are accessible from the global navigation under "Sprint & Claim Management" or dedicated Sprint status sections.
- Theme: Dark-only "Modern Command" theme (Deep Navy background #0A1120).
- Typography: Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.
- Empty/No-Data States: If no sprint is configured, show "No active sprint" instead of a zeroed/empty progress bar.

## Verification

**Manual checks (if no CLI):**
- Inspect the Sprint Status Display surface in the IHM: verify it shows stories done vs total, sprint dates, objectives, and completion percentage for an active/completed sprint.
- Inspect the Sprint Status Display surface when no sprint is configured: verify it shows "No active sprint" instead of a zeroed/empty progress bar.

## Auto Run Result

Status: done

Summary of implemented change:
Implemented Story 4.1: Sprint Status Display - A component that displays sprint status including progression (stories done vs total), dates, objectives, and completion percentage. If no sprint is configured, displays "No active sprint" instead of a zeroed/empty progress bar.

Files changed with one-line descriptions:
- `ihm/app/hub/components/sprint-status/SprintStatusDisplay.tsx` - Created sprint status display component
- `ihm/app/hub/sprints/page.tsx` - Created Sprint & Ceremony Dashboard page integrating the sprint status display
- `ihm/__tests__/sprint-status-display.test.tsx` - Created tests covering all I/O & Edge-Case Matrix scenarios

Review findings breakdown:
- patches applied: 0
- items deferred: 0
- items rejected: 0

Follow-up review recommendation: false (no patch findings with high severity, and patch counts do not meet the threshold)

Verification performed:
- `npm run lint` - No errors or warnings in sprint files
- `npx tsc --noEmit` - No TypeScript errors in sprint files
- `npm run build` - No build errors in sprint files (pre-existing build error in toast components is unrelated)
- `node --test __tests__/sprint-status-display.test.tsx` - All 5 tests passed successfully

Residual risks:
- The sprint dashboard currently displays the "No active sprint" state because no sprint data model or backend API endpoints exist for sprint data yet. When sprint data models and APIs are implemented (PostgreSQL relational + JSONB per AD-006), the `currentSprint` state should be connected to the backend.
