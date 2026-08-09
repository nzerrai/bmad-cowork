// I/O matrix "Activation" row: `activate()` runs without throwing, and the
// status bar item + dashboard webview view are actually registered/rendered
// — not just declared in package.json. Runs against the compiled output
// (`out/extension.js`), so `npm run compile` must run first (see `pretest`).
//
// No real VS Code host is available in this environment (no GUI/Electron),
// so the `vscode` module is mocked via `--experimental-test-module-mocks`
// (same pattern the IHM tier uses for `next/navigation`) rather than using
// `@vscode/test-electron`, which would need a real editor process to launch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

test('activate() registers commands, the status bar item, and the dashboard webview view', async (t) => {
  const registeredCommands = [];
  const disposable = () => ({ dispose() {} });

  let statusBarItem;
  let webviewViewProvider;
  let webviewViewId;

  let showInformationMessageCallCount = 0;

  t.mock.module('vscode', {
    exports: {
      commands: {
        registerCommand: (command, handler) => {
          registeredCommands.push({ command, handler });
          return disposable();
        },
        executeCommand: async () => {},
      },
      window: {
        showInformationMessage: async () => {
          showInformationMessageCallCount += 1;
          return undefined;
        },
        createStatusBarItem: (alignment, priority) => {
          statusBarItem = {
            alignment,
            priority,
            text: undefined,
            tooltip: undefined,
            command: undefined,
            shown: false,
            show() {
              this.shown = true;
            },
            dispose() {},
          };
          return statusBarItem;
        },
        registerWebviewViewProvider: (viewId, provider) => {
          webviewViewId = viewId;
          webviewViewProvider = provider;
          return disposable();
        },
      },
      StatusBarAlignment: { Left: 1, Right: 2 },
    },
  });

  const { activate } = await import('../out/extension.js');

  const context = { subscriptions: [] };
  assert.doesNotThrow(() => activate(context));

  const commandIds = registeredCommands.map((entry) => entry.command);
  assert.ok(commandIds.includes('bmadPortal.showDashboard'), 'bmadPortal.showDashboard not registered');
  assert.ok(
    commandIds.includes('bmadPortal.showSuggestedFeatures'),
    'bmadPortal.showSuggestedFeatures not registered',
  );

  assert.ok(statusBarItem, 'status bar item was not created');
  assert.equal(statusBarItem.alignment, 1);
  assert.ok(typeof statusBarItem.text === 'string' && statusBarItem.text.length > 0);
  assert.equal(statusBarItem.command, 'bmadPortal.showDashboard');
  assert.equal(statusBarItem.shown, true, 'status bar item was created but never shown');

  // Cross-check against package.json's own declared view id, not just a
  // literal expected here: if extension.ts and package.json's contributed
  // view id ever diverge, this must fail rather than both this test and
  // package-manifest.test.mjs (which only checks *a* webview view exists)
  // passing while the real Extension Host shows an orphaned sidebar view.
  const declaredViewId = pkg.contributes?.views?.['bmadPortal-sidebar']?.[0]?.id;
  assert.equal(webviewViewId, declaredViewId, "registered view id doesn't match package.json's declared view id");
  assert.equal(webviewViewId, 'bmadPortal.dashboardView');
  assert.ok(webviewViewProvider, 'dashboard webview view provider was not registered');

  // "the dashboard view appears": resolving it actually produces content.
  const webviewView = { webview: { options: undefined, html: undefined } };
  webviewViewProvider.resolveWebviewView(webviewView);
  assert.equal(webviewView.webview.options.enableScripts, false);
  assert.ok(
    typeof webviewView.webview.html === 'string' && webviewView.webview.html.includes('<!DOCTYPE html>'),
    'dashboard webview did not render HTML content',
  );

  assert.equal(context.subscriptions.length, 4, 'not all registrations were pushed to subscriptions');

  // The placeholder handler's actual behavior (Story 7.1's AC: "contributions
  // are real, not just declared") — invoke it and confirm it does surface
  // something to the user via showInformationMessage, not a silent no-op.
  const showSuggestedFeaturesEntry = registeredCommands.find(
    (entry) => entry.command === 'bmadPortal.showSuggestedFeatures',
  );
  assert.ok(showSuggestedFeaturesEntry, 'bmadPortal.showSuggestedFeatures handler was not captured');
  await showSuggestedFeaturesEntry.handler();
  assert.equal(
    showInformationMessageCallCount,
    1,
    'bmadPortal.showSuggestedFeatures handler did not call showInformationMessage exactly once',
  );
});
