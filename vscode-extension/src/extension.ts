/**
 * BMad Portal VS Code Extension
 *
 * This is the entry point for the BMad Portal VS Code extension.
 * It provides IDE integration and dashboard display capabilities.
 */

import * as vscode from 'vscode';
import { GitPoller, GitState } from './git-poller';
import { StateReporter } from './state-reporter';
import { AuthManager } from './auth-manager';
import { JwtStorageManager } from './jwt-storage';
import { DashboardWebviewViewProvider } from './webview-provider';
import { StatusBarWidget, StatusConfig, SyncState, PresenceState } from './status-bar';
import { FeaturesSuggester } from './features-suggester';
import { ClaimNotifications, ClaimEvent } from './claim-notifications';

export let gitPoller: GitPoller | undefined;
export let stateReporter: StateReporter | undefined;
export let authManager: AuthManager | undefined;
export let jwtStorage: JwtStorageManager | undefined;
export let dashboardWebviewProvider: DashboardWebviewViewProvider | undefined;
export let statusBarWidget: StatusBarWidget | undefined;
export let claimNotifications: ClaimNotifications | undefined;
export let featuresSuggester: FeaturesSuggester | undefined;

export async function activate(context: vscode.ExtensionContext) {
	// Initialize JWT storage and authentication manager first
	jwtStorage = new JwtStorageManager(context);
	authManager = new AuthManager(context);

	// Initialize the authentication manager
	await authManager.initialize();

	// Initialize state reporter and git poller
	stateReporter = new StateReporter(context);
	gitPoller = new GitPoller(context);

	// Initialize and register webview provider
	dashboardWebviewProvider = new DashboardWebviewViewProvider(context, authManager, jwtStorage);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DashboardWebviewViewProvider.viewType, dashboardWebviewProvider)
	);

	// Initialize Status Bar widget
	statusBarWidget = new StatusBarWidget();

	// Initialize claim notifications
	const enableNotifications = vscode.workspace.getConfiguration('bmadPortal').get<boolean>('enableNotifications', true);
	claimNotifications = new ClaimNotifications(enableNotifications);

	// Initialize features suggester
	featuresSuggester = new FeaturesSuggester(context);

	// Register commands
	const refreshDashboardCommand = vscode.commands.registerCommand(
		'bmad-portal.refreshDashboard',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Dashboard refresh triggered');
			// Force immediate poll
			if (gitPoller) {
				// Access the private pollGitState method via type assertion
				await (gitPoller as any).pollGitState(true);
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
			// Clear auth state
			if (authManager) {
				authManager.isAuthenticatedState(); // Check if authenticated
				await authManager.handleTokenExpiration(); // Trigger re-authentication flow
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

	// Add a command to trigger re-authentication
	const reauthCommand = vscode.commands.registerCommand(
		'bmad-portal.reauthenticate',
		async () => {
			vscode.window.showInformationMessage('BMad Portal: Re-authenticating...');
			if (authManager) {
				// In a real implementation, this would initiate the auth flow
				// For now, we show a message
				vscode.window.showInformationMessage('BMad Portal: Re-authentication flow would be initiated here.');
			}
		}
	);

	// Register "BMad Portal: Show Suggested Features" Command Palette command
	const showSuggestedFeaturesCommand = featuresSuggester.registerCommand();

	context.subscriptions.push(
		refreshDashboardCommand,
		openDashboardCommand,
		disconnectCommand,
		reconnectCommand,
		reauthCommand,
		showSuggestedFeaturesCommand
	);

	// Initialize extension state
	const backendHubUrl = vscode.workspace.getConfiguration('bmadPortal').get<string>('backendHubUrl', 'http://localhost:3000');
	const authMethod = vscode.workspace.getConfiguration('bmadPortal').get<string>('authMethod', 'session');
	const dashboardDisplayMode = vscode.workspace.getConfiguration('bmadPortal').get<string>('dashboardDisplayMode', 'sidebar');

	// Check if authenticated
	const isAuthenticated = authManager ? authManager.isAuthenticatedState() : false;
	const authStatus = isAuthenticated ? 'authenticated' : 'not authenticated';

	vscode.window.showInformationMessage(`BMad Portal Hub extension activated. Backend: ${backendHubUrl}. Auth: ${authStatus}`);

	// Set initial connected state
	vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);

	// Start the Git polling engine
	if (gitPoller) {
		gitPoller.start();

		// Listen for state changes and report to backend
		gitPoller.onStateChange(async (state: GitState) => {
			if (stateReporter) {
				try {
					await stateReporter.reportGitState(state);
				} catch (error) {
					// Handle authentication errors specifically
					if (error instanceof Error && error.message.includes('Authentication required: session expired')) {
						vscode.window.showWarningMessage('BMad Portal: Session expired. Please re-authenticate.');
						if (authManager) {
							await authManager.handleTokenExpiration();
						}
						// Trigger claims expiration notification
						if (claimNotifications) {
							claimNotifications.showExpirationEvent('Unknown', 'now');
						}
					} else {
						console.error('State report failed:', error);
					}
				}
			}

			// Update Status Bar widget with current state
			if (statusBarWidget) {
				const syncState: SyncState = state.syncState as SyncState || 'synced';
				const statusConfig: StatusConfig = {
					presence: 'connected',
					syncState: syncState,
					userRole: 'Dev',
					username: 'user'
				};
				statusBarWidget.update(statusConfig);
			}
		});
	}

	// Show initial claims available notification
	if (claimNotifications && isAuthenticated) {
		claimNotifications.showNewAvailableFeaturesEvent(['Dashboard Overview', 'My Claims', 'Risk Signals']);
	}
}

export function deactivate() {
	// Cleanup on extension deactivation
	if (gitPoller) {
		gitPoller.stop();
	}
	if (statusBarWidget) {
		statusBarWidget.dispose();
	}
	vscode.window.showInformationMessage('BMad Portal Hub extension deactivated');
}
