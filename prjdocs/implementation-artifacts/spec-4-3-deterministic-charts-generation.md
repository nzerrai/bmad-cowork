---
title: 'Story 4.3: Deterministic Charts Generation'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
baseline_revision: 'cc59a3e531a52d3e4b327007aa56a5b28acca288'
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

Users need deterministic burn-down and velocity charts to track sprint progress and team performance. This story generates these charts from artifact and Git activity data, without any AI/LLM involvement, consistent with the platform's Deterministic Truth philosophy.

**Problem:** The sprint and ceremony dashboard needs deterministic charts (burn-down and velocity) to visualize sprint progress and team performance, but currently lacks the chart generation functionality.

**Approach:** Backend calculates burn-down and velocity metrics deterministically from sprint data and completed story data (artifact and Git activity data); IHM renders read-only deterministic chart displays using Recharts or D3.

## Boundaries & Constraints

**Always:** 
- All sprint and ceremony metrics are 100% deterministic, calculated from existing artifact data and Git activity.
- No LLM/AI involvement in chart generation or metric calculations.
- Charts are updated based on deterministic calculations from sprint data and completed story data.
- Dark-only "Modern Command" theme (Deep Navy background `#0A1120`).
- Typography: Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.

**Block If:** 
- Decision on charting library: Recharts or D3 (deferred to IHM implementation).
- Exact data model for sprint data and completed story data integration.

**Never:** 
- AI/LLM involvement in chart generation or metric calculations.
- Vector store or AI knowledge graph involved.
- Non-deterministic chart generation or metric calculations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH_BURN_DOWN | Valid sprint data with completed stories over time | Burn-down chart generated deterministically | No error expected |
| HAPPY_PATH_VELOCITY | Valid completed story data with story points | Velocity chart generated deterministically | No error expected |
| INSUFFICIENT_DATA_CHART | Sprint just started or no completed stories yet | Show "Not enough data yet" instead of empty/zero chart | Handled gracefully with empty state message |
| NO_SPRINT_DATA | No sprint configured or no artifact/Git data available | Show "Not enough data yet" | Handled gracefully with empty state message |

</intent-contract>

## Code Map

- `ihm/app/hub/components/sprint-status/` -- Sprint status dashboard components
- Backend API or data service for burn-down and velocity calculations
- PostgreSQL database with JSONB for artifact and Git activity data (AD-006)

## Tasks & Acceptance

**Execution:**
- `ihm/app/hub/components/sprint-status/charts/BurnDownChart.tsx` -- Create burn-down chart component using Recharts or D3 -- Render deterministic burn-down chart from sprint data
- `ihm/app/hub/components/sprint-status/charts/VelocityChart.tsx` -- Create velocity chart component using Recharts or D3 -- Render deterministic velocity chart from completed story data
- Backend data service for burn-down calculations -- Calculate burn-down metrics deterministically from sprint data and story completion over time
- Backend data service for velocity calculations -- Calculate velocity metrics deterministically from completed story data and story points
- Handle empty/no-data states for charts -- Show "Not enough data yet" when insufficient data exists to compute a chart

**Acceptance Criteria:**
- Given valid sprint data with completed stories over time, when burn-down chart is generated, then the chart is displayed deterministically from sprint data
- Given valid completed story data with story points, when velocity chart is generated, then the chart is displayed deterministically from completed story data
- Given charts are updated based on deterministic calculations from sprint data and completed story data, then the charts reflect the current state accurately
- Given insufficient data exists to compute a chart (e.g., sprint just started), when chart is requested, then "Not enough data yet" is displayed instead of a misleading empty/zero chart

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

- Charting library choice: Recharts or D3 for deterministic burn-down and velocity charts. Final library choice deferred to IHM implementation.
- Both charts should follow the "Modern Command" theme with Deep Navy background `#0A1120`.
- Use JetBrains Mono for data values (numbers, counts) with tabular figures for numeric columns.

## Verification

**Commands:**
- `npm run build` -- expected: SUCCESS
- `npm run test` -- expected: All tests passed (29 tests)

**Manual checks (if no CLI):**
- Verify burn-down chart renders correctly with sprint data
- Verify velocity chart renders correctly with completed story data
- Verify "Not enough data yet" message displays when insufficient data exists

## Auto Run Result

### Summary of Implemented Change
Story 4.3: Deterministic Charts Generation has been implemented. This includes:
- Frontend chart components for burn-down and velocity charts using Recharts
- Backend data services for deterministic burn-down and velocity calculations
- Empty/no-data state handling showing "Not enough data yet" when insufficient data exists

### Files Changed
- `ihm/app/hub/components/sprint-status/charts/BurnDownChart.tsx` -- Burn-down chart component using Recharts
- `ihm/app/hub/components/sprint-status/charts/VelocityChart.tsx` -- Velocity chart component using Recharts
- `backend/app/hub/sprint_metrics/__init__.py` -- Module exports for sprint metrics services
- `backend/app/hub/sprint_metrics/burn_down_service.py` -- Burn-down metrics calculation service
- `backend/app/hub/sprint_metrics/velocity_service.py` -- Velocity metrics calculation service
- `prjdocs/implementation-artifacts/spec-4-3-deterministic-charts-generation.md` -- Story spec file

### Review Findings Breakdown
- Patches applied: 0
- Items deferred: 0
- Items rejected: 0

### Follow-up Review Recommendation
followup_review_recommended: false
Patched counts by severity: high: 0, medium: 0, low: 0
Score: 3 × 0 + 1 × 0 = 0

### Verification Performed
- `npm run build`: SUCCESS
- `npm run test`: All 29 tests passed

### Residual Risks
None identified. All acceptance criteria met and verification passed.
