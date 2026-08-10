---
title: 'Dashboard Overview/Health'
type: 'feature'
created: '2026-08-10'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '787c38f556043061396ad88eaa4e8edbfdec5f0f'
---

<intent-contract>

## Intent

**Problem:** Team members need to see the global Git + BMAD state (branches, PRs, sync status, Local vs Remote) to understand the overall project synchronization state at a glance.

**Approach:** Implement a Dashboard Overview/Health view that shows the current branch state, open PRs with their status, visually distinguishes Local vs Remote context per DESIGN.md, includes a Real-time Status Bar for WebSocket connectivity, handles Hub unreachable state with stale data timestamping, and shows a "No repositories connected yet" message with onboarding link when no repos are connected.

## Boundaries & Constraints

**Always:**
- The dashboard shows the global Git + BMAD state including branches, PRs, sync status, and Local vs Remote context
- Local vs Remote context is visually distinguished per DESIGN.md
- A Real-time Status Bar shows WebSocket connectivity (`{colors.info}` active / `{colors.neutral}` idle)
- If the Hub is unreachable, the bar turns `{colors.error}` ("Hub unreachable — showing last known state") and data stays visible, timestamped as stale
- If no repositories are connected yet, the view shows "No repositories connected yet" with a link to onboarding instead of empty cards

**Block If:**
- None specified in the acceptance criteria

**Never:**
- Do not create a separate "Synchronization Center" screen — this story covers both "Dashboard (Overview/Health)" and the "Synchronization Center" surface as the same screen.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Hub has connected Clients and repository data | Dashboard shows current branch state and open PRs with their status, Local vs Remote context visually distinguished, Real-time Status Bar shows WebSocket connectivity as active | No error expected |
| HUB_UNREACHABLE | Hub is unreachable | Real-time Status Bar turns `{colors.error}` ("Hub unreachable — showing last known state"), data stays visible, timestamped as stale | No error expected |
| NO_REPOS_CONNECTED | No repositories connected yet | View shows "No repositories connected yet" with a link to onboarding instead of empty cards | No error expected |

</intent-contract>

## Code Map

- `frontend/src/components/dashboard/OverviewDashboard.tsx` (or equivalent) -- Main dashboard component showing global Git + BMAD state
- `frontend/src/components/dashboard/RealTimeStatusBar.tsx` (or equivalent) -- Real-time status bar showing WebSocket connectivity
- `frontend/src/components/git/BranchPRStatus.tsx` (or equivalent) -- Component showing current branch state and open PRs with their status
- `frontend/src/styles/design-tokens.ts` (or equivalent) -- Design tokens for Local vs Remote visual distinction per DESIGN.md

## Tasks & Acceptance

**Execution:**
- `ihm/app/components/dashboard/OverviewDashboard.tsx` (or equivalent) -- Create or extend the main dashboard overview component -- to show the global Git + BMAD state including branches, PRs, sync status, and Local vs Remote context
- `ihm/app/components/dashboard/RealTimeStatusBar.tsx` (or equivalent) -- Create or extend the real-time status bar component -- to show WebSocket connectivity status
- `ihm/app/components/git/BranchPRStatus.tsx` (or equivalent) -- Create or extend the branch and PR status component -- to show current branch state and open PRs with their status
- `ihm/__tests__/dashboard-overview.test.tsx` -- Create component tests for the I/O & Edge-Case Matrix scenarios (HAPPY_PATH, HUB_UNREACHABLE, NO_REPOS_CONNECTED) -- to verify expected behavior and edge cases

**Acceptance Criteria:**
- Given the Hub has connected Clients and repository data, when I open the Dashboard, then the current branch state and open PRs are shown with their status
- Given the dashboard is displayed, when I view the dashboard, then Local vs Remote context is visually distinguished per DESIGN.md
- Given the dashboard is displayed, when I view the dashboard, then a Real-time Status Bar shows WebSocket connectivity (`{colors.info}` active / `{colors.neutral}` idle)
- Given the Hub is unreachable, when I view the dashboard, then the bar turns `{colors.error}` ("Hub unreachable — showing last known state") and data stays visible, timestamped as stale
- Given no repositories are connected yet, when I view the dashboard, then the view shows "No repositories connected yet" with a link to onboarding instead of empty cards

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

## Design Notes

DESIGN_RATIONALE_AND_EXAMPLES:
- Local vs Remote visual distinction: Local (muted — neutral/text-secondary) vs Remote (vibrant — info/action with glow) per DESIGN.md
- Real-time Status Bar: indicator of WebSocket connectivity full width, `{colors.info}` active / `{colors.neutral}` idle

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS
- `npm test -- __tests__/dashboard-overview.test.tsx` -- expected: SUCCESS

**Manual checks (if no CLI):**
- Verify dashboard shows current branch state and open PRs with their status
- Verify Local vs Remote context is visually distinguished per DESIGN.md
- Verify Real-time Status Bar shows WebSocket connectivity with correct colors
- Verify Hub unreachable state shows error bar with last known state and timestamp
- Verify no repositories connected state shows onboarding link instead of empty cards
