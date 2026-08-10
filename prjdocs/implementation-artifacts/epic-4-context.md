# Epic 4 Context: Sprint & Ceremony Dashboard

## Goal

Users track sprint progress and ceremony status with deterministic metrics. This epic aggregates sprint data and generates deterministic charts (burn-down, velocity) from artifact and Git activity data, without any AI/LLM involvement, consistent with the platform's Deterministic Truth philosophy.

## Stories

- **Story 4.1: Sprint Status Display** — Show sprint progression (stories done vs total), dates, objectives, and completion percentage.
- **Story 4.2: Ceremony List and Status** — List ceremonies (standup, planning, review, retro) with status (upcoming, completed, missed) and links to notes artifacts.
- **Story 4.3: Deterministic Charts Generation** — Generate burn-down and velocity charts deterministically from artifact and Git activity data.

## Functional Requirements Covered

- **FR17**: Display sprint status (progression stories done vs total, dates, objectives).
- **FR18**: List ceremonies with status (upcoming, completed, missed) and links to notes artifacts.
- **FR19**: Generate deterministic charts (burn-down chart, velocity chart) from artifact and Git activity data.

## Architecture Context

- **Ownership**: Backend handles deterministic burn-down/velocity calculations from artifacts + Git activity data; IHM renders read-only deterministic displays.
- **Data Source**: Relational PostgreSQL + JSONB (AD-006). No vector store or AI knowledge graph involved.
- **Integration**: No new cross-unit divergence risk — this is a read-only deterministic display consuming existing artifact and Git activity data.

## UX/UI Context

- **Surface Location**: Sprint & Ceremony Dashboard surfaces are accessible from the global navigation under "Sprint & Claim Management" or dedicated Sprint status sections.
- **Theme**: Dark-only "Modern Command" theme (Deep Navy background `#0A1120`).
- **Typography**: Inter for UI/headings, JetBrains Mono for data values (numbers, counts). Tabular figures for numeric columns.
- **Charting**: Recharts or D3 for deterministic burn-down and velocity charts. Final library choice deferred to IHM implementation.
- **Empty/No-Data States**:
  - Sprint Status: If no sprint is configured, show "No active sprint" instead of a zeroed/empty progress bar.
  - Ceremonies: A completed ceremony with no linked notes artifact shows "No notes yet" instead of a broken link.
  - Charts: If insufficient data exists to compute a chart (e.g., sprint just started), show "Not enough data yet" instead of a misleading empty/zero chart.

## Deterministic Constraints

- All sprint and ceremony metrics are 100% deterministic, calculated from existing artifact data and Git activity.
- No LLM/AI involvement in chart generation or metric calculations.
- Charts are updated based on deterministic calculations from sprint data and completed story data.

## Key Acceptance Criteria Summary

**Story 4.1 (Sprint Status Display)**:
- Display progression: stories done vs total
- Display sprint dates and objectives
- Calculate completion percentage
- Show "No active sprint" if no sprint is configured

**Story 4.2 (Ceremony List and Status)**:
- Show ceremony status: upcoming, completed, missed
- Provide links to notes artifacts for completed ceremonies
- List upcoming ceremonies for planning
- Show "No notes yet" for completed ceremonies without linked notes

**Story 4.3 (Deterministic Charts Generation)**:
- Generate burn-down chart deterministically from sprint data
- Generate velocity chart from completed story data
- Update charts based on deterministic calculations
- Show "Not enough data yet" when insufficient data exists to compute a chart
