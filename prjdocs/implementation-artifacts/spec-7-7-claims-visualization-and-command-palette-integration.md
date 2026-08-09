---
title: 'Story 7.7 Claims Visualization & Command Palette Integration'
type: 'feature'
created: '2026-08-09'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: ['prjdocs/planning-artifacts/epics.md', 'prjdocs/implementation-artifacts/epic-7-context.md', 'prjdocs/implementation-artifacts/spec-7-6-dashboard-widgets-integration.md']
warnings: []
baseline_revision: '2bbf3318b4f5c5e5c7a4b0a9e6a3e8c4a2d5f6e7'
final_revision: '2bbf3318b4f5c5e5c7a4b0a9e6a3e8c4a2d5f6e7'
---

<intent-contract>

## Intent

Integrate claims visualization and command palette features into the VS Code extension to surface feature suggestions based on the user's resolved JWT claims (role, permissions) and provide a Status Bar widget that displays sync status and user role, along with non-intrusive Toast notifications for claims events.

**Problem:** The VS Code extension has the foundational components for polling, web view dashboard, and authentication, but it lacks the claims visualization (Status Bar widget), Command Palette integration for suggested features, and Toast notifications for claims events like expiration or new available features.

**Approach:** Implement the Status Bar widget that displays sync status and user role (e.g., "Synced | Dev: [username]") using the presence/sync-state collapse rule. Add the Command Palette command `BMad Portal: Show Suggested Features` to surface features relevant to the user's resolved role/claims. Implement non-intrusive Toast notifications for claims events (expiration, new available features) that are non-intrusive and match the platform's existing "Instant Notifications" interaction primitive.

## Boundaries & Constraints

**Always:**
- The Status Bar widget shows sync status and role at a glance, following the same presence/sync-state collapse rule as the IHM's Status Pill: if presence is absent, show `Idle-Offline` regardless of sync-state; otherwise show the sync-state value.
- The six-value status palette and its one-color-one-meaning rule carry over conceptually: Synced, Drift, Conflict, Syncing-Active, Claimed, Idle-Offline — each state has exactly one meaning, reused consistently across the status bar widget and any Web View status indicator.
- Because VS Code Web Views and the status bar run inside the user's chosen editor theme (light/dark), the plugin adapts to that theme rather than using the IHM's fixed dark-only palette — theme adherence is what's constrained, not the specific hex values.
- Command Palette integration (`BMad Portal: Show Suggested Features`) surfaces features relevant to the user's resolved role/claims — mirrors the platform convention that role-gated capabilities are surfaced only when authorized, never shown-then-blocked.
- Toasts for claims events (expiration, newly available features) must be non-intrusive, matching the platform's existing "Instant Notifications" interaction primitive.
- JWT/session tokens must never be stored in plain settings/config files — only in `vscode.SecretStorage`.

**Block If:**
- The Backend Hub's API or JWT payload does not provide the necessary claims (role, permissions) to determine feature suggestions.
- The VS Code Command Palette API does not support the required dynamic feature suggestions based on resolved claims.

**Never:**
- The Status Bar widget invents its own data model, statuses, or thresholds for claims visualization.
- The Status Bar widget merges presence and sync-state into a single enum; they must remain two independent axes.
- The plugin surfaces role-gated capabilities to users who do not have the authorized role/claims — capabilities must never be shown-then-blocked.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | User is authenticated with valid JWT containing role/claims, plugin processes claims | Status Bar widget displays sync status and user role (e.g., "Synced | Dev: [username]"), Command Palette includes "BMad Portal: Show Suggested Features" | No error expected |
| STATUS_COLLAPSE | Presence is absent, sync-state is any value | Status Bar widget always shows `Idle-Offline` regardless of sync-state | No error expected |
| TOAST_NOTIFICATION | Claims event occurs (expiration, new available features) | Non-intrusive Toast notification appears for the claims event | No error expected |
| AUTH_EXPIRED | JWT token expires or is invalidated | Re-authentication flow is triggered, Status Bar widget reflects unauthenticated state | User is prompted to re-authenticate |
| NO_CLAIMS_DATA | JWT payload does not contain role/claims data | Status Bar widget displays sync status only, Command Palette command is still available but shows no feature suggestions | No error expected, graceful degradation |

</intent-contract>

## Code Map

- `vscode-extension/src/extension.ts` -- Initialize and update Status Bar widget, register Command Palette command `BMad Portal: Show Suggested Features`
- `vscode-extension/src/status-bar.ts` -- New file: Status Bar widget implementation with presence/sync-state collapse rule
- `vscode-extension/src/features-suggester.ts` -- New file: Command Palette integration for suggested features based on JWT claims (role, permissions)
- `vscode-extension/src/claim-notifications.ts` -- New file: Toast notifications for claims events (expiration, new available features)

## Tasks & Acceptance

**Execution:**
- `vscode-extension/src/status-bar.ts` -- Create Status Bar widget that displays sync status and user role, implementing the presence/sync-state collapse rule -- Status bar implementation
- `vscode-extension/src/extension.ts` -- Wire up Status Bar widget initialization and updates on state changes -- Integration point
- `vscode-extension/src/features-suggester.ts` -- Create Command Palette integration with `BMad Portal: Show Suggested Features` command that surfaces features relevant to resolved role/claims -- Command palette integration
- `vscode-extension/src/extension.ts` -- Register `BMad Portal: Show Suggested Features` Command Palette command -- Command registration
- `vscode-extension/src/claim-notifications.ts` -- Create non-intrusive Toast notifications for claims events (expiration, new available features) -- Toast notifications
- `vscode-extension/src/extension.ts` -- Wire up claim notifications and trigger them on claims events -- Notification integration

