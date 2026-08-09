/**
 * Web View Provider for Sidebar Dashboard
 *
 * This module implements the vscode.WebviewViewProvider API to render the sidebar dashboard.
 */

import * as vscode from 'vscode';
import { getWebviewContent } from './webview-content';
import { AuthManager } from './auth-manager';
import { JwtStorageManager } from './jwt-storage';

export class DashboardWebviewViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'bmadPortal.dashboard';

	private _view?: vscode.WebviewView;
	private _authManager?: AuthManager;
	private _jwtStorage?: JwtStorageManager;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		authenticatedAuthManager?: AuthManager,
		authenticatedJwtStorage?: JwtStorageManager
	) {
		this._authManager = authenticatedAuthManager;
		this._jwtStorage = authenticatedJwtStorage;
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

			// TODO: Fetch actual dashboard data from Backend Hub using JWT token
			// For now, send mock data structure
			const dashboardData = {
				status: 'connected',
				repoState: {
					syncStatus: 'synced',
					ahead: 0,
					behind: 0
				},
				claims: [],
				riskSignals: []
			};

			if (this._view) {
				this._view.webview.postMessage({
					command: 'dashboardDataReceived',
					data: dashboardData
				});
			}
		} catch (error) {
			console.error('Error fetching dashboard data:', error);
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
