---
name: "Admin Dashboard - Connected Users and Request Stats"
description: "Admin dashboard section displaying connected users sorted by repository, with request counts broken down by request type."
status: final
updated: 2026-08-12
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
  data-table:
    radius: '{rounded.md}'
    background: '{colors.surface}'
    divider: '{colors.border-soft}'
  skeleton-table-row:
    radius: '{rounded.md}'
    background: '{colors.surface-elevated}'
  reconnecting-toast:
    radius: '{rounded.sm}'
    background: '{colors.surface-elevated}'
    accent: '{colors.info}'
---

# DESIGN.md - Admin Dashboard - Connected Users and Request Stats

## Brand & Style
**Theme:** Modern Command.
**Identity:** Professional, high-tech, data-driven administrative interface. Evokes centralized monitoring and control over distributed systems.
**Mode:** Dark-only, consistent with the BMad Portal (Hub) design system.

## Colors
**Base:** `{colors.background}` Deep Navy / Midnight. Surfaces step up in two layers of elevation — `{colors.surface}` for primary cards, `{colors.surface-elevated}` for nested or active panels — never more than two steps, so the hierarchy stays legible at a glance. `{colors.surface-inset}` marks a third, recessed layer for content nested *inside* an elevated panel.

**Text:** `{colors.text-primary}` for primary content, `{colors.text-secondary}` for labels and secondary values, `{colors.text-faint}` for timestamps and de-emphasized metadata.

**Accent Palette (Operational):** each status color carries exactly one meaning, used nowhere else in the UI.
- `Success`: `{colors.success}` Emerald.
- `Warning`: `{colors.warning}` Amber.
- `Error`: `{colors.error}` Rose.
- `Info`: `{colors.info}` Sky Blue / Cyan.
- `Action`: `{colors.action}` Indigo / Violet.
- `Neutral`: `{colors.neutral}` Slate.

## Typography
**Primary (UI):** `{typography.ui}` — Inter, locked (one face, no ambiguity). Headings use `{typography.heading}`; uppercase section labels use `{typography.ui-label}`, sized down with letter-spacing for scannability.
**Secondary (Data/Code):** `{typography.data}` — JetBrains Mono, for numeric values and technical data. Numeric values (request counts) are always set with tabular figures so columns of numbers align.

## Layout & Spacing
**System:** Dashboard-driven modular grid on the spacing scale (4px base unit: 4/8/12/16/20/24/32/40px; see `spacing` frontmatter for exact steps).
**Pattern:** Component cards with subtle depth and `{rounded.md}` corners separate layers of information. Card interior padding steps from `{spacing.4}` to `{spacing.6}` depending on density; never below `{spacing.3}`.

## Elevation & Depth
**Approach:** Layered surface design. Subtle shadows and dark-mode elevation create hierarchy between the background, the command cards, and interactive elements.

## Shapes
**Standard:** `{rounded.sm}` for compact chips and nested rows, `{rounded.md}` for cards and panels.

## Components
**Key Elements:**
- **Data-heavy Tables** (`components.data-table`) — high-density rows with inline actions and color-coded status cells; used for the connected users list with columns for User Email, User ID, Repository, and request counts by type.
- **Skeleton Table Rows** (`components.skeleton-table-row`) — placeholder rows shown while data is loading, matching the final table layout.
- **Reconnecting Toast** (`components.reconnecting-toast`) — thin, full-width toast indicator for backend connectivity issues; `{colors.info}` accent when reconnecting.

## Do's and Don'ts
- **DO:** Use tabular numerals for all request count columns to ensure proper alignment.
- **DO:** Ensure high legibility for technical data (monospace, tabular numerals).
- **DO:** Give the table proper keyboard navigation support with tab order following visual reading order.
- **DON'T:** Use overly decorative or consumer-centric "playful" elements.
- **DON'T:** Sacrifice data density for excessive whitespace (keep it "Command Center" focused).