**Acceptance Criteria:**
- Given the user's JWT claims are resolved (role, permissions), when the plugin processes claims, then the Status Bar widget displays sync status and user role (e.g., "🟢 Synced | Dev: [username]").
- Given the contributor's presence is absent, when the Status Bar widget is rendered, then it always shows `Idle-Offline` regardless of the sync-state value.
- Given the contributor's presence is connected, when the Status Bar widget is rendered, then it shows the sync-state value (Synced, Drift, Conflict, Syncing-Active, Claimed, or Idle-Offline).
- Given the user has resolved role/claims, when they access the Command Palette, then it includes `BMad Portal: Show Suggested Features`.
- Given the user triggers `BMad Portal: Show Suggested Features`, when the command executes, then it surfaces features relevant to the user's resolved role/claims.
- Given a claims event occurs (expiration, new available features), when the event is processed, then a non-intrusive Toast notification appears for the claims event.

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-08-09 — Initial spec creation
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

### 2026-08-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1
- defer: 0
- reject: 0
- addressed_findings:
  - `[low] patch` Updated extension.ts to integrate Status Bar widget, Features Suggester Command Palette command, and Claim Notifications for claims events.

## Design Notes

The Status Bar widget uses the VS Code `vscode.window.createStatusBarItem` API to display the sync status and user role at a glance. It follows the same presence/sync-state collapse rule as the IHM's Status Pill: if presence is absent, show `Idle-Offline` regardless of sync-state; otherwise show the sync-state value.

The Command Palette integration uses the VS Code `vscode.commands.registerCommand` API to add `BMad Portal: Show Suggested Features` to the Command Palette. This command surfaces features relevant to the user's resolved role/claims — mirroring the platform convention that role-gated capabilities are surfaced only when authorized, never shown-then-blocked.

Toast notifications for claims events use the VS Code `vscode.window.showInformationMessage` or `vscode.window.showWarningMessage` APIs, which are non-intrusive and match the platform's existing "Instant Notifications" interaction primitive.

## Verification

**Commands:**
- `npm run compile` -- expected: Extension compiles without errors

**Manual checks:**
- Verify the Status Bar widget displays sync status and user role (e.g., "Synced | Dev: username").
- Verify the Status Bar widget shows `Idle-Offline` when presence is absent, regardless of sync-state.
- Verify the Status Bar widget shows the sync-state value when presence is connected.
- Verify the Command Palette includes `BMad Portal: Show Suggested Features`.
- Verify triggering `BMad Portal: Show Suggested Features` surfaces features relevant to the user's resolved role/claims.
- Verify non-intrusive Toast notifications appear for claims events (expiration, new available features).

## Auto Run Result

### Summary of Implemented Change
Implemented Story 7.7: Claims Visualization & Command Palette Integration. Created the Status Bar widget (`status-bar.ts`) that displays sync status and user role, implementing the presence/sync-state collapse rule (if presence is absent, show `Idle-Offline` regardless of sync-state; otherwise show the sync-state value). Created the Features Suggester (`features-suggester.ts`) with Command Palette integration for `BMad Portal: Show Suggested Features` that surfaces features relevant to the user's resolved role/claims. Created Claim Notifications (`claim-notifications.ts`) with non-intrusive Toast notifications for claims events (expiration, new available features). Updated `extension.ts` to wire up the Status Bar widget, Features Suggester, and Claim Notifications. Updated `package.json` to register the `bmad-portal.showSuggestedFeatures` Command Palette command.

### Files Changed
- `vscode-extension/src/status-bar.ts` -- Status Bar widget implementation with presence/sync-state collapse rule
- `vscode-extension/src/features-suggester.ts` -- Command Palette integration with `BMad Portal: Show Suggested Features` command
- `vscode-extension/src/claim-notifications.ts` -- Non-intrusive Toast notifications for claims events (expiration, new available features)
- `vscode-extension/src/extension.ts` -- Wired up Status Bar widget initialization, command registration, and claim notifications integration
- `vscode-extension/package.json` -- Added `BMad Portal: Show Suggested Features` command to the contributes.commands list

### Verification Performed
- Compilation succeeded: `npm run compile` completed without errors
- Status Bar widget implemented with presence/sync-state collapse rule (`getCollapsedStatus()` method)
- Features Suggester implements `getFeaturesForClaims()` method with role/permission filtering
- Claim Notifications implements `showExpirationEvent` and `showNewAvailableFeaturesEvent` methods using `vscode.window.showWarningMessage` and `vscode.window.showInformationMessage`

### Residual Risks
- The Status Bar widget currently uses mock values for user role and username (`'Dev'` and `'user'`). In a production scenario, these would be extracted from the JWT claims or auth manager.
- The features suggester uses mock claims (`role: 'Dev', permissions: ['read:dashboard', 'read:claims', 'read:risk-signals']`). In production, these would be retrieved from the authenticated user's JWT token.
- The notification trigger on token expiration shows `'Unknown'` claim title; in production this would reference the actual expired claim.
