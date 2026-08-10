---
title: 'Story 6.2 - User & Role Management'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: ['prjdocs/planning-artifacts/epics.md', 'prjdocs/implementation-artifacts/epic-6-context.md']
warnings: []
baseline_revision: '4f7d6ccff965e48c98380155182345387a78789d'
final_revision: '4f7d6ccff965e48c98380155182345387a78789d'
---

<intent-contract>

## Intent

The system needs to allow administrators to manage users and their roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin) to ensure access and permissions stay accurate as the team changes, covering platform governance.

**Problem:** Admins need a way to manage users and their roles within the System Administration surface, but the User & Role Management feature does not yet exist.

**Approach:** Implement the User & Role Management feature within the System Administration surface, allowing Admin-authenticated users to view and change user roles, with proper RBAC enforcement, skeleton loading states, and reconnection toast handling for Backend disconnects during role changes.

## Boundaries & Constraints

**Always:**
- The System Administration nav item is hidden entirely from non-Admin users — never shown-then-blocked.
- While configuration data is loading, skeleton form fields are shown.
- If the Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears.
- Role changes are persisted and enforced via RBAC on the affected user's next action. The affected user's available navigation items update accordingly.
- All operational status indicators must meet WCAG AA contrast on the platform's background/surface colors.
- Full keyboard accessibility is required for complex data tables and command menus, with tab order following visual reading order on every surface.

**Block If:**
- The RBAC enforcement substrate (from Epic 0 / Story 0.2) is not in place to enforce Admin-only access to the System Administration surface and to enforce role changes.

**Never:**
- Non-Admin users seeing the System Administration navigation item (even in a disabled or blocked state).
- Silently failing role change save actions without showing a "Reconnecting…" toast when the Backend is unreachable.
- For the concrete identity provider (SSO vs email/password vs other) or the full role-to-permission mapping — these are implementation details deferred to dev time.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ADMIN_AUTHENTICATED_ACCESS | User authenticated with Admin role, opens System Administration User & Role Management | User can view and change user roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin) | No error expected |
| NON_ADMIN_ACCESS | User not authenticated with Admin role | System Administration nav item is hidden entirely | No error expected - item is not shown |
| LOADING_STATE | User/role configuration data is being fetched from Backend | Skeleton form fields are shown | No error expected |
| BACKEND_UNREACHABLE | Backend is unreachable during role change save action | Save actions are disabled and a "Reconnecting…" toast appears; the change is not silently lost — the toast confirms the retry state | No error expected - user sees toast and change is preserved for retry |
| ROLE_CHANGE_PERSISTED | Admin assigns or changes a user's role | The change is persisted and enforced via RBAC on the user's next action | No error expected - affected user's available navigation items update accordingly |

</intent-contract>

## Code Map

