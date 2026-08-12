# Epic 6 Context: System Administration

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

An Admin configures the project's connected Git repositories, manages users and their roles, and oversees platform governance. This is the only role-gated surface in the MVP: it exists so that project configuration and access control stay accurate and auditable as the team and its connected repos change, without exposing any of this control surface to non-Admin users.

## Stories

- Story 6.1: Git/Repos Project Configuration
- Story 6.2: User & Role Management

## Requirements & Constraints

- The System Administration surface is Admin-role only. Non-Admin users never see the nav item — it is hidden entirely, never shown-then-blocked.
- Role changes must be persisted and enforced via RBAC on the affected user's very next action; the user's available navigation updates accordingly once their role changes.
- Lifecycle states for this surface: Empty state is not applicable (an Admin always has configuration to view). Cold-load shows skeleton form fields. Error/Offline disables save actions and shows a "Reconnecting…" toast (not a silent failure or lost change) rather than blocking navigation. Permission-denied is handled by hiding the nav entirely rather than a blocked screen.
- Available roles across the platform: Developer, PM, Architect/Tech Lead, UX Designer, Admin.
- WCAG AA contrast is required for all operational status indicators; full keyboard accessibility and reading-order tab order are required for complex data tables (this surface's repo config and user/role lists qualify).

## Technical Decisions

- Identity/Auth and RBAC enforcement are Backend-owned (session + role attached to every request; protected routes reject unauthenticated calls). This substrate is built in Epic 0 / Story 0.2 as a prerequisite — Epic 6 consumes it rather than building it. The concrete identity provider (SSO vs. email/password vs. other) and the full role→permission mapping are implementation-level decisions, not fixed by planning docs — resolve them consistent with the existing contract (non-Admin roles get System Administration fully hidden from nav; every gated action is RBAC-checked before it's offered as a next action).
- MVP persistence is PostgreSQL: relational tables + JSONB for metadata (Users, Roles, Leases, Spaces, Contributors, etc.). No `pgvector`/vector store for this epic.
- Every critical state transition — including role changes and Git/repo config changes — must be logged to `.memlog.md` for a human-readable, verifiable audit history (platform-wide auditability convention, applies here for governance).
- A space's technical identity is the full remote Git path (`host/org/repo`), never the short display name; short name plus an org badge/tooltip is display-only and only shown on a short-name collision. Relevant when Git/Repos configuration touches or displays connected repository identity — do not introduce a second identity scheme here.
- Space/repo status values already defined elsewhere in the platform: `pending | active | access_revoked`, with `access_revoked` transitioning back to `pending` (never directly to `active`) on regained access. Git/Repos configuration should be consistent with this status model rather than inventing a parallel one.

## UX & Interaction Patterns

- Visual system: dark-only "Modern Command" theme; Inter for UI/headings, JetBrains Mono for data (hashes, paths, branch names); tabular figures for column alignment.
- Data-heavy Tables component pattern applies to repo configuration and user/role lists: high-density rows, inline actions, colored status cells; the same label/value pairing rules apply to any non-tabular panel layout used here.
- Status/toast conventions: a single color has a single meaning platform-wide, never reused for something else. The "Reconnecting…" toast pattern (used on Backend disconnect) is the standard non-intrusive WebSocket-toast notification style — apply it here for save-failure/retry states rather than inventing a new pattern.
- Desktop/laptop only — no responsive breakpoints needed.
- Focus ring and keyboard navigation: visible focus ring in AA contrast on every interactive element; tab order must follow visual reading order.
- No dedicated mockup exists yet for the System Administration surface in the planning UX artifacts — component and lifecycle-state patterns above are the only specified guidance; layout is otherwise open to the standard Data-heavy Tables / form conventions used elsewhere in the IHM.

## Cross-Story Dependencies

- Both stories depend on Epic 0 / Story 0.2 (Authentication & RBAC Foundation) being in place — the session/role substrate and protected-route enforcement are prerequisites, not built within Epic 6.
- Story 6.2's role changes affect what nav items and gated actions are available on every other epic's surfaces (Dashboard, Sync Center, Sprint & Claim Management, Contributor Detail) — a role change must propagate RBAC enforcement without requiring those other surfaces to re-implement the check.
- Story 6.1's Git/Repos configuration is the same connected-repository identity used by Epic 2's Zero-Setup Onboarding (space identity = full remote path); the two should stay consistent rather than diverge.
