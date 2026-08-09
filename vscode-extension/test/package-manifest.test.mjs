import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

// The I/O matrix's "Configuration defaults" row: every bmadPortal.* setting
// later Epic 7 stories reference by name, with the default this story
// documents for it.
const REQUIRED_CONFIG_DEFAULTS = {
  'bmadPortal.backendHubUrl': 'http://localhost:8000',
  'bmadPortal.repoPollingIntervalSec': 300,
  'bmadPortal.authMethod': 'jwt',
  'bmadPortal.dashboardDisplayMode': 'sidebarView',
  'bmadPortal.enableEventDrivenPolling': true,
  'bmadPortal.dashboardRefreshIntervalSec': 60,
};

const REQUIRED_COMMANDS = ['bmadPortal.showDashboard', 'bmadPortal.showSuggestedFeatures'];

test('package.json declares engines.vscode', () => {
  assert.ok(
    pkg.engines && typeof pkg.engines.vscode === 'string' && pkg.engines.vscode.length > 0,
    'engines.vscode must be a non-empty string',
  );
});

test('package.json declares the required commands', () => {
  const declared = (pkg.contributes?.commands ?? []).map((command) => command.command);
  for (const command of REQUIRED_COMMANDS) {
    assert.ok(declared.includes(command), `missing command: ${command}`);
  }
});

test('package.json declares every required configuration key with its documented default', () => {
  const properties = pkg.contributes?.configuration?.properties ?? {};
  for (const [key, expectedDefault] of Object.entries(REQUIRED_CONFIG_DEFAULTS)) {
    assert.ok(key in properties, `missing configuration key: ${key}`);
    assert.ok(
      typeof properties[key].description === 'string' && properties[key].description.length > 0,
      `missing description for ${key}`,
    );
    assert.deepStrictEqual(properties[key].default, expectedDefault, `unexpected default for ${key}`);
  }
});

test('package.json declares a webview view inside a dedicated activity-bar view container', () => {
  const containers = pkg.contributes?.viewsContainers?.activitybar ?? [];
  assert.ok(containers.length > 0, 'no activity-bar view container declared');

  const views = pkg.contributes?.views ?? {};
  const hasWebviewView = containers.some((container) =>
    (views[container.id] ?? []).some((view) => view.type === 'webview'),
  );
  assert.ok(hasWebviewView, 'no webview view declared inside an activity-bar view container');
});
