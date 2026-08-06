// I/O matrix test: `npm run dev`-equivalent boot — the app starts and its
// default page renders on the configured port. Boots the production server
// (`next start`, after `next build` via the `pretest` hook) rather than the
// dev server, since that's the deterministic, CI-friendly way to assert on
// a stable listening port without racing Turbopack's dev compiler.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 3411;
const BOOT_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 250;

function waitForServer(url, deadline, crashed) {
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

test("ihm boot: default page renders on the configured port", async () => {
  const server = spawn(
    "npx",
    ["next", "start", "-p", String(PORT)],
    { cwd: new URL("..", import.meta.url), stdio: ["ignore", "pipe", "pipe"] },
  );

  // Fail fast (rather than waiting out the full timeout) if the server
  // process exits or errors before it ever starts responding.
  const crashed = {};
  let stderr = "";
  server.stderr.on("data", (chunk) => { stderr += chunk; });
  server.on("error", (error) => { crashed.error = error; });
  server.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      crashed.error = new Error(`server exited early with code ${code}: ${stderr}`);
    }
  });

  try {
    const response = await waitForServer(
      `http://localhost:${PORT}/`,
      Date.now() + BOOT_TIMEOUT_MS,
      crashed,
    );
    const body = await response.text();

    // Structural checks only — not coupled to the default scaffold's
    // placeholder copy, which a later epic's real dashboard UI will delete.
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.ok(body.length > 100, "expected a non-trivial rendered HTML body");
  } finally {
    server.kill("SIGTERM");
  }
});
