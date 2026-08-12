// Component test (Story 1.2 review follow-up): the smoke suite only proves
// /login renders a <form> over HTTP — it never submits it. This drives the
// real client component (jsdom + @testing-library/react) to prove the
// success path actually persists the token and navigates to /hub/dashboard.
//
// jsdom globals are set up by `__tests__/jsdom-register.mjs`, loaded via
// `--import` before this file (and before react-dom) — see that file for why
// ordering matters here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import React from "react";

test("login: successful sign-in stores the token and redirects to /hub/dashboard", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  const router = { push: (path: string) => pushCalls.push(path) };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  const fetchCalls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    fetchCalls.push({ url, body: init?.body ? JSON.parse(init.body as string) : null });
    return {
      ok: true,
      json: async () => ({ access_token: "test-token-123" }),
    } as Response;
  }) as typeof fetch;

  // Cache-busted specifier: forces a fresh module evaluation per test, so
  // this test's `t.mock.module("next/navigation", ...)` above is actually
  // the binding the component picks up — importing the same specifier twice
  // in one process returns the first test's cached module (and its stale
  // mocked `useRouter` closure) otherwise.
  const { default: LoginPage } = await import(`../app/login/page.tsx?t=${Date.now()}-${Math.random()}`);
  const view = render(React.createElement(LoginPage));

  fireEvent.change(view.getByLabelText(/email/i), {
    target: { value: "dev@example.com" },
  });
  fireEvent.change(view.getByLabelText(/password/i), {
    target: { value: "secret123" },
  });
  fireEvent.click(view.getByRole("button", { name: /sign in/i }));

  await waitFor(() => assert.equal(pushCalls.length, 1));

  assert.equal(localStorage.getItem("bmad_access_token"), "test-token-123");
  assert.deepEqual(pushCalls, ["/hub/dashboard"]);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /\/auth\/login$/);
  assert.deepEqual(fetchCalls[0].body, { email: "dev@example.com", password: "secret123" });
});

test("login: failed sign-in shows the API's error detail and does not navigate", async (t) => {
  localStorage.clear();
  t.after(() => cleanup());
  const pushCalls: string[] = [];
  const router = { push: (path: string) => pushCalls.push(path) };
  t.mock.module("next/navigation", {
    namedExports: { useRouter: () => router },
  });

  globalThis.fetch = (async () =>
    ({
      ok: false,
      json: async () => ({ detail: "Invalid credentials" }),
    }) as Response) as typeof fetch;

  // Cache-busted specifier: forces a fresh module evaluation per test, so
  // this test's `t.mock.module("next/navigation", ...)` above is actually
  // the binding the component picks up — importing the same specifier twice
  // in one process returns the first test's cached module (and its stale
  // mocked `useRouter` closure) otherwise.
  const { default: LoginPage } = await import(`../app/login/page.tsx?t=${Date.now()}-${Math.random()}`);
  const view = render(React.createElement(LoginPage));

  fireEvent.change(view.getByLabelText(/email/i), {
    target: { value: "dev@example.com" },
  });
  fireEvent.change(view.getByLabelText(/password/i), {
    target: { value: "wrong" },
  });
  fireEvent.click(view.getByRole("button", { name: /sign in/i }));

  await view.findByText("Invalid credentials");

  assert.equal(pushCalls.length, 0);
  assert.equal(localStorage.getItem("bmad_access_token"), null);
});
