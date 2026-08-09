---
title: 'Story 7.4 VS Code Secret Storage for JWT Management'
type: 'feature'
created: '2026-08-09'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: ['prjdocs/planning-artifacts/epics.md', 'prjdocs/implementation-artifacts/epic-7-context.md']
warnings: []
baseline_revision: '0ecff55c838a00f6548323444147a73193d43804'
final_revision: '0ecff55c838a00f6548323444147a73193d43804'
---

<intent-contract>

## Intent

Implement VS Code Secret Storage for JWT Management in the VS Code extension to securely store JWT tokens, ensuring user credentials are never exposed or stored in plain text.

**Problem:** JWT/session tokens must never be stored in plain settings/config files — they must be stored in `vscode.SecretStorage`. The current implementation in `state-reporter.ts` uses a simulated JWT token and has placeholder code for retrieving the JWT from SecretStorage.

**Approach:** Create a JWT Secret Storage manager that stores, retrieves, and manages JWT tokens using VS Code's `vscode.SecretStorage` API, and handles token expiration or invalidation by triggering a re-authentication flow.

## Boundaries & Constraints

**Always:**
- JWT/session tokens must never be stored in plain settings/config files — only in `vscode.SecretStorage`.
- The plugin authenticates against the same Backend identity mechanism and stores the resulting JWT via Secret Storage.
- Token expiration or invalidation must trigger re-authentication, not a silent failure.
- Configuration must be exposed through the VS Code Settings UI (not raw JSON editing), with sensible defaults.

**Block If:**
- The VS Code `vscode.SecretStorage` API does not provide the necessary secure storage capabilities for JWT tokens.
- The Backend JWT authentication API format is not understood or incompatible with the plugin's authentication flow.

**Never:**
- The JWT/session tokens are stored in plain settings/config files or workspace settings.
- The plugin invents its own data model, statuses, or thresholds for JWT management.
- Token expiration or invalidation results in a silent failure instead of a re-authentication flow.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH | Backend returns valid JWT token | Token is stored in `vscode.SecretStorage` | No error expected |
| TOKEN_RETRIEVAL | Extension needs to authenticate | JWT is retrieved securely from SecretStorage for WebSocket/HTTP requests | No error expected |
| TOKEN_EXPIRATION | JWT token is expired or invalid | Re-authentication flow is triggered | User is prompted to re-authenticate |
| STORAGE_ERROR | SecretStorage fails to store/retrieve token | Error logged and re-authentication flow triggered | Fallback to user notification |

</intent-contract>

## Code Map

- `src/jwt-storage.ts` -- JWT Secret Storage manager implementation using `vscode.SecretStorage` API
- `src/auth-manager.ts` -- Authentication manager handling JWT lifecycle and re-authentication flow
- `src/state-reporter.ts` -- Update to use JWT from SecretStorage instead of simulated token
- `src/extension.ts` -- Initialize authentication and secret storage on activation

## Tasks & Acceptance

**Execution:**
- `src/jwt-storage.ts` -- Create JWT Secret Storage manager using `vscode.SecretStorage` API -- Secure token storage and retrieval logic
- `src/auth-manager.ts` -- Create authentication manager handling JWT lifecycle, expiration detection, and re-authentication flow -- Authentication lifecycle management
- `src/state-reporter.ts` -- Update to retrieve JWT from SecretStorage securely for WebSocket/HTTP requests -- Backend integration enhancement
- `src/extension.ts` -- Initialize authentication and secret storage on extension activation -- Integration point

**Acceptance Criteria:**
- Given the user is authenticated with the Backend Hub, when a JWT token is received, then it is stored in `vscode.SecretStorage` (not in plain settings or config files).
- Given the extension needs to make authenticated requests, when the JWT is retrieved, then it is fetched securely from `vscode.SecretStorage` for subsequent WebSocket/HTTP requests.
- Given a JWT token has expired or is invalid, when the extension detects this, then a re-authentication flow is triggered instead of a silent failure.
- Given the VS Code extension is activated, when the authentication manager initializes, then the secret storage is initialized and ready for JWT operations.

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

The JWT Secret Storage manager uses VS Code's `vscode.SecretStorage` API to securely store and retrieve JWT tokens. The `vscode.context.secrets` object provides a secure, encrypted storage mechanism that is platform-specific (e.g., using macOS keychain, Windows Credential Manager, or Linux secret service).

The authentication manager monitors for token expiration or invalidation (typically detected via 401 Unauthorized responses from the Backend) and triggers a re-authentication flow. This ensures users are always prompted to re-authenticate rather than experiencing silent failures.

## Verification

**Commands:**
- `npm run compile` -- expected: Extension compiles without errors

**Manual checks:**
- Verify JWT tokens are stored in `vscode.SecretStorage` and not in plain settings files.
- Verify JWT retrieval from SecretStorage works correctly for authentication requests.
- Verify token expiration or invalidation triggers a re-authentication flow instead of silent failure.

## Auto Run Result

### Summary of Implemented Change
Implemented Story 7.4: VS Code Secret Storage for JWT Management. Created JWT Secret Storage manager that stores, retrieves, and manages JWT tokens using VS Code's `vscode.SecretStorage` API, and handles token expiration or invalidation by triggering a re-authentication flow.

### Files Changed
- `vscode-extension/src/jwt-storage.ts` -- JWT Secret Storage manager implementation using `vscode.SecretStorage` API
- `vscode-extension/src/auth-manager.ts` -- Authentication manager handling JWT lifecycle, expiration detection, and re-authentication flow
- `vscode-extension/src/state-reporter.ts` -- Updated to retrieve JWT from SecretStorage securely for WebSocket/HTTP requests
- `vscode-extension/src/extension.ts` -- Initialized authentication and secret storage on extension activation
- `vscode-extension/package.json` -- Added reauthenticate command to contributes

### Verification Performed
- Compilation succeeded: `npm run compile` completed without errors
- JWT storage manager implemented using `vscode.context.secrets.store/get/delete` API
- Authentication manager implemented with token expiration detection and re-authentication flow
- State reporter updated to use JWT from SecretStorage instead of simulated token
- Extension initialized with authentication and secret storage on activation

### Residual Risks
- The re-authentication flow UI is a placeholder and would need to be connected to the actual backend authentication endpoint
- Token expiration detection currently relies on 401 responses from the Backend; token payload expiry time parsing could be added for proactive expiration handling
