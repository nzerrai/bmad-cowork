// Component tests for `/hub/dashboard` (spec: dashboard-user-scoped-repos-list).
// Covers the I/O & Edge-Case Matrix scenarios that are frontend-observable:
// - ADMIN_SEES_ALL / USER_SEES_OWN: the page renders whatever repo list
//   `GET /hub/dashboard/repos` returns (role scoping itself is a backend
//   concern -- see `test_hub_dashboard_repos_router.py`), including the
//   per-repo `git_state` enrichment (or its "no local Git state reported"
//   fallback when absent, never fabricated).
// - NO_REPOS_CONNECTED: an empty `repos` list shows the onboarding message.
// - The Real-Time Status Bar and "Hub unreachable" (frozen timestamp) states
//   already specified by Story 3.3 are preserved, now driven by the real
//   repo list instead of the old MOCK_BRANCH/MOCK_PRS.
//
// Follows `__tests__/login.test.tsx`'s pattern: real render via jsdom +
// @testing-library/react, cache-busted dynamic import per test so each
// test's `globalThis.fetch`/`WebSocket` mocks are picked up fresh.

import { test } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup, waitFor } from "@testing-library/react";
import React from "react";

class FakeWebSocket {
  constructor(url: string) {
    this.url = url;
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instances.push(this);
  }
  url: string;
  sent: string[];
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: (() => void) | null;
  static instances: FakeWebSocket[] = [];

  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000, reason = "") {
    this.onclose?.({ code, reason });
  }
}

function mockRepos(overrides: Array<Record<string, unknown>>) {
  return overrides.map((repo, i) => ({
    id: `repo-${i}`,
    technical_identifier: `https://github.com/org/repo-${i}.git`,
    short_name: `repo-${i}`,
    status: "active",
    origin: "discovered",
    has_credential: false,
    created_at: "2026-08-12T00:00:00Z",
    updated_at: "2026-08-12T00:00:00Z",
    git_state: null,
    ...repo,
  }));
}

test("HubDashboardPage: renders the repo list GET /hub/dashboard/repos returns, with git_state when present", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  const repos = mockRepos([
    {
      id: "repo-a",
      short_name: "repo-a",
      git_state: {
        technical_identifier: "https://github.com/org/repo-0.git",
        branch: "feature/x",
        ahead: 2,
        behind: 0,
        in_progress_action: "none",
        last_updated: "2026-08-12T00:00:00Z",
        is_stale: false,
      },
    },
    { id: "repo-b", short_name: "repo-b" },
  ]);

  const fetchCalls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    fetchCalls.push(url);
    return {
      ok: true,
      json: async () => ({ repos }),
    } as Response;
  }) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  await waitFor(() => assert.ok(view.queryByText("repo-a")));

  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0], /\/hub\/dashboard\/repos$/);

  // Repo with a matching git_state shows its real branch.
  assert.ok(view.getByText("repo-a"));
  assert.ok(view.getByText("feature/x"));

  // Repo without git_state shows the "not fabricated" fallback, not a made-up branch.
  assert.ok(view.getByText("repo-b"));
  assert.ok(view.getByText("No local Git state reported"));

  // Not the empty-state onboarding message.
  assert.equal(view.queryByText("No repositories connected yet"), null);
});

test("HubDashboardPage: NO_REPOS_CONNECTED - empty repos list shows onboarding message and link", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({ repos: [] }),
    }) as Response) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  await waitFor(() => assert.ok(view.queryByText("No repositories connected yet")));

  const link = view.getByRole("link", { name: /go to onboarding/i });
  assert.equal(link.getAttribute("href"), "/hub/onboarding");
});

test("HubDashboardPage: shows a loading state before the fetch settles, never the onboarding message prematurely", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  let resolveFetch!: (value: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    resolveFetch = resolve;
  });
  globalThis.fetch = (async () => pending) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  // While still pending, the loading state shows -- not "no repos", which
  // would be a false negative flash for a user who actually has many.
  assert.ok(view.getByText(/loading your repositories/i));
  assert.equal(view.queryByText("No repositories connected yet"), null);

  resolveFetch({ ok: true, json: async () => ({ repos: [] }) } as Response);

  await waitFor(() => assert.ok(view.queryByText("No repositories connected yet")));
});

test("HubDashboardPage: a failed fetch shows a distinct error state, not the onboarding message", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as Response) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  await waitFor(() => assert.ok(view.queryByText(/unable to load your repositories/i)));
  // Never conflated with the genuine empty state.
  assert.equal(view.queryByText("No repositories connected yet"), null);
});

