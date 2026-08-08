// Component test (Story 1.3), mirroring `artifacts.test.tsx`'s structure:
// drives the real client component (jsdom + @testing-library/react) against
// a mocked `authFetch`, using the exact field names
// `backend/app/indexing/schemas.py`'s `TraceabilityMatrixResponse` emits as
// the contract check — if those field names ever drift, this test's query
// assertions break instead of the matrix silently rendering blanks.
//
// jsdom globals are set up by `__tests__/jsdom-register.mjs`, loaded via
// `--import` before this file (and before react-dom) — see that file for why
// ordering matters here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup, waitFor } from "@testing-library/react";
import React from "react";

const NOT_STARTED_NODE = {
  status: "not_started",
  artifact_id: null,
  title: null,
  file_path: null,
};

const SAMPLE_RESPONSE = {
  rows: [
    {
      epic_num: 1,
      story_num: 1,
      epic_title: "Artifact Health & Traceability Catalog",
      story_title: "Artifact Indexing Engine",
      idea_brief: { status: "linked", artifact_id: "a1", title: "Brief", file_path: "brief.md" },
      prd: { status: "pending", artifact_id: "a2", title: "PRD", file_path: "prd.md" },
      architecture: NOT_STARTED_NODE,
      ux: NOT_STARTED_NODE,
      story: {
        status: "completed",
        artifact_id: "a3",
        title: "Artifact Indexing Engine",
        file_path: "implementation-artifacts/1-1-artifact-indexing-engine.md",
      },
      prs: NOT_STARTED_NODE,
      tests: NOT_STARTED_NODE,
    },
  ],
};

test("traceability: no token redirects to /login without fetching", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  // A stable object, like Next's real `useRouter()` — a fresh object per
  // render would make `load`'s `[router]` dependency re-fire on every
  // render and infinite-loop.
  const router = { push: (path: string) => pushCalls.push(path) };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error("fetch should not be called without a token");
  }) as typeof fetch;

  // Cache-busted specifier: forces a fresh module evaluation per test, so
  // this test's `t.mock.module("next/navigation", ...)` above is actually
  // the binding the component picks up — importing the same specifier twice
  // in one process returns the first test's cached module (and its stale
  // mocked `useRouter` closure) otherwise.
  const { default: TraceabilityPage } = await import(
    `../app/artifacts/traceability/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  render(React.createElement(TraceabilityPage));

  await waitFor(() => assert.deepEqual(pushCalls, ["/login"]));
  assert.equal(fetchCalled, false);

  cleanup();
});

test("traceability: with a token, fetches and renders rows with per-node status pills", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "valid-token");
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  const router = { push: (path: string) => pushCalls.push(path) };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => SAMPLE_RESPONSE,
    }) as Response) as typeof fetch;

  const { default: TraceabilityPage } = await import(
    `../app/artifacts/traceability/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(TraceabilityPage));

  await view.findByText(/Artifact Indexing Engine/);
  assert.ok(view.getByText("Epic 1: Artifact Health & Traceability Catalog"));
  assert.ok(view.getByText("linked"));
  assert.ok(view.getByText("pending"));
  assert.ok(view.getByText("completed"));
  assert.ok(view.getAllByText("not started").length === 4);
  assert.equal(pushCalls.length, 0);

  cleanup();
});

test("traceability: multiple epics render one header per epic, no duplicates", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "valid-token");
  t.after(() => cleanup());
  const router = { push: () => {} };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  const multiEpicResponse = {
    rows: [
      {
        epic_num: 1,
        story_num: 1,
        epic_title: "First Epic",
        story_title: "First Story",
        idea_brief: NOT_STARTED_NODE,
        prd: NOT_STARTED_NODE,
        architecture: NOT_STARTED_NODE,
        ux: NOT_STARTED_NODE,
        story: NOT_STARTED_NODE,
        prs: NOT_STARTED_NODE,
        tests: NOT_STARTED_NODE,
      },
      {
        epic_num: 1,
        story_num: 2,
        epic_title: "First Epic",
        story_title: "Second Story",
        idea_brief: NOT_STARTED_NODE,
        prd: NOT_STARTED_NODE,
        architecture: NOT_STARTED_NODE,
        ux: NOT_STARTED_NODE,
        story: NOT_STARTED_NODE,
        prs: NOT_STARTED_NODE,
        tests: NOT_STARTED_NODE,
      },
      {
        epic_num: 2,
        story_num: 1,
        epic_title: "Second Epic",
        story_title: "Third Story",
        idea_brief: NOT_STARTED_NODE,
        prd: NOT_STARTED_NODE,
        architecture: NOT_STARTED_NODE,
        ux: NOT_STARTED_NODE,
        story: NOT_STARTED_NODE,
        prs: NOT_STARTED_NODE,
        tests: NOT_STARTED_NODE,
      },
    ],
  };

  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => multiEpicResponse,
    }) as Response) as typeof fetch;

  const { default: TraceabilityPage } = await import(
    `../app/artifacts/traceability/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = await Promise.resolve(render(React.createElement(TraceabilityPage)));

  await view.findByText(/Third Story/);
  assert.equal(view.getAllByText(/^Epic 1: First Epic$/).length, 1);
  assert.equal(view.getAllByText(/^Epic 2: Second Epic$/).length, 1);

  cleanup();
});

test("traceability: empty rows shows the no-epics-indexed message", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "valid-token");
  t.after(() => cleanup());
  const router = { push: () => {} };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ rows: [] }),
    }) as Response) as typeof fetch;

  const { default: TraceabilityPage } = await import(
    `../app/artifacts/traceability/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  const view = render(React.createElement(TraceabilityPage));

  await view.findByText("No epics document indexed yet.");

  cleanup();
});

test("traceability: a 401 response clears the token and redirects to /login", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "expired-token");
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  const router = { push: (path: string) => pushCalls.push(path) };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Not authenticated" }),
    }) as Response) as typeof fetch;

  const { default: TraceabilityPage } = await import(
    `../app/artifacts/traceability/page.tsx?t=${Date.now()}-${Math.random()}`
  );
  render(React.createElement(TraceabilityPage));

  await waitFor(() => assert.deepEqual(pushCalls, ["/login"]));
  assert.equal(localStorage.getItem("bmad_access_token"), null);

  cleanup();
});
