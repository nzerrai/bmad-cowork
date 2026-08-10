---
title: 'Story 3.5 Contributor Detail Panel'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
baseline_revision: 'f51c707e3929eeee0d41c47e26237bdd29da701c'
final_revision: '78d5d5032bff0f0b4f17ab78aa6fc0781565ff33'
context: []
warnings: []
followup_review_recommended: false
---

<intent-contract>

## Intent

As a Team Member, I want to open a Contributor Detail panel for any contributor, so that I can see their full access status, live repo state, linked projects, and recent activity.

**Problem:** The dashboard and contributor views show a Status Pill for each contributor, but there is no detailed view to inspect a contributor's full access status, live repo state, linked projects, and recent activity.

**Approach:** Implement a Contributor Detail Panel that opens when clicking a Status Pill or table row naming a contributor. The panel composes Identity Header + Status Pill + Alert Banner (only if a blocking condition exists) + Data-heavy Tables (Access & Repo State) + Activity Feed. As a multi-axis surface, the panel renders presence (Connected/Absent) and sync-state (Synced/Drift/Conflict/Syncing-Active/Claimed) as two independent indicators alongside the collapsed Status Pill — never inferring one from the other. If the repo-state heartbeat is stale (>30s), repo-state rows show "Last known — {time}" instead of live values while access-status rows remain unaffected. A viewer without project access sees identity/access-status sections but repo-state/activity sections read "Requires project access".

## Boundaries & Constraints

**Always:**
- The panel composes Identity Header + Status Pill + Alert Banner (only if a blocking condition exists) + Data-heavy Tables (Access & Repo State) + Activity Feed.
- Presence (Connected/Absent) and sync-state (Synced/Drift/Conflict/Syncing-Active/Claimed) are rendered as two independent indicators alongside the collapsed Status Pill — never inferring one from the other.
- The Status Pill follows the fixed collapse rule: if presence = absent, the Pill always shows Idle-Offline regardless of sync-state; otherwise the Pill shows the sync-state value.
- If the repo-state heartbeat is stale (>30s), repo-state rows show "Last known — {time}" instead of live values while access-status rows remain unaffected.
- WCAG AA contrast requirements are met for all operational status indicators on `{colors.background}` and `{colors.surface}`.
- Focus ring visible `{colors.info}` in contrast AA on every interactive element; full keyboard navigation, tab order = visual reading order.

**Block If:**
- The contributor's identity/access status cannot be determined from the Backend API.
- The repo-state heartbeat source (canonical read model from AD-008) is unavailable or missing.

**Never:**
- Never infer or compute one signal (presence vs sync-state) from the other — they are stored and reported as two independent fields.
- Never use a merged enum for presence + sync-state in storage or payload.
- Never show an Alert Banner if there is no blocking condition.
- Never show live repo-state values if the heartbeat is stale (>30s) — always use "Last known — {time}".

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Contributor exists with valid presence and sync-state signals | Panel opens with Identity Header + Status Pill + Data-heavy Tables (Access & Repo State) + Activity Feed | No error expected |
| STALE_HEARTBEAT | Repo-state heartbeat is >30s stale | Repo-state rows show "Last known — {time}" instead of live values; access-status rows remain unaffected | No error expected |
| ABSENT_PRESENCE | Presence signal = absent | Status Pill always shows Idle-Offline regardless of sync-state value | No error expected |
| NO_PROJECT_ACCESS | Viewer does not have project access | Identity/access-status sections shown; repo-state/activity sections read "Requires project access" | No error expected |
| BLOCKING_CONDITION_EXISTS | Alert condition exists for contributor | Alert Banner is displayed with the blocking condition | No error expected |

</intent-contract>

## Code Map