test("HubDashboardPage: a 401 response shows a session-expired message, not the onboarding message", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({}),
    }) as Response) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  await waitFor(() => assert.ok(view.queryByText(/session has expired/i)));
  assert.equal(view.queryByText("No repositories connected yet"), null);
});

test("HubDashboardPage: a malformed response body (repos not an array) falls back to an empty list instead of crashing", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  globalThis.fetch = (async () =>
    ({
      ok: true,
      json: async () => ({ repos: "not-an-array" }),
    }) as Response) as typeof fetch;

  const { default: HubDashboardPage } = await import(
    `../app/hub/dashboard/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(HubDashboardPage));

  await waitFor(() => assert.ok(view.queryByText("No repositories connected yet")));
});

test("OverviewDashboard: Real-Time Status Bar mounts and drives a real WebSocket connection attempt", async (t) => {
  // Proves the Real-Time Status Bar / `lib/websocket.ts` wiring (preserved
  // from Story 3.3, unmodified by this revision) still fires from the new
  // repo-list-driven `OverviewDashboard` -- a real `RealtimeConnection` is
  // constructed and attempts to open a socket on mount, same as before this
  // revision replaced `initialBranch`/`initialPRs` with `initialRepos`.
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "test-token");
  t.after(() => {
    cleanup();
    FakeWebSocket.instances = [];
  });
  globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

  const { OverviewDashboard } = await import(
    `../app/components/dashboard/OverviewDashboard.tsx?t=${Date.now()}-${Math.random()}`
  );

  const repos = mockRepos([{ id: "repo-a", short_name: "repo-a" }]);
  const view = render(React.createElement(OverviewDashboard, { initialRepos: repos }));

  await waitFor(() => assert.ok(FakeWebSocket.instances.length >= 1));
  assert.match(FakeWebSocket.instances[0].url, /\?token=test-token$/);
  // Before the socket opens, the bar reports the idle (disconnected) state.
  assert.ok(view.getByText(/idle.*websocket disconnected/i));
});

test("OverviewDashboard: Hub-unreachable status renders the frozen last-known-state timestamp while data stays visible", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  const { OverviewDashboard } = await import(
    `../app/components/dashboard/OverviewDashboard.tsx?t=${Date.now()}-${Math.random()}`
  );

  const repos = mockRepos([{ id: "repo-a", short_name: "repo-a" }]);
  const view = render(
    React.createElement(OverviewDashboard, {
      initialRepos: repos,
      initialHubStatus: "unreachable",
      initialLastKnownStateTimestamp: "2026-08-12 09:55:00",
    }),
  );

  assert.ok(view.getByText(/hub unreachable/i));
  assert.ok(view.getByText(/2026-08-12 09:55:00/));
  // Data (the repo list) remains visible, not replaced by the empty state.
  assert.ok(view.getByText("repo-a"));
  assert.equal(view.queryByText("No repositories connected yet"), null);
});

test("OverviewDashboard: a stale git_state surfaces the staleness instead of rendering as fresh", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  const { OverviewDashboard } = await import(
    `../app/components/dashboard/OverviewDashboard.tsx?t=${Date.now()}-${Math.random()}`
  );

  const repos = mockRepos([
    {
      id: "repo-a",
      short_name: "repo-a",
      git_state: {
        technical_identifier: "https://github.com/org/repo-0.git",
        branch: "main",
        ahead: 0,
        behind: 0,
        in_progress_action: "none",
        last_updated: "2026-08-12T00:00:00Z",
        is_stale: true,
        status_message: "Last known — 45s ago",
      },
    },
  ]);

  const view = render(React.createElement(OverviewDashboard, { initialRepos: repos }));

  assert.ok(view.getByText(/Last known — 45s ago/));
});

test("OverviewDashboard: a fresh (non-stale) git_state renders the plain branch name, no staleness indicator", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());

  const { OverviewDashboard } = await import(
    `../app/components/dashboard/OverviewDashboard.tsx?t=${Date.now()}-${Math.random()}`
  );

  const repos = mockRepos([
    {
      id: "repo-a",
      short_name: "repo-a",
      git_state: {
        technical_identifier: "https://github.com/org/repo-0.git",
        branch: "main",
        ahead: 0,
        behind: 0,
        in_progress_action: "none",
        last_updated: "2026-08-12T00:00:00Z",
        is_stale: false,
      },
    },
  ]);

  const view = render(React.createElement(OverviewDashboard, { initialRepos: repos }));

  assert.ok(view.getByText("main"));
  assert.equal(view.queryByText(/last known/i), null);
});
