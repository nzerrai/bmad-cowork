---
name: "BMad Portal (Hub)"
description: "High-performance Command Center IHM for a distributed BMad platform — unifies artifact health, team sync, and sprint tracking across a three-tier (Client / Backend / IHM) architecture."
status: final
updated: 2026-08-06
colors:
  background: '#0A1120'
  surface: '#121B30'
  surface-elevated: '#182544'
  surface-inset: '#1C2B4D'
  border: '#24314F'
  border-soft: '#1B2843'
  text-primary: '#E7ECF6'
  text-secondary: '#96A3C2'
  text-faint: '#5F6D8F'
  success: '#34D399'
  warning: '#F5A524'
  error: '#FB6478'
  info: '#38BDF8'
  action: '#8B8CF8'
  neutral: '#7885A3'
typography:
  heading:
    fontFamily: 'Inter'
    fontSize: '20px'
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: '-0.01em'
  ui:
    fontFamily: 'Inter'
    fontSize: '13.5px'
    fontWeight: '500'
    lineHeight: '1.4'
  ui-label:
    fontFamily: 'Inter'
    fontSize: '12px'
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: '0.08em'
  data:
    fontFamily: 'JetBrains Mono'
    fontSize: '12.5px'
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 8px
  md: 12px
  full: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
components:
  status-pill:
    radius: '{rounded.full}'
    fontSize: '{typography.ui-label.fontSize}'
    fontWeight: '{typography.ui-label.fontWeight}'
  identity-header:
    radius: '{rounded.md}'
    accent: '{colors.action}'
  alert-banner:
    radius: '{rounded.sm}'
    border: '{colors.error}'
  data-table:
    radius: '{rounded.md}'
    background: '{colors.surface}'
    divider: '{colors.border-soft}'
  activity-feed:
    divider: '{colors.border-soft}'
  ai-draft-card:
    border: '{colors.action}'
    radius: '{rounded.md}'
  real-time-status-bar:
    background: '{colors.surface}'
    accent: '{colors.info}'
  contributor-detail-panel:
    gap: '{spacing.4}'
---

# DESIGN.md - BMad Portal (Hub)

## Brand & Style
**Theme:** Modern Command.
**Identity:** Professional, high-tech, visualizes "Deterministic Truth" and "Distributed Control". Evokes a sense of centralized intelligence monitoring a distributed network.
**Mode:** Dark-only, deliberately. The Command Center identity is built around a "centralized intelligence at night" read — a light theme isn't planned, and wouldn't carry the same authority.

## Colors
**Base:** `{colors.background}` Deep Navy / Midnight. Surfaces step up in two layers of elevation — `{colors.surface}` for primary cards, `{colors.surface-elevated}` for nested or active panels (a claimed row, an expanded section) — never more than two steps, so the hierarchy stays legible at a glance. `{colors.surface-inset}` marks a third, recessed layer for content nested *inside* an elevated panel (e.g., a chip inside a claimed card).

**Text:** `{colors.text-primary}` for primary content, `{colors.text-secondary}` for labels and secondary values, `{colors.text-faint}` for timestamps and de-emphasized metadata.

**Accent Palette (Operational):** each status color carries exactly one meaning, used nowhere else in the UI.
- `Success (Synced)`: `{colors.success}` Emerald.
- `Warning (Drift)`: `{colors.warning}` Amber.
- `Error (Risk/Conflict)`: `{colors.error}` Rose.
- `Info (Syncing/Active)`: `{colors.info}` Sky Blue / Cyan.
- `Action (Claimed/Locked)`: `{colors.action}` Indigo / Violet.
- `Neutral (Idle/Offline)`: `{colors.neutral}` Slate.

**Context Distinction:**
- `Local Context`: Muted — `{colors.neutral}` and `{colors.text-secondary}`, representing the local agent environment.
- `Remote Context`: Vibrant — `{colors.info}` and `{colors.action}` at full saturation with a soft glow (see Elevation), representing active Hub/WebSocket presence.

