/**
 * BMad Portal VS Code Extension
 *
 * This is the entry point for the BMad Portal VS Code extension.
 * It provides IDE integration and dashboard display capabilities.
 */

import * as vscode from 'vscode';
import { GitPoller, GitState } from './git-poller';
import { StateReporter } from './state-reporter';

export let gitPoller: GitPoller | undefined;
export let stateReporter: StateReporter | undefined;

export function activate(context: vscode.ExtensionContext) {
	// Initialize state reporter and git poller
	stateReporter = new StateReporter(context);
	gitPoller = new GitPoller(context);

	// Register commands
	const refreshDashboardCommand = vscode.commands.registerCommand(
		'bmad-portal.refreshDashboard',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Dashboard refresh triggered');
			// Force immediate poll
			if (gitPoller) {
				await gitPoller['pollGitState']();
			}
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
			// Stop polling
			if (gitPoller) {
				gitPoller.stop();
			}
		}
	);

	const reconnectCommand = vscode.commands.registerCommand(
		'bmad-portal.reconnect',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Reconnecting to backend');
			// State update for view visibility
			vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);
			// Start polling
			if (gitPoller) {
				gitPoller.start();
			}
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

	// Start the Git polling engine
	if (gitPoller) {
		gitPoller.start();

		// Listen for state changes and report to backend
		gitPoller.onStateChange(async (state: GitState) => {
			if (stateReporter) {
				await stateReporter.reportGitState(state);
			}
		});
	}
}

export function deactivate() {
	// Cleanup on extension deactivation
	if (gitPoller) {
		gitPoller.stop();
	}
	vscode.window.showInformationMessage('BMad Portal Hub extension deactivated');
}
