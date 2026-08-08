// Component test (Story 1.2 review follow-up): the smoke suite only proves
// /artifacts renders its SSR shell — the auth-gate redirect and the actual
// rendering of a `GET /artifacts/health` response are pure client-side
// behavior it can't see. This drives the real component (jsdom +
// @testing-library/react) against a mocked `authFetch`, using the exact
// field names `backend/app/indexing/schemas.py` emits — if those field
// names ever drift, this test's query assertions break instead of the
// dashboard silently rendering blanks.
//
// jsdom globals are set up by `__tests__/jsdom-register.mjs`, loaded via
// `--import` before this file (and before react-dom) — see that file for why
// ordering matters here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup, waitFor } from "@testing-library/react";
import React from "react";

const SAMPLE_RESPONSE = {
  types: [
    { artifact_type: "prd", completeness: "complete", count: 1, error_count: 0 },
  ],
  artifacts: [
    {
      id: "artifact-1",
      artifact_type: "prd",
      title: "BMad Portal Hub PRD",
      file_path: "prjdocs/planning-artifacts/prds/prd.md",
      status: null,
      error: null,
      sync_status: "synced",
      indexed_at: "2026-08-07T00:00:00Z",
      links_out: [
        {
          source_field: "inputDocuments",
          target_path: "prjdocs/planning-artifacts/brief.md",
          target_artifact_id: null,
          resolved: false,
        },
      ],
    },
  ],
};

test("artifacts: no token redirects to /login without fetching", async (t) => {
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
  const { default: ArtifactsPage } = await import(`../app/artifacts/page.tsx?t=${Date.now()}-${Math.random()}`);
  render(React.createElement(ArtifactsPage));

  await waitFor(() => assert.deepEqual(pushCalls, ["/login"]));
  assert.equal(fetchCalled, false);

  cleanup();
});

test("artifacts: with a token, fetches and renders the health response", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "valid-token");
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  // A stable object, like Next's real `useRouter()` — a fresh object per
  // render would make `load`'s `[router]` dependency re-fire on every
  // render and infinite-loop.
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

  // Cache-busted specifier: forces a fresh module evaluation per test, so
  // this test's `t.mock.module("next/navigation", ...)` above is actually
  // the binding the component picks up — importing the same specifier twice
  // in one process returns the first test's cached module (and its stale
  // mocked `useRouter` closure) otherwise.
  const { default: ArtifactsPage } = await import(`../app/artifacts/page.tsx?t=${Date.now()}-${Math.random()}`);
  const view = render(React.createElement(ArtifactsPage));

  await view.findByText("BMad Portal Hub PRD");
  assert.ok(view.getByText("prjdocs/planning-artifacts/brief.md"));
  assert.equal(pushCalls.length, 0);

  cleanup();
});

test("artifacts: a 401 response clears the token and redirects to /login", async (t) => {
  localStorage.clear();
  localStorage.setItem("bmad_access_token", "expired-token");
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  // A stable object, like Next's real `useRouter()` — a fresh object per
  // render would make `load`'s `[router]` dependency re-fire on every
  // render and infinite-loop.
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

  // Cache-busted specifier: forces a fresh module evaluation per test, so
  // this test's `t.mock.module("next/navigation", ...)` above is actually
  // the binding the component picks up — importing the same specifier twice
  // in one process returns the first test's cached module (and its stale
  // mocked `useRouter` closure) otherwise.
  const { default: ArtifactsPage } = await import(`../app/artifacts/page.tsx?t=${Date.now()}-${Math.random()}`);
  render(React.createElement(ArtifactsPage));

  await waitFor(() => assert.deepEqual(pushCalls, ["/login"]));
  assert.equal(localStorage.getItem("bmad_access_token"), null);

  cleanup();
});
