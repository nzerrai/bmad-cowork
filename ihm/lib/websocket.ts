/** Reconnecting WebSocket client for the Backend's `/ws` endpoint (Story 2.1).
 *
 * **Not wired into any page or layout.** There is no consumer surface today
 * — Story 3.3's Real-time Status Bar owns rendering `onStatusChange`'s
 * signal; mounting a connection with nothing observing/displaying it would
 * be dead-weight scope creep with no way to manually verify it did anything.
 */

import { getToken } from "./auth";

export type ConnectionStatus = "connecting" | "open" | "closed";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000/ws";

// Mirrors client/agent/realtime.py's constants exactly, in prose/values, so
// the two platforms don't silently diverge into different reconnect curves
// for what's supposed to be one behavior.
const HEARTBEAT_INTERVAL_MS = 10_000;
const BASE_BACKOFF_MS = 1_000;
const BACKOFF_FACTOR = 2;
const MAX_BACKOFF_MS = 30_000;

// The Backend's `/ws` route accepts the connection, then closes with 4401
// (unauthorized) or 4403 (forbidden origin) on rejection - a connection
// that reaches the OPEN state before closing exposes its real close code to
// browser JS via `CloseEvent.code` (unlike a rejection during the opening
// handshake itself, which browsers deliberately hide the reason for).
const FATAL_CLOSE_CODES = new Set([4401, 4403]);

// Defensive fallback for closes that happen before `onopen` ever fires
// (e.g. a network failure during the handshake, where no code is usable) -
// give up auto-reconnecting after this many in a row rather than retrying
// forever against a rejection that will never resolve itself.
const MAX_CONSECUTIVE_HANDSHAKE_FAILURES = 5;

export class RealtimeConnection {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = BASE_BACKOFF_MS;
  private stopped = true;
  private consecutiveHandshakeFailures = 0;

  constructor(private readonly onStatusChange: (status: ConnectionStatus) => void) {}

  connect(): void {
    this.stopped = false;
    this.open();
  }

  close(): void {
    this.stopped = true;
    this.clearHeartbeat();
    this.clearReconnect();
    this.socket?.close();
    this.socket = null;
  }

  private open(): void {
    this.onStatusChange("connecting");
    const token = getToken();
    if (token === null) {
      // No point opening a doomed connection - and no point auto-retrying
      // one either, since nothing changes until the user is authenticated.
      this.onStatusChange("closed");
      return;
    }
    const socket = new WebSocket(`${WS_BASE_URL}?token=${token}`);
    this.socket = socket;
    let opened = false;

    socket.onopen = () => {
      opened = true;
      this.consecutiveHandshakeFailures = 0;
      this.backoffMs = BASE_BACKOFF_MS;
      this.onStatusChange("open");
      this.startHeartbeat();
    };

    socket.onclose = (event: CloseEvent) => {
      this.clearHeartbeat();
      this.onStatusChange("closed");
      if (!opened) {
        this.consecutiveHandshakeFailures += 1;
      }
      if (this.stopped) {
        return;
      }
      if (FATAL_CLOSE_CODES.has(event.code)) {
        console.error(
          `RealtimeConnection: rejected (code ${event.code}) - not retrying; ` +
            "check the auth token and IHM origin configuration.",
        );
        return;
      }
      if (this.consecutiveHandshakeFailures >= MAX_CONSECUTIVE_HANDSHAKE_FAILURES) {
        console.error(
          "RealtimeConnection: giving up after repeated handshake failures - " +
            "check the auth token and IHM origin configuration.",
        );
        return;
      }
      this.scheduleReconnect();
    };
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.socket?.send(JSON.stringify({ type: "heartbeat" }));
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.random() * this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * BACKOFF_FACTOR, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