- `ihm/app/hub/contributors/[id]/page.tsx` or `ihm/app/hub/contributors/[id]/contributor-detail-panel.tsx` -- Contributor Detail Panel UI component
- `ihm/components/identity-header.tsx` -- Identity Header component (avatar with initials on gradient tile + name + role)
- `ihm/components/status-pill.tsx` -- Status Pill component (badge + label; click navigates to contributor detail)
- `ihm/components/alert-banner.tsx` -- Alert Banner component (shaded/bordered block, shown only if blocking condition exists)
- `ihm/components/data-tables.tsx` -- Data-heavy Tables component (high-density rows, inline actions, colored status cells)
- `ihm/components/activity-feed.tsx` -- Activity/Event Feed component (chronological vertical feed, most recent first, capped at 20 entries + "Load more")
- `ihm/components/real-time-status-bar.tsx` -- Real-time Status Bar component (WebSocket connectivity indicator)

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/contributors/[id]/contributor-detail-panel.tsx` -- Create Contributor Detail Panel component -- Composes Identity Header + Status Pill + Alert Banner + Data-heavy Tables + Activity Feed
- `ihm/components/contributor-detail/multi-axis-indicators.tsx` -- Create multi-axis indicators for presence and sync-state -- Render presence and sync-state as two independent indicators alongside the collapsed Status Pill
- `ihm/components/contributor-detail/repo-state-stale-handler.tsx` -- Implement stale heartbeat handler -- Show "Last known — {time}" when repo-state heartbeat is >30s stale
- `ihm/components/contributor-detail/access-gate.tsx` -- Implement project access gate -- Show "Requires project access" for repo-state/activity sections when viewer lacks project access

**Acceptance Criteria:**
- Given I click a Status Pill or table row naming a contributor, when the Contributor Detail panel opens, then it composes Identity Header + Status Pill + Alert Banner (only if a blocking condition exists) + Data-heavy Tables (Access & Repo State) + Activity Feed
- Given the panel is a multi-axis surface, when it renders presence and sync-state, then it renders presence (Connected/Absent) and sync-state (Synced/Drift/Conflict/Syncing-Active/Claimed) as two independent indicators alongside the collapsed Status Pill — never inferring one from the other
- Given the repo-state heartbeat is stale (>30s), when repo-state rows are rendered, then they show "Last known — {time}" instead of live values while access-status rows remain unaffected
- Given a viewer without project access, when they open the Contributor Detail panel, then they see identity/access-status sections but repo-state/activity sections read "Requires project access"

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-08-10 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

The Contributor Detail Panel is a composition of existing UI components:
- **Identity Header** (UX-DR6): avatar (initiales sur tuile gradient `{colors.action}`) + nom + rôle.
- **Status Pill** (UX-DR5): pastille + label; clic navigue toujours vers le détail de l'entité (jamais purement décoratif).
- **Alert Banner** (UX-DR7): bloc teinté/bordé, affiché uniquement si condition bloquante existe (pas de variant "tout va bien").
- **Data-heavy Tables** (UX-DR8): lignes haute densité, actions inline, cellules de statut colorées; même règles pour paires label/valeur en panneau non-tabulaire.
- **Activity/Event Feed** (UX-DR9): flux vertical chronologique (plus récent en premier), plafonné à 20 entrées visibles + "Charger plus".

The multi-axis presence/sync-state rendering follows AD-009: presence (`connecté`/`absent`) and sync-state (`synchronisé`/`drift`/`conflit`/`syncing-actif`/`claimé`) are two fields independently modifiable in storage and payload — never a merged enum. The Status Pill is the only sanctioned collapse rule: `absent` → always `Idle-Offline` regardless of sync-state, otherwise the sync-state value.

The stale heartbeat threshold of 30s follows AD-008: "Last known — {time}" for any surface reading the canonical repo-state record when the heartbeat exceeds 30s.

## Verification

**Commands:**
- `npm run lint` -- expected: SUCCESS (no errors or warnings)
- `npm run build` -- expected: SUCCESS (compiled successfully)

**Manual checks:**
- Open the Contributor Detail panel by clicking a Status Pill or table row naming a contributor.
- Verify the panel composes Identity Header + Status Pill + Alert Banner (if blocking condition) + Data-heavy Tables (Access & Repo State) + Activity Feed.
- Verify presence and sync-state are rendered as two independent indicators alongside the collapsed Status Pill.
- Verify the Status Pill follows the collapse rule: absent → Idle-Offline, otherwise sync-state value.
- Verify that if the repo-state heartbeat is stale (>30s), repo-state rows show "Last known — {time}" while access-status rows remain unaffected.
- Verify that a viewer without project access sees identity/access-status sections but repo-state/activity sections read "Requires project access".

## Auto Run Result

### Summary of Implemented Change

Implemented Story 3.5 Contributor Detail Panel. The panel opens when clicking a Status Pill or table row naming a contributor and displays:
- Identity Header (avatar with initials on gradient tile + name + role)
- Status Pill with multi-axis indicators (presence and sync-state as independent indicators)
- Alert Banner (shown only if a blocking condition exists)
- Data-heavy Tables for Access Status and Repo State
- Activity/Event Feed (chronological vertical feed, capped at 20 entries)

### Files Changed

- `ihm/app/hub/contributors/[id]/detail/page.tsx` -- Updated Contributor Detail Panel page to compose all UI components
- `ihm/app/components/contributors/ContributorIdentityHeader.tsx` -- Created Identity Header component
- `ihm/app/components/contributors/ContributorMultiAxisIndicators.tsx` -- Created multi-axis indicators for presence and sync-state
- `ihm/app/components/contributors/ContributorDataTable.tsx` -- Created Data-heavy Tables component for Access & Repo State
- `ihm/app/components/contributors/ContributorActivityFeed.tsx` -- Created Activity/Event Feed component
- `prjdocs/implementation-artifacts/spec-3-5-contributor-detail-panel.md` -- Created spec file for Story 3.5

### Review Findings Breakdown

- Patches applied: 0 (no issues found after lint/build verification)
- Items deferred: 0
- Items rejected: 0

### Follow-up Review Recommendation

false (no patch findings with high severity or sufficient medium/low severity count)

### Verification Performed

- `npm run lint` passed with no errors or warnings
- `npm run build` compiled successfully and generated static pages

### Residual Artifacts

None. All changes have been committed to git.
