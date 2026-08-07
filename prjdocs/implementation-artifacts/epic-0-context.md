# Epic 0 Context: Project Scaffolding & Dev Environment

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Before any user-facing story can be built, the three-tier system (Client Python agent, Backend FastAPI/PostgreSQL, IHM Next.js) needs to exist as a real, runnable, testable skeleton, and the platform needs a working authentication + RBAC enforcement substrate. This is Sprint 0: a pure enabler epic with no numbered functional requirement. It exists because this is a greenfield 3-tier system — without it, every later epic would be improvising project structure and assuming a login/role system that was never built. Epic 6 (System Administration) and every role-gated surface elsewhere depend on the RBAC substrate landing here first.

## Stories

- Story 0.1: Project Scaffolding & Dev Environment
- Story 0.2: Authentication & RBAC Foundation

## Requirements & Constraints

- No numbered FR maps to this epic; it covers the Additional Requirement "Identity/Auth via RBAC (Backend)" plus technical scaffolding for all three tiers.
- All three tiers must start locally from minimal configuration, using the versions pinned for the stack (see Technical Decisions).
- Initial database migrations must exist and be versioned, but empty — no feature tables yet.
- A CI pipeline must run lint and automated tests on every PR.
- Local dev setup for all three services must be documented (README/CONTRIBUTING).
- Deployment topology (Kubernetes vs. serverless, environments) is explicitly out of scope for this epic.
- Authentication must establish a session and attach the user's role to every subsequent request.
- RBAC enforcement must reject any request for a role-gated action/surface the user's role doesn't permit.
- An unauthenticated request to any protected route must be rejected outright — never silently served with default or empty data.
- The platform recognizes five roles: Developer, Product Manager, Architect/Tech Lead, UX Designer, Admin. MVP has exactly one gated role in practice (Admin, for System Administration).
- The concrete identity provider (SSO vs. email/password vs. other) and the full role→permission matrix are explicitly deferred to implementation time — this epic only guarantees the enforcement substrate exists.
- Whatever the identity provider resolves to, it must still satisfy downstream UX contracts: a non-Admin user must never see the System Administration nav item (hidden entirely, not disabled-then-shown), and every gated action must be RBAC-checked before it's offered as a next action.

## Technical Decisions

- Three-tier architecture: Client (Python), Backend (FastAPI + WebSockets + PostgreSQL/JSONB), IHM (React/Next.js + Recharts or D3).
- Pinned stack versions: Python 3.13, FastAPI 0.141.x, PostgreSQL 18.x, Next.js 16.3, React 19.x. Charting library choice is deferred to IHM implementation.
- Authority boundaries to respect from day one even in scaffolding: the Client alone owns the local filesystem and Git operations; the Backend owns orchestration/temporal state and never writes to a user's local disk; the Remote Git Repository is the final arbiter of committed artifacts.
- Backend persistence for MVP is PostgreSQL with relational tables + JSONB for artifact metadata — no `pgvector`/vector store (that's tied to the deferred AI Copilot work).
- Auth/RBAC lives entirely in the Backend: session establishment plus role attached to every request, with protected-route rejection for unauthenticated calls. This is paradigm-level, not just one epic's local concern.
- Every critical state transition elsewhere in the system gets logged to `.memlog.md` for auditability — worth keeping in mind when scaffolding logging/infra conventions, even though no such transitions exist yet in Epic 0 itself.

## Cross-Story Dependencies

- Story 0.2 (Auth/RBAC) depends on Story 0.1's scaffolded Backend existing to attach session/RBAC middleware to.
- Epic 0 as a whole is a hard prerequisite for Epic 1 through Epic 6 — none of them have a buildable foundation without it.
- Epic 6 (System Administration) specifically depends on Story 0.2's RBAC enforcement substrate to gate its Admin-only surface and hide its nav item from non-Admins.
- Every other epic with role-gated behavior (e.g., claim ownership, contributor identity) assumes the session/role attachment built in Story 0.2 is already in place.
