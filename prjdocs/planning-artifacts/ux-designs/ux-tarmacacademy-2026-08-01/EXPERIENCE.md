---
name: "BMad Portal (Hub)"
status: final
sources:
  - "{planning_artifacts}/prds/bmad-portal-hub-2026-08-01/prd.md"
  - "{planning_artifacts}/epics.md"
updated: 2026-08-06
---

# EXPERIENCE.md - BMad Portal (Hub)

## Foundation
**UI System:** Web-based Command Center (React/Next.js).
**Visual Identity:** References `DESIGN.md` (Modern Command theme, Deep Navy, Layered surfaces, dark-only).
**Tenancy:** One Hub space per connected remote repository; a Client auto-joins the space matching its remote's technical identity (`host/org/repo`) on launch — no manual "create space" step (PRD §3.1, Zero-Setup Onboarding).
**Platform:** Desktop/laptop only. The Command Center is a continuous-monitoring ops surface, not a mobile workflow — no responsive breakpoints are in scope.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Dashboard (Overview/Health) — a.k.a. "Synchronization Center" | App open / global nav | High-level status of the distributed network (Local vs Remote): drift, Git status, WebSocket connectivity. Mock: [`mockups/dashboard.html`](mockups/dashboard.html). *(Resolved 2026-08-06: "Synchronization Center" is not a separate screen — it names the same surface as Dashboard Overview/Health, built in Story 3.3. Kept as an alias here in case the nav label is ever surfaced verbatim; do not build a second screen.)* |
| Artifact Management | Global nav | Knowledge Graph exploration and RAG-driven querying interface. *(Post-MVP — deferred with the AI Copilot, PRD §7.)* |
| Sprint & Claim Management | Global nav | Real-time tracking of User Stories, leases, and task assignments. Mock: [`mockups/claim-management.html`](mockups/claim-management.html). |
| System Administration | Global nav, Admin role only | Project configuration (Git/Repos), Role management, and Governance. |
| Contributor Detail (Fiche Contributeur) | Any Status Pill or table row naming a contributor (Sprint & Claim Management, Dashboard) | Full-context profile for one contributor — access status, live repo state, linked projects, recent activity. |

→ Composition reference: `mockups/contributor-card.html`. Spine wins on conflict.

## Voice and Tone
**Tone:** Professional, deterministic, and technical.
**Microcopy Style:** "Command & Control" — direct, concise, and action-oriented (e.g., "Syncing...", "Conflict Detected", "Lease Expired"). Brand voice and aesthetic posture live in `DESIGN.md.Brand & Style`; this section governs words only.

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Real-time Status Bar | Dashboard | WebSocket-driven global indicator for connectivity and sync health; switches `{colors.info}` (active) ↔ `{colors.neutral}` (idle) live, no perceptible polling delay. |
| Data-heavy Tables | Sprint & Claim Management, Dashboard, Contributor Detail | High-density rows with inline actions and color-coded status cells; in Contributor Detail the same row/divider/typography rules render label/value pairs instead of a header row. |
| Status Pill | Anywhere a contributor, story, or sync state needs a scannable single-value badge | Click navigates to the detail surface for that entity (contributor row → Contributor Detail; story row → story detail). Never purely decorative — always a link. |
| Activity/Event Feed | Dashboard, Contributor Detail | Live stream of platform events (Claims, Syncs, Commits, Conflicts). Newest first; caps at 20 visible entries with "load more." |
| AI "Draft" Cards | Artifact Management *(post-MVP)* | Visual distinction for AI-proposed content using dotted/translucent borders. Requires explicit `[Review]` or `[Reject]` interaction before transition to "Commit" state. |
| Identity Header | Contributor Detail | Avatar + name + role at the top of the panel. Avatar is generated from initials — MVP has no photo upload. |
| Alert Banner | Contributor Detail | Renders only when a blocking condition exists (Git conflict, rebase in progress, access revoked); absent entirely when state is clean — no "all good" variant. |
| Contributor Detail Panel | Reached from any Status Pill naming a contributor | Composes Identity Header + Status Pill + Alert Banner (conditional) + Data-heavy Tables (Access & Repo State) + Activity Feed. Read model only — no new data source; renders the existing access-status enum and repo-state heartbeat stream (PRD §3.1) at full detail instead of a summary chip. |

## State Patterns

**Data/status states** (drive Status Pill and Alert Banner color; meaning of each color lives in `DESIGN.md.Colors`):

| State | Token |
|---|---|
| Synchronized | `{colors.success}` |
| Drifting | `{colors.warning}` |
| Risk/Conflict | `{colors.error}` |
| Syncing/Active | `{colors.info}` |
| Claimed | `{colors.action}` |
| Idle/Offline | `{colors.neutral}` |

**UI-lifecycle states per surface:**

