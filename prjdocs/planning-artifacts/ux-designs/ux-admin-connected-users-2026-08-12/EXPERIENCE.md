---
name: "Admin Dashboard - Connected Users and Request Stats"
status: final
sources:
  - "{planning_artifacts}/prds/bmad-portal-hub-2026-08-01/prd.md"
  - "{implementation_artifacts}/epics.md"
updated: 2026-08-12
---

# EXPERIENCE.md - Admin Dashboard - Connected Users and Request Stats

## Foundation
**UI System:** Web-based Command Center (React/Next.js).
**Visual Identity:** References `DESIGN.md` (Modern Command theme, Deep Navy, Layered surfaces, dark-only).
**Platform:** Desktop/laptop only. The Command Center is a continuous-monitoring ops surface, not a mobile workflow — no responsive breakpoints are in scope.
**Access Control:** Admin-only access. This dashboard is restricted to the Admin role. Non-Admin users never see this section in the System Administration page.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Connected Users Dashboard | System Administration page (Admin role only) | Display a table of connected users sorted by repository, with request counts broken down by request type (heartbeat, claim events, sync events, conflict events, etc.). |

## Voice and Tone
**Tone:** Professional, deterministic, and technical.
**Microcopy Style:** "Command & Control" — direct, concise, and action-oriented (e.g., "No connected users found", "Reconnecting…", "Connected Users Dashboard"). Brand voice and aesthetic posture live in `DESIGN.md.Brand & Style`; this section governs words only.

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Connected Users Data Table | Admin Dashboard | High-density table with columns: User Email, User ID, Repository, Heartbeat Count, Claim Events, Sync Events, Conflict Events, Total Requests. Users are sorted by repository. |
| Skeleton Table Rows | Loading state | Placeholder rows shown while data is loading, matching the final table layout. |
| Reconnecting Toast | Backend disconnect | Thin, full-width toast indicator for backend connectivity issues; `{colors.info}` accent when reconnecting. Displayed when backend returns 503/502/504 or connection fails. |

## State Patterns

**Data states:**

| State | Token |
|---|---|
| Loading | Skeleton table rows displayed |
| No Connected Users | "No connected users found" message displayed |
| Backend Unreachable | "Reconnecting…" toast displayed, interactive elements disabled |
| Data Available | Table displayed with connected users sorted by repository |

**UI-lifecycle states per surface:**

| Surface | Empty | Cold-load | Error / Offline | Permission-denied |
|---|---|---|---|---|
| Connected Users Dashboard | "No connected users found" message displayed. | Skeleton table rows matching final layout; resolves as data is fetched. | Reconnecting toast shown; table disabled or shows last known state with stale timestamp. | Section hidden entirely from non-admin users; never shown-then-blocked. |

## Interaction Primitives
- **On-Demand Fetching:** Dashboard data is fetched via a dedicated API endpoint rather than through the WebSocket connection to avoid blocking real-time notifications.
- **Sort by Repository:** Table is sorted by repository column by default; users can click column headers to sort.

## Accessibility Floor
Behavioral. Visual contrast values live in `DESIGN.md`.
- **Visual Contrast:** High-contrast color combinations for all operational status indicators, verified against `DESIGN.md` token pairs at WCAG AA on `{colors.background}` and `{colors.surface}`.
- **Navigation:** Full keyboard accessibility for complex data tables and command menus; `Tab` order follows visual reading order on every surface.
- **Focus:** Every interactive element (table header for sorting) shows a visible focus ring in `{colors.info}` at AA contrast against its resting surface.

## Key Flows

### Flow 1 — Admin Checks Connected Users
1. Admin navigates to the System Administration page.
2. The Connected Users Dashboard section is displayed below the Git/Repos Project Configuration and User & Role Management sections.
3. **Climax:** The table loads and displays connected users sorted by repository, with request counts broken down by type (heartbeat, claim events, sync events, conflict events). The admin can quickly see who is connected and their activity levels.

Failure: the backend is unreachable during fetch → the table shows skeleton rows, then a "Reconnecting…" toast is displayed and interactive elements are disabled.

### Flow 2 — Admin Views Request Statistics
1. Admin reviews the request count columns (Heartbeat Count, Claim Events, Sync Events, Conflict Events, Total Requests).
2. The numeric values are displayed using tabular numerals (JetBrains Mono) to ensure proper column alignment.
3. **Climax:** The admin can quickly identify users with unusual activity patterns or high request volumes by scanning the aligned numeric columns.

Failure: no connected users are found → the table displays a "No connected users found" message instead of data rows.