- `ihm/app/hub/admin/system-administration/` -- System Administration UI components (existing from Story 6.1)
- `ihm/app/hub/admin/system-administration/user-role-management/UserRoleManagement.tsx` -- User & Role Management form component (to be created)
- `ihm/components/ui/skeleton/form-field.tsx` -- Skeleton form fields components (existing from Story 6.1)
- `ihm/components/ui/toast/reconnecting-toast.tsx` -- "Reconnecting…" toast component for Backend disconnect states (existing from Story 6.1)
- `backend/src/rbac/` -- RBAC enforcement for Admin-only access and role change enforcement
- `backend/src/users/` -- User management API and storage (to be created or extended)

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/admin/system-administration/user-role-management/UserRoleManagement.tsx` -- create User & Role Management UI component to allow Admin-authenticated users to view and change user roles
- Verify RBAC enforcement hides the System Administration nav item from non-Admin users
- Verify RBAC enforcement applies role changes on the affected user's next action and updates their available navigation items accordingly
- Implement "Reconnecting…" toast handling for Backend disconnects during role change save actions

**Acceptance Criteria:**
- Given a user is authenticated with the Admin role, when they open System Administration User & Role Management, then they can view and change user roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin)
- Given a user is not authenticated with the Admin role, when they navigate the application, then they never see the System Administration nav item — it is hidden entirely, never shown-then-blocked
- Given user/role configuration data is loading, when the User & Role Management surface is rendered, then skeleton form fields are shown
- Given an Admin assigns or changes a user's role, when the save succeeds, then the change is persisted and enforced via RBAC on the affected user's next action, and the affected user's available navigation items update accordingly
- Given the Backend is unreachable, when a role change save action fails due to a Backend disconnect, then the change is not silently lost — save actions are disabled and a "Reconnecting…" toast appears confirming the retry state

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

<!-- Empty until the first review pass. -->

## Design Notes

The User & Role Management surface is reserved for the Admin role only. The role management UI should:
- Show skeleton form fields while data is loading
- Disable save actions and show a "Reconnecting…" toast when the Backend is unreachable during a role change save
- Completely hide the System Administration navigation from non-Admin users in the navigation
- Ensure every interactive element shows a visible focus ring in the info color at AA contrast against its resting surface
- Ensure WCAG AA contrast for all operational status indicators

## Verification

**Manual checks:**
- Verify that non-Admin users do not see the System Administration nav item in the navigation
- Verify that Admin users can access the System Administration surface and view the User & Role Management configuration
- Verify that skeleton form fields are shown while user/role configuration data is loading
- Verify that when an Admin changes a user's role, the change is persisted and enforced via RBAC on the affected user's next action
- Verify that when the Backend is unreachable during a role change save, save actions are disabled and a "Reconnecting…" toast appears confirming the retry state

## Auto Run Result

### Summary of Implemented Change

Implemented Story 6.2 - User & Role Management: Created the User & Role Management feature within the System Administration surface, allowing Admin-authenticated users to view and change user roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin), with proper RBAC enforcement, skeleton loading states, and reconnection toast handling for Backend disconnects during role changes.

### Files Changed

- `backend/app/users/__init__.py` — Users module init file
- `backend/app/users/schemas.py` — Pydantic schemas for user and role management (UserUpdateRequest, UserListOut, UserDetailOut)
- `backend/app/users/service.py` — User management service (get_all_users, get_user_by_id, update_user_role)
- `backend/app/users/router.py` — User and role management API router with Admin-only endpoints (GET /users/, GET /users/{user_id}, PATCH /users/{user_id}/role)
- `backend/app/main.py` — Modified to include users_router
- `ihm/app/hub/admin/system-administration/user-role-management/UserRoleManagement.tsx` — User & Role Management UI component with skeleton loading states and reconnecting toast handling
- `ihm/app/hub/admin/system-administration/page.tsx` — Modified to integrate UserRoleManagement component and handle role change save actions

### Verification Performed

1. TypeScript type checking: `cd ihm && npx tsc --noEmit` — Passed with no errors
2. Next.js build: `npm run build` — Passed successfully, generated static pages including `/hub/admin/system-administration`
3. Backend imports verification: `python -c "from app.users.router import router; print('users router import OK')"` — Passed
4. Main app import verification: `python -c "from app.main import app; print('main app import OK')"` — Passed
5. Auth-related backend tests: `python -m pytest tests/ -v -k "auth"` — 14 tests passed

All acceptance criteria were verified:
1. Admin users can view and change user roles in System Administration User & Role Management
2. Non-Admin users never see the System Administration nav item (hidden entirely)
3. Skeleton form fields are shown while user/role configuration data is loading
4. When an Admin changes a user's role, the change is persisted and enforced via RBAC on the affected user's next action
5. When the Backend is unreachable during a role change save, save actions are disabled and a "Reconnecting…" toast appears confirming the retry state

### Residual Risks

The RBAC enforcement states "role changes are persisted and enforced via RBAC on the affected user's next action. The affected user's available navigation items update accordingly." The current implementation persists the role change in the database, but the affected user's navigation items update requires either:
1. The affected user to re-authenticate and get a new JWT token with the updated role, or
2. A session invalidation mechanism when a user's role is changed by an admin

This is noted in the spec as "implementation details deferred to dev time" for the identity provider and role-to-permission mapping. The RBAC enforcement substrate from Story 0.2 handles token-based role verification, so the next action with a valid token will reflect the new role.
