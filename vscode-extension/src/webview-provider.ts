/**
 * Web View Provider for Sidebar Dashboard
 *
 * This module implements the vscode.WebviewViewProvider API to render the sidebar dashboard.
 */

import * as vscode from 'vscode';
import { getWebviewContent } from './webview-content';
import { AuthManager } from './auth-manager';
import { JwtStorageManager } from './jwt-storage';
import { ApiClient, DashboardData } from './api-client';

export class DashboardWebviewViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'bmadPortal.dashboard';

	private _view?: vscode.WebviewView;
	private _authManager?: AuthManager;
	private _jwtStorage?: JwtStorageManager;
	private _apiClient?: ApiClient;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		authenticatedAuthManager?: AuthManager,
		authenticatedJwtStorage?: JwtStorageManager
	) {
		this._authManager = authenticatedAuthManager;
		this._jwtStorage = authenticatedJwtStorage;

		// Initialize API client with Backend Hub base URL
		const backendBaseUrl = vscode.workspace.getConfiguration('bmadPortal').get('backendUrl', 'https://api.bmad-portal.com');
		this._apiClient = new ApiClient(backendBaseUrl, null);
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
		try {
			// Get JWT token from storage
			const jwtToken = this._jwtStorage ? await this._jwtStorage.getJwtToken() : null;

			if (!jwtToken) {
				// Trigger re-authentication flow
				await this._handleReauthenticate();
				return;
			}

			// Update API client with JWT token
			if (this._apiClient) {
				this._apiClient.setJwtToken(jwtToken);
			}

			// Fetch actual dashboard data from Backend Hub using JWT token
			const apiClient = this._apiClient;
			if (!apiClient) {
				throw new Error('API client not initialized');
			}

			const dashboardData: DashboardData = await apiClient.getDashboardData();

			if (this._view) {
				this._view.webview.postMessage({
					command: 'dashboardDataReceived',
					data: dashboardData
				});
			}
		} catch (error) {
			console.error('Error fetching dashboard data:', error);

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
