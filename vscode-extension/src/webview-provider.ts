/**
 * Web View Provider for Sidebar Dashboard
 *
 * This module implements the vscode.WebviewViewProvider API to render the sidebar dashboard.
 * It uses WebSocket for receiving dashboard data from the Backend Hub.
 */

import * as vscode from 'vscode';
import { getWebviewContent } from './webview-content';
import { AuthManager } from './auth-manager';
import { JwtStorageManager } from './jwt-storage';
import { ApiClient, DashboardData } from './api-client';
import { HttpApiClient } from './websocket-client';

export class DashboardWebviewViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'bmadPortal.dashboard';

	private _view?: vscode.WebviewView;
	private _authManager?: AuthManager;
	private _jwtStorage?: JwtStorageManager;
	private _apiClient?: ApiClient;
	private _httpClient?: HttpApiClient;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		authenticatedAuthManager?: AuthManager,
		authenticatedJwtStorage?: JwtStorageManager
	) {
		this._authManager = authenticatedAuthManager;
		this._jwtStorage = authenticatedJwtStorage;

		// Initialize API client with Backend Hub base URL
		const backendHubUrl = vscode.workspace.getConfiguration('bmadPortal').get('backendHubUrl', 'http://localhost:8000');
		vscode.window.showInformationMessage(`BMad Portal: Initializing API client with Backend Hub URL: ${backendHubUrl}`);
		this._apiClient = new ApiClient(backendHubUrl, null);

		// Initialize HTTP client for dashboard data
		this.initializeHttpClient(backendHubUrl);
	}

	private async initializeHttpClient(backendHubUrl: string): Promise<void> {
		// Retrieve JWT from workspace settings or SecretStorage
		const settingsToken = vscode.workspace.getConfiguration('bmadPortal').get<string>('jwtToken');
		const jwtToken = settingsToken && settingsToken !== '' ? settingsToken : (this._jwtStorage ? await this._jwtStorage.getJwtToken() : null);

		this._httpClient = new HttpApiClient(backendHubUrl, jwtToken || null);

		// Request dashboard data update on init
		if (this._view) {
			this.refreshDashboard();
		}
	}

	public resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._context.extensionUri]
		};

		webviewView.webview.html = this._getWebviewContent(webviewView.webview);

		// Listen for webview messages
		webviewView.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case 'getDashboardData':
					await this._handleGetDashboardData(webviewView.webview);
					break;
				case 'reauthenticate':
					await this._handleReauthenticate();
					break;
				default:
					console.warn('Webview provider: unknown command received', message.command);
			}
		});

		// Listen for theme changes
		const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme((theme: vscode.ColorTheme) => {
			this._updateTheme(webviewView.webview, theme);
		});
		webviewView.onDidDispose(() => {
			themeChangeDisposable.dispose();
		});
	}

	private _getWebviewContent(webview: vscode.Webview): string {
		const currentTheme = vscode.window.activeColorTheme;
		return getWebviewContent(webview, this._context.extensionUri, currentTheme);
	}

	private async _handleGetDashboardData(webview: vscode.Webview): Promise<void> {
		vscode.window.showInformationMessage('BMad Portal: Fetching dashboard data from Backend Hub via HTTP...');

		try {
			// Get JWT token from workspace settings or storage
			const settingsToken = vscode.workspace.getConfiguration('bmadPortal').get<string>('jwtToken');
			const jwtToken = settingsToken && settingsToken !== '' ? settingsToken : (this._jwtStorage ? await this._jwtStorage.getJwtToken() : null);

			if (!jwtToken) {
				vscode.window.showWarningMessage('BMad Portal: No JWT token available for dashboard. Please ensure token is configured in .vscode/settings.json');
				// Trigger re-authentication flow
				await this._handleReauthenticate();
				return;
			}

			vscode.window.showInformationMessage('BMad Portal: JWT token found. Preparing dashboard view...');

			// Initialize HTTP client if not exists
			if (!this._httpClient) {
				const backendHubUrl = vscode.workspace.getConfiguration('bmadPortal').get('backendHubUrl', 'http://localhost:8000');
				this._httpClient = new HttpApiClient(backendHubUrl, jwtToken);
			}

			// Fetch dashboard data via HTTP
			const dashboardData = await this._httpClient.getDashboardData();

			if (dashboardData) {
				if (this._view) {
					this._view.webview.postMessage({
						command: 'dashboardDataReceived',
						data: dashboardData
					});
					vscode.window.showInformationMessage('BMad Portal: Dashboard data received via HTTP.');
				}
			} else {
				// Fallback to initial mock data if HTTP request fails
				const initialDashboardData: DashboardData = {
					status: 'absent',
					repoState: {
						syncStatus: 'Idle-Offline',
						ahead: 0,
						behind: 0,
						hasInProgressRebase: false,
						hasInProgressMerge: false,
						hasInProgressConflict: false
					},
					claims: [],
					riskSignals: [],
					lastKnownTime: new Date().toLocaleString(),
					isStale: false
				};

				if (this._view) {
					this._view.webview.postMessage({
						command: 'dashboardDataReceived',
						data: initialDashboardData
					});
					vscode.window.showInformationMessage('BMad Portal: Dashboard view initialized with initial state.');
				}
			}
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
			vscode.window.showWarningMessage(`BMad Portal: Dashboard data error: ${error}`);

			// Handle authentication errors by triggering re-authentication
			if (error instanceof Error && (error.message.includes('JWT token expired or invalid') || error.message.includes('No JWT token available'))) {
				await this._handleReauthenticate();
				return;
			}

			if (this._view) {
				this._view.webview.postMessage({
					command: 'dashboardDataError',
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}
	}

	private async _handleReauthenticate(): Promise<void> {
		if (this._authManager) {
			// Trigger re-authentication flow
			await this._authManager.handleTokenExpiration();
		}

		if (this._view) {
			this._view.webview.postMessage({
				command: 'reauthenticationRequired'
			});
		}
	}

	private _updateTheme(webview: vscode.Webview, theme: vscode.ColorTheme): void {
		// Send theme change message to webview
		if (this._view) {
			this._view.webview.postMessage({
				command: 'themeChanged',
				themeKind: theme.kind
			});
		}
	}

	public async refreshDashboard(): Promise<void> {
		if (this._view) {
			this._view.webview.postMessage({
				command: 'refreshDashboard'
			});
		}
	}
}