## Typography
**Primary (UI):** `{typography.ui}` — Inter, locked (one face, no ambiguity). Headings use `{typography.heading}`; uppercase section labels use `{typography.ui-label}`, sized down with letter-spacing for scannability.
**Secondary (Data/Code):** `{typography.data}` — JetBrains Mono, for Git hashes, file paths, branch names, and terminal-style logs. Numeric values (counts, diffs) are always set with tabular figures so columns of numbers align.

> Note: HTML mocks previewed in a sandboxed environment may substitute a system-font stack for Inter/JetBrains Mono where webfont loading is restricted. Production implementation loads the named faces; the mock's approximation doesn't change the token.

## Layout & Spacing
**System:** Dashboard-driven modular grid on the spacing scale (4px base unit: 4/8/12/16/20/24/32/40px; see `spacing` frontmatter for exact steps).
**Pattern:** Component cards with subtle depth and `{rounded.md}` corners separate layers of information (Local Agent vs. Remote Hub). Card interior padding steps from `{spacing.4}` to `{spacing.6}` depending on density; never below `{spacing.3}`.

## Elevation & Depth
**Approach:** Layered surface design. Subtle shadows and dark-mode elevation create hierarchy between the background, the command cards, and interactive elements. Remote-context accents (`{colors.info}`, `{colors.action}`) get a soft outer glow (blurred box-shadow in the accent color, low opacity) to read as "live"; local-context elements never glow.

## Shapes
**Standard:** `{rounded.sm}` for compact chips and nested rows, `{rounded.md}` for cards and panels. `{rounded.full}` is reserved for status pills only, so a fully round shape stays a recognizable "this is a status" signal.

## Components
**Key Elements:**
- **Status Pill** (`components.status-pill`) — dot + label badge in one of the six accent colors; the dot carries a soft glow matching its color. Used anywhere a single-value status needs to be scannable inline: table cells, card headers, identity headers.
- **Identity Header** (`components.identity-header`) — avatar (initials on an `{colors.action}` gradient tile) + name + role; the standard way a person is introduced at the top of any per-person surface.
- **Alert Banner** (`components.alert-banner`) — tinted, bordered block in the relevant status color (typically `{colors.error}` or `{colors.warning}`), surfacing a single blocking condition above a panel's detail rows.
- **Data-heavy Tables** (`components.data-table`) — high-density rows with inline actions and color-coded status cells; the same row/divider/typography rules also render label/value pairs in non-tabular per-entity panels.
- **Activity/Event Feed** (`components.activity-feed`) — vertical, icon-led stream of platform events (Claims, Syncs, Commits, Conflicts), each entry timestamped in `{typography.data}`.
- **AI "Draft" Cards** (`components.ai-draft-card`) — dotted/translucent `{colors.action}` border for AI-proposed content, with explicit `[Review]` / `[Reject]` interaction before transition to "Commit" state.
- **Real-time Status Bar** (`components.real-time-status-bar`) — thin, full-width WebSocket connectivity indicator; `{colors.info}` when active, `{colors.neutral}` when idle.
- **Contributor Detail Panel** (`components.contributor-detail-panel`) — composition only, no bespoke visual rules beyond `{spacing.4}` gaps between sections: Identity Header + Status Pill + Alert Banner (conditional) + Data-heavy Tables + Activity Feed.

## Do's and Don'ts
- **DO:** Use color and elevation to distinguish "Local" vs "Remote" context.
- **DO:** Ensure high legibility for technical data (monospace, tabular numerals).
- **DO:** Prioritize visual feedback for real-time sync events.
- **DO:** Give every status pill and alert banner exactly one accent color, matched to `EXPERIENCE.md`'s State Patterns — never blend two status colors on one element.
- **DON'T:** Use overly decorative or consumer-centric "playful" elements.
- **DON'T:** Sacrifice data density for excessive whitespace (keep it "Command Center" focused).
- **DON'T:** Ship a new visual pattern for a single screen — check this Components list and extend it here first, rather than inventing one inside a mock.
