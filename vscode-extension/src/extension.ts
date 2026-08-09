/**
 * BMad Portal VS Code Extension
 *
 * This is the entry point for the BMad Portal VS Code extension.
 * It provides IDE integration and dashboard display capabilities.
 */

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// Register commands
	const refreshDashboardCommand = vscode.commands.registerCommand(
		'bmad-portal.refreshDashboard',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Dashboard refresh triggered');
		}
	);

	const openDashboardCommand = vscode.commands.registerCommand(
		'bmad-portal.openDashboard',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Opening dashboard');
		}
	);

	const disconnectCommand = vscode.commands.registerCommand(
		'bmad-portal.disconnect',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Disconnecting from backend');
			// State update for view visibility
			vscode.commands.executeCommand('setContext', 'bmadPortal.connected', false);
		}
	);

	const reconnectCommand = vscode.commands.registerCommand(
		'bmad-portal.reconnect',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Reconnecting to backend');
			// State update for view visibility
			vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);
		}
	);

	context.subscriptions.push(
		refreshDashboardCommand,
		openDashboardCommand,
		disconnectCommand,
		reconnectCommand
	);

	// Initialize extension state
	const backendHubUrl = vscode.workspace.getConfiguration('bmadPortal').get<string>('backendHubUrl', 'http://localhost:3000');
	const authMethod = vscode.workspace.getConfiguration('bmadPortal').get<string>('authMethod', 'session');
	const dashboardDisplayMode = vscode.workspace.getConfiguration('bmadPortal').get<string>('dashboardDisplayMode', 'sidebar');

	vscode.window.showInformationMessage(`BMad Portal Hub extension activated. Backend: ${backendHubUrl}`);

	// Set initial connected state
	vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);
}

export function deactivate() {
	// Cleanup on extension deactivation
	vscode.window.showInformationMessage('BMad Portal Hub extension deactivated');
}
