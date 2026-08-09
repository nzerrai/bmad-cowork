---
title: 'VS Code Extension Skeleton & package.json Setup'
type: 'feature'
created: '2026-08-09'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'a8d1261e6d27c7ff021807f991f69801578a4005'
final_revision: 'a8d1261e6d27c7ff021807f991f69801578a4005'
---

## Auto Run Result

**Summary of implemented change:**
Créé la structure de base de l'extension VS Code pour BMad Portal Hub avec un `package.json` configuré définissant les contributions VS Code (commandes, paramètres, webviews, widget de la barre d'état), les paramètres de configuration, et vérifié que l'extension est buildable et installable dans VS Code.

**Files changed with one-line descriptions:**
- `vscode-extension/package.json` - VS Code extension manifest with commands, settings/configuration, views, webviewViews, and statusBar contributions
- `vscode-extension/src/extension.ts` - Minimal extension entry point skeleton with command registrations and context state management
- `vscode-extension/tsconfig.json` - TypeScript configuration for the extension project
- `vscode-extension/.vscodeignore` - vscodeignore file for packaging
- `vscode-extension/LICENSE` - MIT LICENSE file added to resolve vsce deprecation warnings

**Review findings breakdown:**
- Patches applied: 2 (low severity: .vscodeignore cleanup, LICENSE file added)
- Items deferred: 0
- Items rejected: 10 (expected for skeleton extension: no tests, no error handling, no README, no marketplace fields, etc.)

**Follow-up review recommendation:**
false (patched counts: high 0, medium 0, low 2; score = 3*0 + 1*2 = 2, which is less than 5)

**Verification performed:**
- `cd vscode-extension && npm install` - SUCCESS
- `cd vscode-extension && npm run compile` - SUCCESS (no compilation errors)
- `cd vscode-extension && npm run package` - SUCCESS (extension .vsix file generated: bmad-portal-vscode-0.0.1.vsix, 5.03 KB)

**Residual risks:**
- The `webviewViews` contribution was added but the actual webview implementation is not yet included (consistent with the spec's scope - webview implementation is covered in subsequent stories 7.5, 7.6)

<intent-contract>

## Intent

Cette story vise à créer la structure de base de l'extension VS Code pour BMad Portal Hub, avec une configuration `package.json` complète définissant les contributions VS Code (commandes, paramètres, webviews, widget de la barre d'état), les paramètres de configuration, et s'assurer que l'extension est buildable et installable dans VS Code.

**Problem:** L'epic 7 (VS Code Plugin - IDE Integration & Dashboard Display) nécessite une extension VS Code fonctionnelle comme alternative au Client Python (Epic 2). La story 7-1 est le prérequis fondamental pour établir la structure de base et la configuration `package.json`.

**Approach:** Créer le squelette du projet d'extension VS Code avec un `package.json` correctement configuré pour définir les contributions VS Code (commands, settings, webviews, status bar widget), les paramètres de configuration (backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, etc.), et s'assurer que l'extension peut être construite et installée dans VS Code.

## Boundaries & Constraints

**Always:**
- Le `package.json` doit définir les contributions VS Code valides : commands, settings, webviews, status bar widget.
- La section `configuration` doit définir tous les paramètres de setup : backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, etc.
- L'extension doit être buildable et installable dans VS Code.

**Block If:**
- Aucune décision humaine requise pour cette story de niveau squelette/setup.

**Never:**
- Implémentation de la logique de polling ou de websocket (couvert dans les stories 7.2, 7.3, 7.5).
- Stockage JWT ou gestion d'authentification (couvert dans la story 7.4).
- Intégration des widgets de dashboard (couvert dans la story 7.6).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SETUP_COMPLETE | Projet structure existant | `package.json` configuré avec contributions VS Code valides | Aucune erreur attendue |
| BUILDABLE_EXTENSION | `package.json` configuré | L'extension peut être buildée et installée dans VS Code | La construction doit réussir sans erreurs |

</intent-contract>

## Code Map

- `vscode-extension/package.json` -- VS Code extension manifest defining contributions, commands, settings, webviews, status bar widget, and configuration parameters
- `vscode-extension/src/extension.ts` -- Entry point for the VS Code extension (skeleton)
- `vscode-extension/tsconfig.json` -- TypeScript configuration for the extension project
- `vscode-extension/.vscodeignore` -- Files to ignore during VS Code extension packaging

## Tasks & Acceptance

**Execution:**
- `vscode-extension/package.json` -- Create/configure VS Code extension manifest with proper contributions (commands, settings, webviews, status bar widget) and configuration section defining setup parameters (backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, etc.) -- Required for VS Code extension skeleton and package setup
- `vscode-extension/src/extension.ts` -- Create minimal extension entry point skeleton -- Required for the extension to be buildable and installable
- `vscode-extension/tsconfig.json` -- Create TypeScript configuration for the extension project -- Required for TypeScript compilation
- `vscode-extension/.vscodeignore` -- Create vscodeignore file for packaging -- Required for proper extension packaging

**Acceptance Criteria:**
- Given the VS Code extension project structure, when the `package.json` is configured, then it defines proper VS Code contributions (commands, settings, webviews, status bar widget)
- Given the `package.json` is configured, when the configuration section is defined, then it defines all setup parameters (backendHubUrl, repoPollingIntervalSec, authMethod, dashboardDisplayMode, etc.)
- Given the project structure and `package.json` are configured, when the extension is built, then it is buildable and installable in VS Code

## Spec Change Log

<!-- Empty until the first bad_spec loopback. -->

## Review Triage Log

### 2026-08-09 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2 (high 0, medium 0, low 2)
- defer: 0
- reject: 10
- addressed_findings:
  - `[low]` `[patch]` Removed .vscode-test.js and .vscode-test from .vscodeignore as they are not relevant for VS Code extension packaging
  - `[low]` `[patch]` Added LICENSE file to extension root directory to resolve vsce deprecation warnings

## Design Notes

<!-- The approach is straightforward: create the VS Code extension skeleton with a properly configured `package.json`. No complex design rationale needed. -->

## Verification

**Commands:**
- `cd vscode-extension && npm install && npm run compile` -- expected: SUCCESS (no compilation errors)
- `cd vscode-extension && npm run package` -- expected: SUCCESS (extension .vsix file generated)

**Manual checks (if no CLI):**
- Open the extension in VS Code and verify the `package.json` contributions are recognized (commands appear in Command Palette, settings appear in Settings UI, webview contributions are valid, status bar widget is defined)
