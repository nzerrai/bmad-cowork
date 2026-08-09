import * as vscode from 'vscode';

/**
 * Placeholder sidebar dashboard view.
 *
 * Story 7.1 only wires the contribution point (activity-bar view container +
 * webview view) and registers a real `WebviewViewProvider` so the container
 * is not empty. The actual navigation arborescence (Dashboard Overview, My
 * Claims, Risk Signals, Sprint Status) and live widget data are Story 7.5/7.6.
 */
class BmadPortalDashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'bmadPortal.dashboardView';

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = { enableScripts: false };
    webviewView.webview.html = BmadPortalDashboardViewProvider.getHtml();
  }

  private static getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BMad Portal</title>
  </head>
  <body>
    <p>
      BMad Portal dashboard placeholder. Repo state, claims, and risk signal
      widgets are added in later Epic 7 stories.
    </p>
  </body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const showDashboardCommand = vscode.commands.registerCommand('bmadPortal.showDashboard', async () => {
    await vscode.commands.executeCommand('workbench.view.extension.bmadPortal-sidebar');
  });

  // Placeholder handler: real claims/role-based suggestions ship in Story 7.7.
  const showSuggestedFeaturesCommand = vscode.commands.registerCommand(
    'bmadPortal.showSuggestedFeatures',
    async () => {
      await vscode.window.showInformationMessage(
        'BMad Portal: Suggested Features is not implemented yet (see Story 7.7).',
      );
    },
  );

  const dashboardViewProvider = new BmadPortalDashboardViewProvider();
  const dashboardViewRegistration = vscode.window.registerWebviewViewProvider(
    BmadPortalDashboardViewProvider.viewType,
    dashboardViewProvider,
  );

  // VS Code's package.json contribution model has no stable contribution
  // point for status bar items (only commands/views/configuration), so it is
  // created programmatically here, per this story's Design Notes.
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(sync) BMad Portal';
  statusBarItem.tooltip = 'BMad Portal: Show Dashboard';
  statusBarItem.command = 'bmadPortal.showDashboard';
  statusBarItem.show();

  context.subscriptions.push(
    showDashboardCommand,
    showSuggestedFeaturesCommand,
    dashboardViewRegistration,
    statusBarItem,
  );
}

export function deactivate(): void {
  // No teardown needed yet: the polling engine (Story 7.2), event-driven
  // override (Story 7.3), and WebSocket client have no lifecycle to tear
  // down until they exist.
}
