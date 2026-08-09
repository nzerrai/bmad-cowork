/**
 * State Reporter for BMad Portal VS Code Extension
 *
 * This module provides Backend state reporting via WebSocket or HTTP REST.
 */

import * as vscode from 'vscode';
import { GitState } from './git-poller';

export interface StateReport {
	/** Contributor identity */
	userId?: string;
	/** Remote repo identity */
	remoteUrl?: string;
	/** Local Git state */
	gitState: GitState;
	/** Timestamp of the report */
	timestamp: number;
	/** Whether the record is stale (older than 30s) */
	isStale: boolean;
}

export class StateReporter {
	private backendHubUrl: string;
	private authToken?: string;
	private lastReportTimestamp?: number;

	constructor(private context: vscode.ExtensionContext) {
		const config = vscode.workspace.getConfiguration('bmadPortal');
		this.backendHubUrl = config.get<string>('backendHubUrl', 'http://localhost:3000');

		// In a real implementation, this would retrieve the JWT from vscode.SecretStorage
		// For now, we'll simulate the auth token retrieval
		this.authToken = this.getAuthToken();
	}

	public async reportGitState(state: GitState): Promise<void> {
		const report: StateReport = {
			userId: 'default-user', // Would be retrieved from auth context
			remoteUrl: state.remoteUrl,
			gitState: state,
			timestamp: Date.now(),
			isStale: this.isStaleReport(),
		};

		try {
			await this.sendReportToBackend(report);
			this.lastReportTimestamp = Date.now();
		} catch (error) {
			vscode.window.showWarningMessage(`BMad Portal: State report failed: ${error}`);
			throw error;
		}
	}

	private isStaleReport(): boolean {
		if (!this.lastReportTimestamp) {
			return false;
		}
		const timeSinceLastReport = Date.now() - this.lastReportTimestamp;
		return timeSinceLastReport > 30000; // 30 seconds threshold
	}

	private async sendReportToBackend(report: StateReport): Promise<void> {
		// In a real implementation, this would send via WebSocket or HTTP REST
		// For now, we'll use HTTP REST POST to the backend state reporting endpoint

		const endpoint = `${this.backendHubUrl}/api/v1/repo-state`;

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.authToken}`,
			},
			body: JSON.stringify(report),
		});

		if (!response.ok) {
			throw new Error(`Backend report failed with status ${response.status}`);
		}
	}

	private getAuthToken(): string | undefined {
		// In a real implementation, this would retrieve the JWT from vscode.SecretStorage
		// For now, we'll simulate the auth token retrieval
		const config = vscode.workspace.getConfiguration('bmadPortal');
		const authMethod = config.get<string>('authMethod', 'session');

		if (authMethod === 'jwt') {
			// Retrieve JWT from SecretStorage
			// return context.secrets.get('bmadPortal.jwtToken');
			return 'simulated-jwt-token';
		}

		return undefined;
	}
}
