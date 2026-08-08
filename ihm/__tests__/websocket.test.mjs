// I/O matrix tests for the reconnecting WebSocket client (Story 2.1, AC1/AC3).
// Plain node:test, not a component test — `RealtimeConnection` isn't a React
// component (mirrors smoke.test.mjs's shape, not artifacts.test.tsx's RTL
// shape). Node's built-in WebSocket global is version-dependent and jsdom
// (used elsewhere in this suite) doesn't provide one either, so this file
// hand-rolls a fake WebSocket class and assigns it to globalThis.WebSocket
// for the test's duration — no real network or server involved.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close(code = 1006, reason = "") {
    this.onclose?.({ code, reason });
  }
}
FakeWebSocket.instances = [];

globalThis.WebSocket = FakeWebSocket;

const { RealtimeConnection } = await import("../lib/websocket.ts");

beforeEach(() => {
  FakeWebSocket.instances = [];
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "test-token");
});

test("constructs the URL with ?token=<token> from getToken()", () => {
  const connection = new RealtimeConnection(() => {});
  connection.connect();

  assert.equal(FakeWebSocket.instances.length, 1);
  assert.match(FakeWebSocket.instances[0].url, /\?token=test-token$/);

  connection.close();
});

test("sends a heartbeat message on the configured interval", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });

  const connection = new RealtimeConnection(() => {});
  connection.connect();
  FakeWebSocket.instances[0].onopen();

  t.mock.timers.tick(10_000);
  t.mock.timers.tick(10_000);

  assert.deepEqual(FakeWebSocket.instances[0].sent, [
    JSON.stringify({ type: "heartbeat" }),
    JSON.stringify({ type: "heartbeat" }),
  ]);

  connection.close();
});

test("a new WebSocket is constructed after a backoff delay when the socket closes", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });

  const connection = new RealtimeConnection(() => {});
  connection.connect();
  const first = FakeWebSocket.instances[0];
  first.onopen();
  first.onclose({ code: 1006, reason: "" });

  assert.equal(FakeWebSocket.instances.length, 1, "no reconnect before the backoff delay elapses");

  // Base backoff is 1s with full jitter (delay in [0, 1000)ms) — ticking
  // past the upper bound guarantees the reconnect fires, without asserting
  // an exact (randomized) delay value.
  t.mock.timers.tick(1_000);

  assert.equal(FakeWebSocket.instances.length, 2, "expected reconnect attempted");

  connection.close();
});

test("onStatusChange fires connecting -> open -> closed -> connecting across connect/drop/reconnect", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });

  const statuses = [];
  const connection = new RealtimeConnection((status) => statuses.push(status));
  connection.connect();
  const first = FakeWebSocket.instances[0];
  first.onopen();
  first.onclose({ code: 1006, reason: "" });
  t.mock.timers.tick(1_000);

  assert.deepEqual(statuses, ["connecting", "open", "closed", "connecting"]);

  connection.close();
});

test("does not reconnect after a fatal close code (4401 unauthorized)", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });

  const connection = new RealtimeConnection(() => {});
  connection.connect();
  const first = FakeWebSocket.instances[0];
  first.onopen();
  first.onclose({ code: 4401, reason: "" });

  // Even ticking well past any backoff delay, no reconnect should fire -
  // the Backend's `/ws` route now accepts before closing on rejection
  // (router.py's docstring), so a real close code is available here and
  // retrying against it would never succeed.
  t.mock.timers.tick(30_000);

  assert.equal(FakeWebSocket.instances.length, 1, "no reconnect after a fatal close code");

  connection.close();
});

test("does not reconnect after a fatal close code (4403 forbidden origin)", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });

  const connection = new RealtimeConnection(() => {});
  connection.connect();
  const first = FakeWebSocket.instances[0];
  first.onopen();
  first.onclose({ code: 4403, reason: "" });

  t.mock.timers.tick(30_000);

  assert.equal(FakeWebSocket.instances.length, 1, "no reconnect after a fatal close code");

  connection.close();
});
