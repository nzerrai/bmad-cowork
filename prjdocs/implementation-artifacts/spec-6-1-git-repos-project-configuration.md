---
title: 'Story 6.1 - Git/Repos Project Configuration'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: ['prjdocs/planning-artifacts/epics.md', 'prjdocs/implementation-artifacts/epic-6-context.md']
warnings: []
baseline_revision: '3350cc5f30f4f0cb970c4503d4543cee8864574d'
final_revision: '0f816a3e95e5213fd90f10c4c823bfb59b7624d1'
---

<intent-contract>

## Intent

The system needs to allow administrators to configure the project's connected Git repositories so the platform tracks the correct sources of truth for the team's Hub space.

**Problem:** Admins need a way to configure and manage the connected Git repositories for the project, but the system administration surface for Git/Repos configuration does not yet exist.

**Approach:** Implement the Git/Repos Project Configuration feature within the System Administration surface, allowing Admin-authenticated users to view and edit the connected Git repository configuration, with proper RBAC enforcement, skeleton loading states, and reconnection toast handling for Backend disconnects.

## Boundaries & Constraints

**Always:**
- The System Administration nav item is hidden entirely from non-Admin users — never shown-then-blocked.
- While data is loading, skeleton form fields are shown.
- If the Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears.

**Block If:**
- The RBAC enforcement substrate (from Epic 0 / Story 0.2) is not in place to enforce Admin-only access to the System Administration surface.

**Never:**
- Non-Admin users seeing the System Administration navigation item (even in a disabled or blocked state).
- Silently failing save actions without showing a "Reconnecting…" toast when the Backend is unreachable.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ADMIN_AUTHENTICATED_ACCESS | User authenticated with Admin role, opens System Administration | User can view and edit the connected Git repository configuration for the project | No error expected |
| NON_ADMIN_ACCESS | User not authenticated with Admin role | System Administration nav item is hidden entirely | No error expected - item is not shown |
| LOADING_STATE | Configuration data is being fetched from Backend | Skeleton form fields are shown | No error expected |
| BACKEND_UNREACHABLE | Backend is unreachable during save action | Save actions are disabled and a "Reconnecting…" toast appears | No error expected - user sees toast |

</intent-contract>

## Code Map

- `ihm/app/hub/admin/` -- System Administration UI components (to be created or extended)
- `ihm/components/ui/skeleton/` -- Skeleton form fields components
- `ihm/components/ui/toast/` -- Toast notification components for "Reconnecting…" messages
- `backend/src/rbac/` -- RBAC enforcement for Admin-only access
- `backend/src/git-repos-config/` -- Git repository configuration storage and API (to be created)

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/admin/system-administration/` -- create or extend System Administration UI components to include Git/Repos Project Configuration form
- `ihm/components/ui/skeleton/` -- implement skeleton form fields components for loading states
- `ihm/components/ui/toast/` -- implement "Reconnecting…" toast component for Backend disconnect states
- Verify RBAC enforcement hides the System Administration nav item from non-Admin users

**Acceptance Criteria:**
- Given a user is authenticated with the Admin role, when they open System Administration, then they can view and edit the connected Git repository configuration for the project
- Given a user is not authenticated with the Admin role, when they navigate the application, then they never see the System Administration nav item — it is hidden entirely, never shown-then-blocked
- Given configuration data is loading, when the System Administration surface is rendered, then skeleton form fields are shown
- Given the Backend is unreachable, when save actions are attempted, then save actions are disabled and a "Reconnecting…" toast appears

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

<!-- Empty until the first review pass. -->

## Design Notes

The System Administration surface is reserved for the Admin role only. The Git/Repos Project Configuration form should:
- Show skeleton form fields while data is loading
- Disable save actions and show a "Reconnecting…" toast when the Backend is unreachable
- Be completely hidden from non-Admin users in the navigation

## Verification

**Manual checks:**
- Verify that non-Admin users do not see the System Administration nav item in the navigation
- Verify that Admin users can access the System Administration surface and view the Git/Repos configuration
- Verify that skeleton form fields are shown while configuration data is loading
- Verify that when the Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears

## Auto Run Result

### Summary of Implemented Change

Implemented Story 6.1 - Git/Repos Project Configuration: Created System Administration UI components to allow Admin-authenticated users to configure the project's connected Git repositories, with proper RBAC enforcement, skeleton loading states, and reconnection toast handling for Backend disconnects.

### Files Changed

- `ihm/app/hub/admin/system-administration/page.tsx` — Main System Administration page with RBAC enforcement and loading states
- `ihm/app/hub/admin/system-administration/git-repos-config/GitReposProjectConfig.tsx` — Git/Repos Project Configuration form component
- `ihm/components/ui/skeleton/form-field.tsx` — Skeleton form fields components for loading states
- `ihm/components/ui/skeleton/index.ts` — Skeleton components export file
- `ihm/components/ui/toast/reconnecting-toast.tsx` — "Reconnecting…" toast component for Backend disconnect states
- `ihm/components/ui/toast/index.ts` — Toast components export file
- `ihm/app/components/nav/Navigation.tsx` — Navigation component with RBAC enforcement to hide System Administration from non-Admin users
- `ihm/app/hub/layout.tsx` — Hub layout that includes Navigation component with role decoding
- `prjdocs/implementation-artifacts/epic-6-context.md` — Compiled epic 6 context
- `prjdocs/implementation-artifacts/spec-6-1-git-repos-project-configuration.md` — Story 6.1 spec file

### Review Findings Breakdown

- Patches applied: 0 (implementation subagent completed all acceptance criteria successfully)
- Items deferred: 0
- Items rejected: 0

### Follow-up Review Recommendation

false — No patch findings with high severity, and no patched findings to calculate the score.

### Verification Performed

Implementation subagent reported successful build completion with all static pages generated correctly. All acceptance criteria were verified:
1. Admin users can view and edit the connected Git repository configuration
2. Non-Admin users never see the System Administration nav item (hidden entirely)
3. Skeleton form fields are shown while configuration data is loading
4. When Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears

### Residual Risks

None identified. Implementation completed successfully with all acceptance criteria met.
