# Epic 7 Context: VS Code Plugin - IDE Integration & Dashboard Display

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give developers a second, IDE-native way to interact with the same Backend Hub used by the Client Python (Epic 2) and the IHM: a VS Code extension that reports local Git/repo state on a configurable poll (instead of Git hooks) and reproduces the existing HUB dashboards (repo state, claims, risk signals) inside VS Code Web Views. This is an additive interface, not a replacement — users choose Client Python or the VS Code Plugin, and both feed the identical Backend, so the plugin must never invent its own data model, statuses, or thresholds.

## Stories

- Story 7.1: VS Code Extension Skeleton & `package.json` Setup
- Story 7.2: Configurable Repo Polling Engine (Default 5 min)
- Story 7.3: Event-Driven Git Polling Override
- Story 7.4: VS Code Secret Storage for JWT Management
- Story 7.5: Web View Provider Setup for Sidebar Dashboard
- Story 7.6: Dashboard Widgets Integration (Repo State, Claims, Risk Signals)
- Story 7.7: Claims Visualization & Command Palette Integration
- Story 7.8: VS Code Plugin Setup & Onboarding UX

## Requirements & Constraints

- The plugin must detect the connected remote repo identity and local Git drift (commits ahead/behind, in-progress rebase/merge/conflict) and report it to the Backend — same data shape as the Client Python's local repo state stream, just gathered via `vscode.git` instead of a local scan/hook.
- Reporting cadence: configurable polling interval, default 5 minutes (300s), sent over WebSocket or HTTP REST to the Backend. This is the plugin's counterpart to the Client Python's "Git hook fires immediately + 10s safety-tick fallback" pattern — here the equivalent immediate path is an event-driven override that force-uploads state when a local Git event occurs between polls, without disrupting the next scheduled poll.
- All sync/claim/state-verification operations remain 100% deterministic — the plugin only displays and reports; it performs no LLM-driven logic.
- Notifications must be non-intrusive WebSocket-driven toasts for real-time updates (claims expiring, new available features) — consistent with the platform-wide instant-notification requirement, not a plugin-specific pattern.
- Accessibility: VS Code theme (light/dark) and platform accessibility standards (WCAG AA contrast, full keyboard access) must be respected in every Web View.
- JWT/session tokens must never be stored in plain settings/config files — only in `vscode.SecretStorage`; expiration/invalidation must trigger re-authentication, not a silent failure.
- Configuration must be exposed through the VS Code Settings UI (not raw JSON editing), with sensible defaults (polling interval 300s, dashboard display = sidebar view, claims suggestions enabled).

## Technical Decisions

- The plugin is a new client of the existing Backend Hub (FastAPI + WebSocket + PostgreSQL/JSONB) — no new backend surface is introduced by this epic; it consumes the same WebSocket/REST APIs and payload shapes already built for the Client Python (Epic 2) and IHM (Epic 3).
- Local repo state reporting must feed the Backend's single canonical, monotonically-versioned per-contributor "latest known state" record (one stream, one read model) — the plugin must not build its own independent projection, cache, or staleness rule. A record older than 30s is stale and must be shown as "Last known — {time}", the same threshold used everywhere else.
- Contributor status is two independent axes — presence (`connected | absent`) and sync-state (`synced | drift | conflict | syncing-active | claimed`) — never merged in storage or payload. Any single-glyph status (e.g. the plugin's status bar widget) must collapse them with the one sanctioned rule: if presence is absent, show `Idle-Offline` regardless of sync-state; otherwise show the sync-state value. No alternate collapse logic is permitted.
- Client-side Git authority: only the local agent (here, the VS Code extension via `vscode.git`) reads/acts on the developer's local Git state; the Backend never writes to local disk and remains read-only toward the remote repo.
- Auth relies on the session/RBAC substrate already established for the platform (Epic 0.2) — the plugin authenticates against the same Backend identity mechanism and stores the resulting JWT via Secret Storage; the concrete identity provider is an existing platform-level decision, not something this epic redefines.
- Risk signal thresholds are fixed platform-wide and must be reused as-is by any dashboard widget: stories stale with no activity for more than 3 days, PRs awaiting review for more than 48 hours.

## UX & Interaction Patterns

- Web Views reproduce the existing HUB dashboards functionally, not necessarily pixel-for-pixel: a Repo State view (local drift, sync status, Git actions — the Dashboard Overview/Health equivalent), a Claims view (active leases, available stories — the Sprint & Claim Management equivalent), and a Risk Signals view (stale tasks, conflict-risk modules, PRs awaiting review).
- The six-value status palette and its one-color-one-meaning rule carry over conceptually: Synced, Drift, Conflict, Syncing-Active, Claimed, Idle-Offline — each state has exactly one meaning, reused consistently across the status bar widget and any Web View status indicator. Because VS Code Web Views run inside the user's chosen editor theme (light/dark), the plugin adapts to that theme rather than using the IHM's fixed dark-only palette — theme adherence is what's constrained, not the specific hex values.
- Status Bar widget shows sync status and role at a glance (e.g. "Synced | Dev: username"), following the same presence/sync-state collapse rule as the IHM's Status Pill.
- Command Palette integration (`BMad Portal: Show Suggested Features`) surfaces features relevant to the user's resolved role/claims — mirrors the platform convention that role-gated capabilities are surfaced only when authorized, never shown-then-blocked.
- Toasts for claims events (expiration, newly available features) must be non-intrusive, matching the platform's existing "Instant Notifications" interaction primitive.
- First-run/settings experience must be friction-free: all parameters configurable through native VS Code Settings UI, with defaults that work out of the box.

## Cross-Story Dependencies

- Depends on the Backend Hub, WebSocket/REST APIs, and identity/state-reporting model already built in Epic 2 (Distributed Sync & Zero-Setup Onboarding) — the plugin does not re-implement Backend logic, only a new client surface for it.
- Depends on the Auth/RBAC foundation (Epic 0, Story 0.2) for authenticating the plugin and resolving the user's role/claims.
- Dashboard widget data (contributor/claim status, risk signals) is sourced from the same canonical models introduced in Epic 3 (Claims, Contributors & Team Sync View) and Epic 5 (Risk & Quality Signals) — no new signal logic is defined by this epic.
- Story 7.2's polling engine is this client type's substitute/complement for the Git-hook-driven reporting mechanism used by the Client Python (Epic 2, Story 2.5); Story 7.3's event-driven override is the plugin's analogue of that hook's "immediate push" behavior.
