# Epic 6 Context: System Administration

## Goal

Provide an Admin-gated surface where administrators can configure Git repositories for the project, manage users and roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin), and oversee platform governance.

## Stories

- **Story 6.1: Git/Repos Project Configuration** — Admin configures the project's connected Git repositories so the platform tracks the correct sources of truth for the team's Hub space.
- **Story 6.2: User & Role Management** — Admin manages users and their roles to ensure access and permissions stay accurate as the team changes, covering platform governance.

## Requirements & Constraints

- **Admin-only access**: System Administration is restricted to the Admin role. Non-Admin users never see the System Administration navigation item — it is hidden entirely, never shown-then-blocked.
- **Loading states**: While configuration data is loading, skeleton form fields are shown.
- **Backend disconnect handling**: If the Backend is unreachable, save actions are disabled and a "Reconnecting…" toast appears. For role changes, if a save fails due to a Backend disconnect, the change is not silently lost — the toast confirms the retry state.
- **RBAC enforcement**: Role changes are persisted and enforced via RBAC on the affected user's next action. The affected user's available navigation items update accordingly.
- **Accessibility**: All operational status indicators must meet WCAG AA contrast on the platform's background/surface colors. Full keyboard accessibility is required for complex data tables and command menus, with tab order following visual reading order on every surface.

## Technical Decisions

- **RBAC enforcement substrate**: Role-gated surfaces and actions are backed by Backend-owned RBAC enforcement — a session with the user's role attached to every request, and protected routes that reject unauthenticated calls outright.
- **Identity provider and role matrix deferred**: The concrete identity provider (SSO vs email/password vs other) and the full role-to-permission mapping are implementation details deferred to dev time. The enforcement substrate exists so role-gated acceptance criteria have a real foundation to build on.

## UX & Interaction Patterns

- **Admin-only navigation**: The System Administration nav item is hidden entirely from non-Admin users. It is never displayed and then blocked or disabled.
- **Skeleton forms**: Configuration surfaces show skeleton form fields while data is loading.
- **Reconnection toasts**: When the Backend is unreachable during a save action, save controls are disabled and a "Reconnecting…" toast is shown to the user.
- **High-contrast indicators**: Visual contrast values are verified against the platform's background and surface color tokens at WCAG AA for all operational status indicators.
- **Focus visibility**: Every interactive element shows a visible focus ring in the info color at AA contrast against its resting surface.

## Cross-Story Dependencies

- **Epic 0 / Story 0.2 (Authentication & RBAC Foundation)**: Provides the RBAC enforcement substrate (session + role attached to every request, protected routes rejecting unauthenticated calls) that Epic 6 depends on for role-gated navigation visibility and action enforcement.
