/**
 * HTTP API Client for Backend Hub Connection
 *
 * This module implements an HTTP client for connecting to the Backend Hub's REST API endpoints.
 * It handles state reporting via HTTP POST requests instead of WebSocket (WebSocket native modules
 * are not supported in VS Code extension host environment).
 */

import * as vscode from 'vscode';

export interface GitStateReport {
	technicalIdentifier?: string;
	branch?: string;
	ahead: number;
	behind: number;
	inProgressAction: 'none' | 'rebase' | 'merge' | 'conflict';
	isBmadEnabled: boolean;
}

export interface DashboardDataMessage {
	type: 'dashboard_data' | 'repo_state' | 'claims' | 'risk_signals';
	data: any;
	timestamp?: number;
	isStale?: boolean;
	lastKnownTime?: string;
}

export class HttpApiClient {
	private backendHubUrl: string;
	private jwtToken: string | null;

	constructor(backendHubUrl: string, jwtToken: string | null) {
		this.backendHubUrl = backendHubUrl;
		this.jwtToken = jwtToken;
	}

	private getAuthHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (this.jwtToken) {
			headers['Authorization'] = `Bearer ${this.jwtToken}`;
		}
		return headers;
	}

	public async sendGitStateReport(state: GitStateReport): Promise<void> {
		const reportUrl = `${this.backendHubUrl}/api/git-state-report`;

		const report = {
			technical_identifier: state.technicalIdentifier,
			branch: state.branch,
			ahead: state.ahead,
			behind: state.behind,
			in_progress_action: state.inProgressAction,
			is_bmad_enabled: state.isBmadEnabled,
		};

		try {
			const response = await fetch(reportUrl, {
				method: 'POST',
				headers: this.getAuthHeaders(),
				body: JSON.stringify(report),
			});

			if (response.ok) {
				vscode.window.showInformationMessage('BMad Portal: Git state report sent to Backend Hub via HTTP.');
			} else {
				console.warn(`HTTP error sending git state report: ${response.status} ${response.statusText}`);
				vscode.window.showWarningMessage(`BMad Portal: Failed to send git state report: ${response.status}`);
			}
		} catch (error) {
			console.error('Error sending git state report via HTTP:', error);
			vscode.window.showWarningMessage(`BMad Portal: Git state report error: ${error}`);
		}
	}

	public async getDashboardData(): Promise<any> {
		const dashboardUrl = `${this.backendHubUrl}/api/dashboard/data`;

		try {
			const response = await fetch(dashboardUrl, {
				method: 'GET',
				headers: this.getAuthHeaders(),
			});

			if (response.ok) {
				const data = await response.json();
				vscode.window.showInformationMessage('BMad Portal: Dashboard data received via HTTP.');
				return data;
			} else {
				console.warn(`HTTP error fetching dashboard data: ${response.status} ${response.statusText}`);
				return null;
			}
		} catch (error) {
			console.error('Error fetching dashboard data via HTTP:', error);
			return null;
		}
	}
}
