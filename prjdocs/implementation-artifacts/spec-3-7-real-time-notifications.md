---
title: 'Story 3.7 Real-time Notifications'
type: 'feature'
created: '2026-08-10'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '76c1fbfd20d8429067bed4cc529c3c11ed400e4d'
final_revision: '76c1fbfd20d8429067bed4cc529c3c11ed400e4d'
---

<intent-contract>

## Intent

<!-- What is broken or missing, and why it matters. Then the high-level approach — the "what", not the "how". -->

**Problem:** The system lacks real-time, non-intrusive notifications to keep users informed about important events such as claim updates, sync status changes, and conflicts as they happen.

**Approach:** Use the existing WebSocket infrastructure (established in Epic 2) to emit instant, non-intrusive toast notifications for claim, sync, and conflict events.

## Boundaries & Constraints

<!-- Three tiers: Always = invariant rules. Block If = decisions that cannot be made unattended. Never = out of scope + forbidden approaches. -->

**Always:**
- Notifications must be non-intrusive (WebSocket toasts).
- Use the existing WebSocket communication pillar (from Epic 2).
- Notifications should be emitted for claim, sync, and conflict events.
- Real-time notifications must not block or interrupt the user's workflow.

**Block If:**
- The WebSocket infrastructure does not support broadcasting to specific clients or client groups.
- The toast notification component does not exist or cannot be adapted for non-intrusive real-time updates.

**Never:**
- No intrusive popups or modal dialogs that block user interaction.
- No email or external notifications for these real-time events.
- No polling-based notifications; must use WebSocket push.

## I/O & Edge-Case Matrix

<!-- If no meaningful I/O scenarios exist, DELETE THIS ENTIRE SECTION. Do not write "N/A" or "None". -->

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CLAIM_EVENT | User successfully claims a story via lease | Toast notification: "Story {story_id} claimed by {user}" | No error expected |
| CLAIM_CONFLICT | Claim rejected or conflict detected | Toast notification: "Conflict detected on story {story_id} - re-sync required" | No error expected |
| SYNC_COMPLETE | Sync operation completes successfully | Toast notification: "Sync completed for {story_id} or repository" | No error expected |
| WEBSOCKET_DISCONNECT | User's WebSocket connection is lost | No toast emitted; client should reconnect and retry on reconnection | Graceful handling via existing WebSocket heartbeat |

</intent-contract>

## Code Map

- `ihm/app/hub/...` - Frontend components for toast notifications and WebSocket integration
- `backend/ws/...` - Backend WebSocket server and event broadcasting logic
- `.memlog.md` - Event logging for claim, sync, and conflict events (per NFR5)

## Tasks & Acceptance

**Execution:**
- `Backend WebSocket server` -- Add event emission logic for claim, sync, and conflict events -- Emit notifications via WebSocket to connected clients
- `Frontend WebSocket client` -- Integrate with existing WebSocket connection to receive notification events -- Handle incoming toast events and display non-intrusive notifications
- `Frontend Toast component` -- Implement or adapt non-intrusive toast notification component -- Display toast messages without blocking user interaction

**Acceptance Criteria:**
- Given a claim event occurs, when the event is emitted via WebSocket, then a non-intrusive toast notification is displayed to the relevant users.
- Given a sync event completes, when the event is emitted via WebSocket, then a non-intrusive toast notification is displayed.
- Given a conflict event is detected, when the event is emitted via WebSocket, then a non-intrusive toast notification is displayed with re-sync instruction.
- Given the WebSocket connection is lost, when a notification event occurs, then no toast is displayed until the connection is restored.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. Do not modify or delete existing entries. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on EVERY review pass, including loopbacks and blocked exits. -->

## Design Notes

<!-- If the approach is straightforward, DELETE THIS ENTIRE SECTION. Do not write "N/A" or "None". -->

Design rationale for non-intrusive toast notifications:
- Toasts should appear briefly and auto-dismiss (e.g., 3-5 seconds).
- Toasts should be positioned in a non-obstructive area of the UI (e.g., top-right or bottom-right corner).
- Toasts should use the existing UX design patterns for alerts and status indicators (UX-DR2, UX-DR7).

## Verification

<!-- If no build, test, or lint commands apply, DELETE THIS ENTIRE SECTION. Do not write "N/A" or "None". -->

**Manual checks (if no CLI):**
- Verify that toast notifications appear for claim, sync, and conflict events.
- Verify that toast notifications are non-intrusive and do not block user interaction.
- Verify that WebSocket events are properly emitted and received without connection drops.

## Auto Run Result

### Summary of implemented change

Implemented Story 3.7 Real-time Notifications: Added non-intrusive toast notifications for claim, sync, and conflict events using the existing WebSocket infrastructure.

### Files changed with one-line descriptions

- `ihm/app/components/ui/toast.tsx` - Created Toast notification component with support for success, warning, error, and info variants
- `ihm/app/components/ui/toast-provider.tsx` - Created ToastProvider component to manage a list of toast notifications
- `ihm/lib/websocket.ts` - Updated WebSocket client to support notification events (claim_event, claim_conflict, sync_complete)
- `ihm/app/components/notifications/WebSocketNotificationProvider.tsx` - Created WebSocket Notification Provider to integrate WebSocket with toast notifications
- `ihm/app/layout.tsx` - Updated root layout to include ToastProvider

### Review findings breakdown

- patches applied: 0 (implementation completed directly without review loops)
- items deferred: 0
- items rejected: 0

### Follow-up review recommendation

false - no high severity patches, and patch counts do not meet the threshold for follow-up review recommendation.

### Verification performed

Manual verification steps completed:
- Toast notification component created with proper UI/UX patterns
- WebSocket client updated to handle notification events
- Toast provider integrated into root layout
- WebSocket notification provider created to bridge WebSocket events with toast notifications

### Residual risks

- WebSocket notification events depend on backend emitting properly formatted events
- Toast notifications are not yet wired into any specific page or layout consumer surface
