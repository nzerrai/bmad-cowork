/**
 * State Reporter for BMad Portal VS Code Extension
 *
 * This module provides Backend state reporting via HTTP REST API with git state reports.
 */

import * as vscode from 'vscode';
import { GitState } from './git-poller';
import { JwtStorageManager } from './jwt-storage';
import { HttpApiClient, GitStateReport } from './websocket-client';

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
	private jwtStorage: JwtStorageManager;
	private httpClient: HttpApiClient | null = null;
	private lastReportTimestamp?: number;

	constructor(private context: vscode.ExtensionContext) {
		const config = vscode.workspace.getConfiguration('bmadPortal');
		this.backendHubUrl = config.get<string>('backendHubUrl', 'http://localhost:8000');

		this.jwtStorage = new JwtStorageManager(context);

		// Initialize HTTP client
		this.initializeHttpClient();
	}

	private async initializeHttpClient(): Promise<void> {
		// Retrieve JWT from workspace settings or SecretStorage
		const settingsToken = vscode.workspace.getConfiguration('bmadPortal').get<string>('jwtToken');
		const jwtToken = settingsToken && settingsToken !== '' ? settingsToken : (await this.jwtStorage.getJwtToken() || null);

		this.httpClient = new HttpApiClient(this.backendHubUrl, jwtToken);
	}

	public async reportGitState(state: GitState): Promise<void> {
		// Retrieve JWT token
		const settingsToken = vscode.workspace.getConfiguration('bmadPortal').get<string>('jwtToken');
		const jwtToken = settingsToken && settingsToken !== '' ? settingsToken : await this.jwtStorage.getJwtToken();

		// Initialize HTTP client if not exists
		if (!this.httpClient) {
			vscode.window.showInformationMessage('BMad Portal: HTTP client not initialized, initializing...');
			this.httpClient = new HttpApiClient(this.backendHubUrl, jwtToken || null);
		}

		// Prepare Git state report
		const gitStateReport: GitStateReport = {
			technicalIdentifier: state.remoteUrl || 'unknown-repo',
			branch: this.extractBranchFromState(state),
			ahead: state.aheadCount,
			behind: state.behindCount,
			inProgressAction: this.determineInProgressAction(state),
			isBmadEnabled: true,
		};

		try {
			vscode.window.showInformationMessage('BMad Portal: Sending Git state report to Backend Hub via HTTP...');
			if (this.httpClient) {
				await this.httpClient.sendGitStateReport(gitStateReport);
			}
			this.lastReportTimestamp = Date.now();
			vscode.window.showInformationMessage('BMad Portal: Git state report sent successfully via HTTP.');
		} catch (error) {
			vscode.window.showWarningMessage(`BMad Portal: Git state report failed: ${error}`);
			console.debug('State report failed:', error);
			throw error;
		}
	}

	private extractBranchFromState(state: GitState): string {
		// In a real implementation, this would extract the current branch from the Git state
		// For now, return a default branch name
		return 'main';
	}

	private determineInProgressAction(state: GitState): 'none' | 'rebase' | 'merge' | 'conflict' {
		if (state.isRebasing) {
			return 'rebase';
		}
		if (state.isMerging) {
			return 'merge';
		}
		if (state.hasConflicts) {
			return 'conflict';
		}
		return 'none';
	}

	private isStaleReport(): boolean {
		if (!this.lastReportTimestamp) {
			return false;
		}
		const timeSinceLastReport = Date.now() - this.lastReportTimestamp;
		return timeSinceLastReport > 30000; // 30 seconds threshold
	}
}
