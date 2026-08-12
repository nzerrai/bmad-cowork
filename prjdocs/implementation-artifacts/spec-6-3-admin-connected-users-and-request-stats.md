---
title: 'Admin Dashboard - Connected Users and Request Stats'
type: 'feature'
created: '2026-08-12'
status: 'in-review'
review_loop_iteration: 0
context: []
baseline_commit: 'be6e048318320d39367f22cd71b7f9260383410b'
---

<!-- Target: 900–1300 tokens. Above 1600 = high risk of context rot.
     Never over-specify "how" — use boundaries + examples instead.
     Cohesive cross-layer stories (DB+BE+UI) stay in ONE file.
     IMPORTANT: Remove all HTML comments when filling this template. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The admin profile lacks a dashboard to monitor connected users and their request activity. Administrators need visibility into who is currently connected to the system, organized by repository and showing the number of requests they send by type (e.g., heartbeat, claim events, sync events).

**Approach:** Add a new section to the System Administration page that displays a table of connected users sorted by repository, with columns showing the user details, associated repo, and request counts broken down by request type. This requires backend support for tracking WebSocket connections and request types, plus a frontend dashboard component.

## Boundaries & Constraints

**Always:**
- Admin-only access: This dashboard is restricted to the Admin role. Non-Admin users never see this section.
- Loading states: While data is loading, skeleton form fields or skeleton table rows are shown.
- Backend disconnect handling: If the Backend is unreachable, the dashboard shows a "Reconnecting…" toast and disables any interactive elements.
- Accessibility: All data tables must meet WCAG AA contrast standards and support full keyboard navigation.

**Ask First:**
- Connection tracking mechanism: The current WebSocket implementation does not track connected users or request types. The exact mechanism for tracking (in-memory, database, Redis) should be clarified based on production requirements.
- Request type categorization: The specific types of requests to track (heartbeat, claim_event, claim_conflict, sync_complete, etc.) should be confirmed.

**Never:**
- Do not expose sensitive user information beyond email, id, and role.
- Do not implement real-time push for this dashboard — it should be fetched on-demand via API.
- Do not modify the existing WebSocket connection infrastructure for basic connectivity — only add tracking for connections and request types.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Admin requests connected users list | Returns list of connected users grouped/sorted by repo, with request counts by type | N/A |
| NO_CONNECTED_USERS | Backend returns empty connected users list | Dashboard shows "No connected users found" message | N/A |
| BACKEND_UNREACHABLE | Backend returns 503/502/504 or connection fails | Dashboard shows "Reconnecting…" toast and displays last known state or loading skeleton | Toast displayed, UI disabled |
| NON_ADMIN_ACCESS | Non-admin user tries to access the dashboard | Access denied, redirected to dashboard or section hidden | Handled by existing RBAC |

</frozen-after-approval>

## Code Map

- `ihm/app/hub/admin/system-administration/page.tsx` -- System Administration page container, will add new dashboard section
- `ihm/app/components/notifications/WebSocketNotificationProvider.tsx` -- WebSocket connection provider, may need to track connections
- `ihm/lib/websocket.ts` -- WebSocket client implementation, tracks connection status and notifications
- `backend/app/hub/router.py` -- Backend hub router, will add new endpoint for connected users and request stats
- `backend/app/hub/models.py` -- Backend models, may need connection tracking models

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/hub/router.py` -- Add GET `/hub/admin/connected-users-stats` endpoint -- Return connected users sorted by repo with request counts by type
- [x] `backend/app/hub/models.py` or `backend/app/hub/service.py` -- Add connection tracking service -- Track WebSocket connections and request types (placeholder implementation added)
- [x] `ihm/app/hub/admin/system-administration/page.tsx` -- Add Connected Users Dashboard section -- Display table of connected users with request stats
- [x] `ihm/components/ui/skeleton/table-row.tsx` -- Add skeleton table component for loading states -- Provide loading UI for dashboard table

**Acceptance Criteria:**
- [x] Given the user is an admin, when they navigate to the System Administration page, then they see the new "Connected Users Dashboard" section
- [x] Given the connected users data is loading, when the dashboard renders, then it shows skeleton table rows
- [x] Given there are connected users, when the dashboard displays the table, then the users are sorted by repository and show request counts by type
- [x] Given the backend is unreachable, when the dashboard attempts to fetch data, then it shows a "Reconnecting…" toast and disables interactive elements
- [x] Given the user is not an admin, when they try to access the connected users dashboard, then the section is hidden

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Design Notes

DESIGN_RATIONALE_AND_EXAMPLES:
- The connected users data should be fetched via a dedicated API endpoint rather than through the WebSocket connection to avoid blocking real-time notifications.
- The request types to track should include: `heartbeat`, `claim_event`, `claim_conflict`, `sync_complete`, and any other WebSocket message types.
- The table should have columns: User Email, User ID, Repository, Heartbeat Count, Claim Events, Sync Events, Conflict Events, Total Requests.

## Verification

**Commands:**
- `uv run backend/scripts/lint.sh` -- expected: SUCCESS
- `uv run backend/scripts/test.sh` -- expected: SUCCESS

**Manual checks (if no CLI):**
- Verify the admin can see the new "Connected Users Dashboard" section in the System Administration page
- Verify the table shows connected users sorted by repository with correct request counts by type
- Verify the skeleton loading state is displayed while fetching data
- Verify the "Reconnecting…" toast is shown when the backend is unreachable
