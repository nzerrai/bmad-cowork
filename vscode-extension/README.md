# BMad Portal (VS Code Extension)

IDE-native access to the BMad Portal Backend Hub — the same Backend used by the Client Python agent and the IHM dashboard. This extension reports local Git/repo state on a configurable poll and reproduces the HUB dashboards (repo state, claims, risk signals) inside VS Code Web Views. It is an additive interface: it consumes the existing Backend WebSocket/REST APIs and never invents its own data model.

This story (7.1) scaffolds the extension's contribution points and a minimal `activate()`. The features listed below as "later story" are placeholders only.

## Commands

| Command ID | Title | Status |
|---|---|---|
| `bmadPortal.showDashboard` | BMad Portal: Show Dashboard | Opens the sidebar dashboard view container |
| `bmadPortal.showSuggestedFeatures` | BMad Portal: Show Suggested Features | Placeholder — real claims/role-based suggestions ship in Story 7.7 |

## Settings (`bmadPortal.*`)

| Setting | Type | Default | Description |
|---|---|---|---|
| `bmadPortal.backendHubUrl` | string | `http://localhost:8000` | Base URL of the BMad Portal Backend Hub this extension connects to (WebSocket/REST). |
| `bmadPortal.repoPollingIntervalSec` | number | `300` | Interval, in seconds, at which the extension polls local repo state and reports it to the Backend Hub. Real polling engine ships in Story 7.2. |
| `bmadPortal.authMethod` | string | `jwt` | Authentication method used to obtain the session token stored in VS Code Secret Storage. Real Secret Storage flow ships in Story 7.4. |
| `bmadPortal.dashboardDisplayMode` | string | `sidebarView` | How the BMad Portal dashboard is displayed. |
| `bmadPortal.enableEventDrivenPolling` | boolean | `true` | When true, a detected local Git event triggers an immediate state upload without disrupting the next scheduled poll. Real override ships in Story 7.3. |
| `bmadPortal.dashboardRefreshIntervalSec` | number | `60` | Interval, in seconds, at which dashboard Web View widgets refresh their data from the Backend Hub. Real widgets ship in Story 7.6. |

All settings are configurable through the native VS Code Settings UI (Settings → Extensions → BMad Portal) — no raw JSON editing required.

## Views

A dedicated **BMad Portal** activity-bar container hosts a **Dashboard** webview view (`bmadPortal.dashboardView`). It currently renders a placeholder message; the navigation arborescence (Dashboard Overview, My Claims, Risk Signals, Sprint Status) and live widgets land in Stories 7.5/7.6.

## Status bar

A status bar item ("BMad Portal") appears at activation and runs the `bmadPortal.showDashboard` command when clicked. `package.json` has no stable contribution point for status bar items, so it is created programmatically in `activate()` — the standard, stable approach used by published extensions.

## Local development

From `vscode-extension/`:

```bash
npm install
npm run compile   # tsc -> out/extension.js
npm run lint       # eslint src --max-warnings=0
npm test           # asserts package.json's declared contributions/defaults
npm run package    # vsce package -> a local, installable .vsix
```

To run/debug the extension itself, open this folder in VS Code and press `F5` (Extension Development Host). Confirm the status bar item appears and the BMad Portal activity-bar icon opens the placeholder dashboard view with no console errors.

To install the packaged `.vsix` directly: `code --install-extension bmad-portal-vscode-<version>.vsix`.
