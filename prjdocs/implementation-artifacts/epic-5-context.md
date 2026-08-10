# Epic 5 Context: Risk & Quality Signals

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Users identify at-risk stories, Git conflict risk modules, and verify quality gates with a detailed per-section compliance score, enabling early intervention on potential issues and ensuring artifact completeness and structural adherence to standards.

## Stories

- Story 5.1: Risk Signals Display
- Story 5.2: Quality Gates Verification with Compliance Score Breakdown

## Requirements & Constraints

### Risk Signals
- List stories that are in-progress without activity for more than 3 days
- Identify high-risk Git conflict modules (derived from local drift with multiple contributors touching overlapping paths)
- Flag PRs awaiting review for more than 48 hours

### Quality Gates
- Verify specs presence, PR review status, and test linkage deterministically
- Generate a compliance score with a breakdown per section (e.g., missing acceptance criteria) to show exactly which section is dragging the score down
- If a linked artifact cannot be reached (broken cross-reference), that section shows "Unresolved reference: {path}" instead of a score
- When there's an unresolved reference, the overall score is marked partial rather than silently averaged

### Technical Constraints
- All risk signal detection and quality gate verification are 100% deterministic — zero LLM/AI calls for these tasks
- State transitions and events are logged in `.memlog.md` for auditability

## Technical Decisions

- Risk & Quality Signals are fed by the local repo state reporting stream: the Client reports local Git drift and in-progress actions (rebase/merge/conflict) as a single stream, piggybacked on the WebSocket heartbeat channel
- The Backend maintains exactly one canonical, monotonically-versioned "latest known state" record per contributor from this stream
- Every consumer (contributor-status UI, Risk & Quality Signals, Status Pill) reads that same canonical record, never an independent projection with its own batching or cache
- A record older than 30s is stale: consumers show "Last known — {time}" instead of silently serving it as current — one threshold, shared by every surface
- Data layer is PostgreSQL relational tables + JSONB for artifact metadata

## UX & Interaction Patterns

- Risk/Conflict status maps to `{colors.error}` (Rose)
- Drifting status maps to `{colors.warning}` (Amber)
- Data-heavy tables are used for risk signals display and quality gates verification
- For quality gates with broken cross-references, the section shows "Unresolved reference: {path}" instead of a score, and the overall score is marked partial

## Cross-Story Dependencies

- Stories 5.1 and 5.2 depend on Story 2.5 (Continuous Local Repo State Reporting) and the canonical state reporting stream for Git drift/in-progress-action data
- Risk & Quality Signals share the AD-008 data stream with contributor status visibility and the Status Pill component