| Surface | Empty | Cold-load | Error / Offline | Permission-denied |
|---|---|---|---|---|
| Dashboard (Overview/Health) | Hub-level: not applicable — the Hub always exists once a Client has connected. Repo-list level: "No repositories connected yet" + link to onboarding. | Skeleton cards matching final layout, plus skeleton rows for the expected repo count; resolves as the WebSocket connects. | Real-time Status Bar turns `{colors.error}`: "Hub unreachable — showing last known state." Data stays visible, timestamped as stale. | — |
| Sprint & Claim Management | "No stories in this sprint." + link to create. | Skeleton table rows. | Claim actions disabled; affected row shows inline "Reconnecting…" and dims slightly. | — |
| System Administration | Not applicable — Admin always has config to view. | Skeleton form fields. | Save actions disabled; "Reconnecting…" toast. | Non-admin: nav item is hidden entirely, never shown-then-blocked (PRD §2 role table is Admin-only for this surface). |
| Contributor Detail | Not applicable — a contributor always has at least an access status. | Skeleton Identity Header + three skeleton rows. | Repo-state heartbeat (AD-002) stale (>30s since last tick): repo-state rows show `{colors.neutral}` "Last known — {time}" instead of live values; access-status rows are unaffected (served by the Backend, not the heartbeat). | Viewer without project access: panel opens, but repo-state and activity sections read "Requires project access" in place of data; identity and access-status sections remain visible. |
| Artifact Management | *(Post-MVP — deferred with PRD §7.)* | | | |

## Interaction Primitives
- **Instant Notifications:** Non-intrusive WebSocket toasts for real-time updates.
- **One-click Recovery:** Dedicated buttons for `[Re-sync]` and `[Resolve Conflict]`.
- **AI-Assisted Querying:** Prompt-driven interface for querying the Knowledge Graph. *(Post-MVP.)*

## Accessibility Floor
Behavioral. Visual contrast values live in `DESIGN.md`.
- **Visual Contrast:** High-contrast color combinations for all operational status indicators, verified against `DESIGN.md` token pairs at WCAG AA on `{colors.background}` and `{colors.surface}`.
- **Navigation:** Full keyboard accessibility for complex data tables and command menus; `Tab` order follows visual reading order on every surface.
- **Focus:** Every interactive element (status pill, table row, nav item) shows a visible focus ring in `{colors.info}` at AA contrast against its resting surface.

## Key Flows

### Flow 1 — The Dev Loop (Amina, backend contributor, mid-sprint)
1. Amina commits locally on `feature/claim-lease-ui`.
2. The Client agent's Git hook fires immediately, pushing her new commit state to the Backend over the AD-002 heartbeat — no wait for the 10s safety tick.
3. The Backend updates her repo-state record: ahead count increments, dirty flag clears.
4. **Climax:** Her Status Pill on the Dashboard flips from `{colors.warning}` (dirty) to `{colors.success}` (synced) within the same second, with no page reload and no action taken by anyone watching — the team sees her progress land in real time.

Failure: the Git hook fails to fire (e.g., not installed) → the 10s safety tick still reports her state, so the pill updates within 10s instead of instantly; nothing is lost, only the latency changes.

### Flow 2 — The PM Pulse (Karim, PM, Monday standup prep)
1. Karim opens the Dashboard before standup.
2. A Risk Signal Alert surfaces: 2 stories flagged stale (>3 days no activity, PRD §3.3).
3. He clicks through to Sprint & Claim Management, filtered to the flagged stories.
4. He selects both and hits `[Re-sync]`.
5. **Climax:** Both stories re-fetch their latest Git-linked state in one action — one clears (a PR had actually merged, just unreported), the other still shows stale. Karim now knows exactly which one needs a real conversation, not a dashboard refresh.

Failure: `[Re-sync]` fails for one story (Backend can't reach the remote) → that row shows `{colors.error}` "Re-sync failed — retry" inline; the other story's success isn't blocked by it.

### Flow 3 — The Auditor's Audit (Sofia, Architect / Tech Lead, pre-release check)
1. Sofia opens Artifact Management *(post-MVP, PRD §7 — flow specified now for continuity, not buildable in MVP)* and selects the PRD artifact for the current epic.
2. She runs the BMad Compliance Gate.
3. The gate checks structural completeness against BMad standards (PRD §3.3).
4. **Climax:** The Compliance Score renders with a per-section breakdown — she sees exactly which section (e.g., missing acceptance criteria) dragged the score down, instead of a single opaque pass/fail.

Failure: the gate can't reach a linked artifact (broken cross-reference) → that section shows `{colors.error}` "Unresolved reference: {path}" instead of a score, and the overall score is marked partial rather than silently averaged.

### Flow 4 — Karim's Risk Check (Karim, PM, mid-afternoon)
1. Karim is scanning Sprint & Claim Management and notices a `{colors.error}` Status Pill on Yasmine's row.
2. He clicks the pill.
3. Her Contributor Detail panel opens: Identity Header, then an Alert Banner reading "Conflict detected — rebase in progress on `feature/auto-join-ux`. Blocked for 3h."
4. He checks the repo-state rows: 4 ahead, 11 behind — she's been isolated from `main` for a while.
5. **Climax:** Instead of pinging her with "hey is everything okay?" and waiting, Karim messages her with the blocker already named: "Saw the rebase conflict on auto-join-ux — need a hand un-sticking it?" She replies in under a minute, because he already did the diagnosis.

Failure: the AD-002 heartbeat is stale when he opens the panel (>30s) → repo-state rows show `{colors.neutral}` "Last known — {time}" instead of live counts; Karim still has enough to start the conversation, just with an explicit staleness caveat instead of false confidence.
