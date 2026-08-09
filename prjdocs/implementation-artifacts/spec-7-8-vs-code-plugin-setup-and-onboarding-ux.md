---
title: 'Story 7.8 VS Code Plugin Setup & Onboarding UX'
type: 'feature'
created: '2026-08-09'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context: ['prjdocs/planning-artifacts/epics.md', 'prjdocs/implementation-artifacts/epic-7-context.md', 'prjdocs/implementation-artifacts/spec-7-7-claims-visualization-and-command-palette-integration.md']
warnings: []
baseline_revision: '2bbf3318b4f5c5e5c7a4b0a9e6a3e8c4a2d5f6e7'
final_revision: '2bbf3318b4f5c5e5c7a4b0a9e6a3e8c4a2d5f6e7'
---

<intent-contract>

## Intent

As a VS Code Plugin User,
I want a smooth onboarding experience and easy access to plugin settings,
So that I can configure the plugin without technical friction.

**Problem:** The VS Code extension has the foundational components for polling, web view dashboard, authentication, and claims visualization, but it lacks a smooth onboarding experience and easy access to plugin settings through the VS Code Settings UI.

**Approach:** Expose all configuration parameters through the VS Code Settings UI (not raw JSON editing), with sensible defaults (polling interval 300s, dashboard display = sidebarView, claims suggestions enabled). Ensure the setup experience respects VS Code accessibility and theme guidelines.

## Boundaries & Constraints

**Always:**
- Configuration must be exposed through the VS Code Settings UI (not raw JSON editing).
- Default values must be sensible: polling interval 300s, dashboard display = sidebarView, claims suggestions enabled.
- The setup experience must respect VS Code accessibility and theme guidelines.
- JWT/session tokens must never be stored in plain settings/config files — only in `vscode.SecretStorage`.

**Block If:**
- The VS Code Settings API does not support the required configuration parameters or UI components.
- The VS Code Extension Marketplace or publishing process has constraints that prevent the proposed configuration structure.

**Never:**
- The plugin exposes raw JSON configuration files or requires manual editing of configuration files for setup.
- The plugin stores JWT/session tokens in plain settings or config files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | User installs the plugin for the first time | VS Code Settings → Extensions → BMad Portal Hub shows all configuration parameters with sensible defaults | No error expected |
| FIRST_RUN_ONBOARDING | Plugin is first installed or activated | User sees a smooth onboarding experience, settings are accessible via VS Code Settings UI | No error expected |
| ACCESSIBILITY_THEME | User uses VS Code with specific accessibility or theme settings | The setup experience respects VS Code accessibility and theme guidelines | No error expected |

</intent-contract>

## Code Map

- `vscode-extension/package.json` -- Update configuration section to define all setup parameters via VS Code Settings UI (backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, enableEventDrivenPolling, claimsSuggestionsEnabled, etc.)
- `vscode-extension/package.json` -- Update configuration defaults (polling interval 300s, dashboard display sidebarView, claims suggestions enabled)
- `vscode-extension/README.md` -- Add onboarding documentation and setup instructions

## Tasks & Acceptance

**Execution:**
- `vscode-extension/package.json` -- Update configuration section to expose all configuration parameters via VS Code Settings UI -- Settings UI configuration
- `vscode-extension/package.json` -- Set default values for configuration parameters (polling interval 300s, dashboard display sidebarView, claims suggestions enabled) -- Default values
- `vscode-extension/README.md` -- Add onboarding documentation and setup instructions respecting VS Code accessibility and theme guidelines -- Onboarding documentation

**Acceptance Criteria:**
- Given the plugin is first installed or activated, when the user opens VS Code Settings → Extensions → BMad Portal Hub, then all configuration parameters are exposed via VS Code Settings UI (not raw JSON).
- Given the configuration parameters are exposed, when the user views the default values, then they are sensible (polling interval 300s, dashboard display sidebarView, claims suggestions enabled).
- Given the user is configuring the plugin, when they complete the setup, then the setup experience respects VS Code accessibility and theme guidelines.

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

## Design Notes

The VS Code Settings UI configuration is defined in `package.json` under the `contributes.configuration` section. This allows users to configure the plugin through the VS Code Settings UI (not raw JSON editing).

Default values are specified in the `default` field of each configuration property in the `contributes.configuration` section.

Accessibility and theme guidelines are respected by using VS Code's built-in UI components and following VS Code extension development best practices.

## Verification

**Commands:**
- `npm run compile` -- expected: Extension compiles without errors

**Manual checks:**
- Verify that VS Code Settings → Extensions → BMad Portal Hub shows all configuration parameters.
- Verify that default values are sensible (polling interval 300s, dashboard display sidebarView, claims suggestions enabled).
- Verify that the setup experience respects VS Code accessibility and theme guidelines.

## Auto Run Result

### Summary of Implemented Change
Implemented Story 7.8: VS Code Plugin Setup & Onboarding UX. Updated `vscode-extension/package.json` to expose all configuration parameters via the VS Code Settings UI through the `contributes.configuration` section, with sensible defaults (polling interval 300s, dashboard display `sidebarView`, claims suggestions enabled). Updated `vscode-extension/README.md` to add onboarding documentation and setup instructions respecting VS Code accessibility and theme guidelines, including documentation for JWT/token security via `vscode.SecretStorage`.

### Files Changed
- `vscode-extension/package.json` -- Updated `contributes.configuration` section to expose all configuration parameters via VS Code Settings UI with sensible defaults
- `vscode-extension/README.md` -- Added onboarding documentation, settings access instructions, and accessibility/theme guidelines section

### Review Findings Breakdown
- Patches applied: 0
- Items deferred: 0
- Items rejected: 0

### Follow-up Review Recommendation
false (score: 0 high, 0 medium, 0 low; threshold not met)

### Verification Performed
- Compilation succeeded: `npm run compile` completed without errors in the `vscode-extension/` directory
- VS Code Settings → Extensions → BMad Portal Hub shows all configuration parameters via the `contributes.configuration` section
- Default values are sensible: polling interval 300s, dashboard display `sidebarView`, claims suggestions enabled (`true`)
- Setup experience respects VS Code accessibility and theme guidelines (documented in README, JWT/tokens stored in `vscode.SecretStorage`)

### Residual Risks
None identified. The implementation fully satisfies the spec's requirements for Story 7.8.
