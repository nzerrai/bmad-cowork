// I/O matrix test: `npm run dev`-equivalent boot — the app starts and its
// routes render on the configured port. Boots the production server
// (`next start`, after `next build` via the `pretest` hook) rather than the
// dev server, since that's the deterministic, CI-friendly way to assert on
// a stable listening port without racing Turbopack's dev compiler.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 3411;
const BOOT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 250;

let server;
const crashed = {};
let stderr = "";

function waitForServer(url, deadline) {
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      if (crashed.error) {
        reject(crashed.error);
        return;
      }
      try {
        const response = await fetch(url);
        resolve(response);
      } catch {
        if (Date.now() > deadline) {
          reject(new Error(`Server did not respond at ${url} in time`));
        } else {
          setTimeout(attempt, POLL_INTERVAL_MS);
        }
      }
    };
    attempt();
  });
}

before(async () => {
  server = spawn(
    "npx",
    ["next", "start", "-p", String(PORT)],
    { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] },
  );

  // Fail fast (rather than waiting out the full timeout) if the server
  // process exits or errors before it ever starts responding.
  server.stderr.on("data", (chunk) => { stderr += chunk; });
  server.on("error", (error) => { crashed.error = error; });
  server.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      crashed.error = new Error(`server exited early with code ${code}: ${stderr}`);
    }
  });

  // Warm the server up once so each test below just asserts on its own route.
  await waitForServer(`http://localhost:${PORT}/`, Date.now() + BOOT_TIMEOUT_MS);
});

after(() => {
  server?.kill("SIGTERM");
});

test("ihm boot: default page renders on the configured port", async () => {
  const response = await fetch(`http://localhost:${PORT}/`);
  const body = await response.text();

  // Structural checks only — not coupled to the default scaffold's
  // placeholder copy, which a later epic's real dashboard UI will delete.
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.ok(body.length > 100, "expected a non-trivial rendered HTML body");
});

test("ihm boot: /login renders a form", async () => {
  const response = await fetch(`http://localhost:${PORT}/login`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<form/);
});

test("ihm boot: /artifacts renders its page shell (auth redirect is client-side)", async () => {
  const response = await fetch(`http://localhost:${PORT}/artifacts`);
  const body = await response.text();

  // The token check/redirect to /login happens in a `useEffect`, so the
  // server still renders this route's initial HTML with a 200 — assert
  // structurally on that shell, not on a 3xx this server never returns.
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.ok(body.length > 100, "expected a non-trivial rendered HTML body");
});

test("ihm boot: /artifacts/traceability renders its page shell (auth redirect is client-side)", async () => {
  const response = await fetch(`http://localhost:${PORT}/artifacts/traceability`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.ok(body.length > 100, "expected a non-trivial rendered HTML body");
});
