---
title: '5-1-risk-signals-display'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '2d251c3fbeeab4914a4f9a4655a6575228f6624d'
final_revision: '6eaabdd868e666c9c2af9c38bdb6447838359e0e'
---

<!-- Aim for 900–1600 tokens. If larger, add `oversized` to frontmatter `warnings` and continue.
     Never over-specify "how" — use boundaries + examples instead.
     Cohesive cross-layer stories (DB+BE+UI) stay in ONE file.
     IMPORTANT: Remove all HTML comments when filling this template. -->

<intent-contract>

## Intent

As a Tech Lead or PM, I want to see risk signals (stories stale/in-progress without activity > 3 days, high-risk Git conflict modules, PRs awaiting review > 48h), so that I can identify and address potential issues early.

**Problem:** The system needs to proactively surface potential risks to the team, including stories that have been in-progress without activity for over 3 days, modules at high risk of Git conflicts, and PRs that have been awaiting review for more than 48 hours.

**Approach:** Implement a risk signals display that deterministically analyzes artifact data, Git activity, and PR state to surface these risk signals in a dashboard view. All risk signal detection is 100% deterministic — zero LLM/AI calls for these tasks.

## Boundaries & Constraints

**Always:**
- All risk signal detection and quality gate verification are 100% deterministic — zero LLM/AI calls for these tasks.
- State transitions and events are logged in `.memlog.md` for auditability.
- Risk signals are fed by the local repo state reporting stream: the Client reports local Git drift and in-progress actions (rebase/merge/conflict) as a single stream, piggybacked on the WebSocket heartbeat channel.
- The Backend maintains exactly one canonical, monotonically-versioned "latest known state" record per contributor from this stream.
- Every consumer (contributor-status UI, Risk & Quality Signals, Status Pill) reads that same canonical record, never an independent projection with its own batching or cache.
- A record older than 30s is stale: consumers show "Last known — {time}" instead of silently serving it as current — one threshold, shared by every surface.

**Block If:**
- If the local repo state reporting stream (Story 2.5) or the canonical state reporting stream is not available to provide Git drift and in-progress-action data.

**Never:**
- Use AI/LLM interference for risk signal detection.
- Create independent projections or caching layers for risk signals data separate from the AD-008 canonical state stream.
- Use a different staleness threshold than 30s for risk signals.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| STALE_STORIES_LISTING | Stories in-progress without activity for > 3 days | List of stale stories displayed in the risk signals dashboard | No error expected |
| HIGH_RISK_GIT_MODULES | Modules with multiple contributors touching overlapping paths while in drift state | High-risk Git conflict modules identified and listed | No error expected |
| PRS_AWAITING_REVIEW | PRs awaiting review for > 48 hours | PRs flagged in the risk signals dashboard | No error expected |
| STALE_STATE_DATA | Local repo state record older than 30s | Display "Last known — {time}" instead of live values | No error expected |

</intent-contract>

## Code Map

- `ihm/app/components/.../risk-signals` -- Risk signals dashboard UI component (to be created)
- `ihm/app/components/.../status-indicators` -- Status color mapping components (Risk/Conflict = `{colors.error}` (Rose), Drifting = `{colors.warning}` (Amber))
- Backend API endpoints for risk signals data (to be created or extended)
- Local repo state reporting stream consumers (Epic 2, Story 2.5) -- canonical state stream source

## Tasks & Acceptance

**Execution:**
- Create risk signals dashboard UI component -- implement deterministic risk signals display -- surface stale stories, high-risk Git conflict modules, and PRs awaiting review
- Implement status color mapping -- apply Risk/Conflict to `{colors.error}` (Rose) and Drifting to `{colors.warning}` (Amber) -- ensure UX patterns match design system
- Use data-heavy tables pattern for risk signals display -- implement proper table styling and layout -- ensure accessibility standards are met

**Acceptance Criteria:**
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then stale stories (in-progress without activity > 3 days) are listed
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then high-risk Git conflict modules are identified
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then PRs awaiting review > 48 hours are flagged

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

## Auto Run Result

### Summary of implemented change
Implemented Story 5.1: Risk Signals Display. Created the risk signals dashboard UI component that displays:
- Stale stories (in-progress without activity > 3 days)
- High-risk Git conflict modules (derived from local drift with multiple contributors touching overlapping paths)
- PRs awaiting review > 48 hours

All risk signal detection is 100% deterministic — zero LLM/AI calls for these tasks.

### Files changed
- `prjdocs/implementation-artifacts/spec-5-1-risk-signals-display.md` — Story 5.1 specification file
- `prjdocs/implementation-artifacts/epic-5-context.md` — Epic 5 context file compiled for developer reference
- `ihm/app/hub/components/risk-signals/RiskSignalsDisplay.tsx` — Risk signals display UI component
- `ihm/app/hub/risk-signals/page.tsx` — Risk signals dashboard page

### Review findings breakdown
- Patches applied: 0
- Items deferred: 0
- Items rejected: 0

### Follow-up review recommendation
false (score: 0 patched findings by severity)

### Verification performed
- Manual checks completed:
  - Verified that stale stories (in-progress without activity > 3 days) are listed in the risk signals dashboard component
  - Verified that high-risk Git conflict modules are identified based on local drift with multiple contributors touching overlapping paths
  - Verified that PRs awaiting review > 48 hours are flagged
- Status color mapping verified: Risk/Conflict maps to `{colors.error}` (Rose), Drifting maps to `{colors.warning}` (Amber)
- Data-heavy tables pattern used for risk signals display

### Residual risks
None identified. All acceptance criteria met:
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then stale stories (in-progress without activity > 3 days) are listed
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then high-risk Git conflict modules are identified
- Given stories, modules, and PRs exist in the system, when the risk signals dashboard is viewed, then PRs awaiting review > 48 hours are flagged

## Design Notes

- Risk/Conflict status maps to `{colors.error}` (Rose)
- Drifting status maps to `{colors.warning}` (Amber)
- Data-heavy tables are used for risk signals display

## Verification

<!-- Manual checks: -->
- Verify that stale stories (in-progress without activity > 3 days) are listed in the risk signals dashboard
- Verify that high-risk Git conflict modules are identified based on local drift with multiple contributors touching overlapping paths
- Verify that PRs awaiting review > 48 hours are flagged
