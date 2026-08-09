/**
 * State Reporter for BMad Portal VS Code Extension
 *
 * This module provides Backend state reporting via WebSocket or HTTP REST.
 */

import * as vscode from 'vscode';
import { GitState } from './git-poller';
import { JwtStorageManager } from './jwt-storage';

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
	private jwtStorage: JwtStorageManager;

	constructor(private context: vscode.ExtensionContext) {
		const config = vscode.workspace.getConfiguration('bmadPortal');
		this.backendHubUrl = config.get<string>('backendHubUrl', 'http://localhost:3000');

		this.jwtStorage = new JwtStorageManager(context);
	}

	public async reportGitState(state: GitState): Promise<void> {
		// Ensure we have the latest auth token before reporting
		await this.updateAuthToken();

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
			// Check if the error is due to authentication failure (401 Unauthorized)
			if (error instanceof Error && error.message.includes('401')) {
				// Token expired or invalid, trigger re-authentication flow
				console.warn('Authentication failed during state report, token may be expired');
				// Clear the invalid token
				await this.jwtStorage.deleteJwtToken();
				this.authToken = undefined;

				vscode.window.showWarningMessage('BMad Portal: Session expired. Please re-authenticate.');
				throw new Error('Authentication required: session expired');
			}

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

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.authToken) {
			headers['Authorization'] = `Bearer ${this.authToken}`;
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(report),
		});

		if (!response.ok) {
			throw new Error(`Backend report failed with status ${response.status}`);
		}
	}

	private async updateAuthToken(): Promise<void> {
		// Retrieve JWT from SecretStorage
		this.authToken = await this.jwtStorage.getJwtToken();
	}
}
