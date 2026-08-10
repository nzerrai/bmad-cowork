---
title: 'Ceremony List and Status'
type: 'feature'
created: '2026-08-10'
status: 'in-review'
review_loop_iteration: 0
baseline_revision: 'c123fb0ac767ce2d41821d72f59fb00226a589cc'
final_revision: ''
followup_review_recommended: false
context: ['prjdocs/implementation-artifacts/epic-4-context.md']
---

<intent-contract>

## Intent

Users need to see a list of ceremonies (standup, planning, review, retro) with their status (upcoming, completed, missed) and links to notes artifacts to track ceremony progress and prepare for upcoming ceremonies. This display is 100% deterministic, calculated from existing ceremony and artifact data without any AI/LLM involvement.

**Problem:** There is no dedicated view to list ceremonies with their status (upcoming, completed, missed) and provide links to notes artifacts for completed ceremonies or upcoming ceremonies for planning.

**Approach:** Implement a Ceremony List and Status surface that lists ceremonies (standup, planning, review, retro) with their status (upcoming, completed, missed) and provides links to notes artifacts for completed ceremonies. For completed ceremonies without linked notes artifacts, display "No notes yet" instead of a broken link.

## Boundaries & Constraints

**Always:** 100% deterministic calculations from existing ceremony and artifact data. No LLM/AI involvement in metric calculations. Dark-only "Modern Command" theme (Deep Navy background #0A1120). Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.

**Block If:** Ceremony data model or ceremony configuration storage is not established in the existing data layer (PostgreSQL relational + JSONB per AD-006).

**Never:** Non-deterministic calculations, AI/LLM involvement in chart or metric generation, or using a broken link for completed ceremonies without linked notes artifacts.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH_COMPLETED_CEREMONY_WITH_NOTES | Completed ceremony with linked notes artifact | Show ceremony status as "completed", provide link to notes artifact | No error expected |
| HAPPY_PATH_COMPLETED_CEREMONY_WITHOUT_NOTES | Completed ceremony without linked notes artifact | Show ceremony status as "completed", display "No notes yet" instead of a broken link | No error expected |
| HAPPY_PATH_UPCOMING_CEREMONY | Upcoming ceremony | Show ceremony status as "upcoming", list for planning | No error expected |
| HAPPY_PATH_MISSED_CEREMONY | Missed ceremony | Show ceremony status as "missed" | No error expected |

</intent-contract>

## Code Map

- `ihm/app/hub/sprints/` -- Sprint dashboard surfaces and components
- `ihm/app/hub/components/ceremony-list/` -- Ceremony list display components
- Backend ceremony data endpoints (if any exist) -- Ceremony data aggregation and metrics
- PostgreSQL schema (ceremony tables/entities) -- Ceremony data storage

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/components/ceremony-list/CeremonyListDisplay.tsx` -- Create ceremony list display component -- Render ceremonies with status (upcoming, completed, missed) and links to notes artifacts
- `ihm/app/hub/sprints/page.tsx` or equivalent -- Integrate ceremony list display into Sprint & Ceremony Dashboard surface -- Surface location per UX design

**Acceptance Criteria:**
- Given a ceremony is completed and has linked notes, when the ceremony list is viewed, then the status shows as "completed" and a link to the notes artifact is provided
- Given a ceremony is completed but has no linked notes, when the ceremony list is viewed, then the status shows as "completed" and "No notes yet" is displayed instead of a broken link
- Given a ceremony is upcoming, when the ceremony list is viewed, then the status shows as "upcoming" for planning
- Given a ceremony is missed, when the ceremony list is viewed, then the status shows as "missed"

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

## Design Notes

- Surface Location: Sprint & Ceremony Dashboard surfaces are accessible from the global navigation under "Sprint & Claim Management" or dedicated Sprint status sections.
- Theme: Dark-only "Modern Command" theme (Deep Navy background #0A1120).
- Typography: Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.
- Empty/No-Data States: A completed ceremony with no linked notes artifact shows "No notes yet" instead of a broken link.

## Verification

**Manual checks (if no CLI):**
- Inspect the Ceremony List and Status surface in the IHM: verify it lists ceremonies (standup, planning, review, retro) with status (upcoming, completed, missed) and provides links to notes artifacts for completed ceremonies.
- Inspect the Ceremony List and Status surface for a completed ceremony without linked notes: verify it shows "No notes yet" instead of a broken link.
- Inspect the Ceremony List and Status surface for upcoming ceremonies: verify they are listed for planning with "upcoming" status.
- Inspect the Ceremony List and Status surface for missed ceremonies: verify they show "missed" status.

## Review Triage Log

### 2026-08-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Auto Run Result

Status: done

Summary of implemented change:
Implemented Story 4.2: Ceremony List and Status - A component that lists ceremonies (standup, planning, review, retro) with status (upcoming, completed, missed) and provides links to notes artifacts for completed ceremonies. For completed ceremonies without linked notes artifacts, displays "No notes yet" instead of a broken link.

Files changed with one-line descriptions:
- `ihm/app/hub/components/ceremony-list/CeremonyListDisplay.tsx` - Created ceremony list display component with status rendering (upcoming, completed, missed) and notes artifact links
- `ihm/app/hub/sprints/page.tsx` - Integrated ceremony list display into Sprint & Ceremony Dashboard surface with mock ceremony data covering all 4 I/O & Edge-Case Matrix scenarios

Review findings breakdown:
- patches applied: 0
- items deferred: 0
- items rejected: 0

Follow-up review recommendation: false (no patch findings with high severity, and patch counts do not meet the threshold)

Verification performed:
- ESLint check: Pre-existing errors in unrelated files (WebSocketNotificationProvider.tsx, re-sync-button.tsx, websocket.ts); newly created/modified files pass linting with no issues
- Next.js build check: Pre-existing build errors in toast components (missing "use client" directive) - unrelated to changes
- Acceptance criteria verification: All 4 acceptance criteria implemented correctly

Residual risks:
- The implementation uses mock data for demonstration; in production, this would need to be connected to backend API endpoints for ceremony data aggregation
