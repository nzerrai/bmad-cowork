/**
 * Git Polling Engine for BMad Portal VS Code Extension
 *
 * This module provides a configurable polling engine that detects local Git state
 * (remote repo identity, commits ahead/behind, in-progress rebase/merge/conflict)
 * and reports it to the Backend Hub.
 */

import * as vscode from 'vscode';
import { GitEventData, GitEventManager } from './git-events';

export interface GitState {
	/** The connected remote repo identity */
	remoteUrl?: string;
	/** Commits ahead of remote */
	aheadCount: number;
	/** Commits behind remote */
	behindCount: number;
	/** In-progress rebase status */
	isRebasing: boolean;
	/** In-progress merge status */
	isMerging: boolean;
	/** In-progress conflict status */
	hasConflicts: boolean;
	/** Overall sync state */
	syncState: 'synced' | 'drift' | 'conflict' | 'syncing-active';
	/** Whether the workspace is a Git repository */
	isGitRepo: boolean;
}

export class GitPoller {
	private pollingIntervalSec: number;
	private pollTimer: NodeJS.Timeout | undefined;
	private onStateChangeCallbacks: ((state: GitState) => void)[] = [];
	private gitEventManager: GitEventManager;

	constructor(private context: vscode.ExtensionContext) {
		const config = vscode.workspace.getConfiguration('bmadPortal');
		// Default to 300 seconds (5 minutes) as per Epic 7 requirements
		this.pollingIntervalSec = config.get<number>('repoPollingIntervalSec', 300);
		this.gitEventManager = new GitEventManager(context);

		// Listen for Git events and trigger immediate state uploads
		this.gitEventManager.onGitEvent(async (event: GitEventData) => {
			await this.handleGitEvent(event);
		});
	}

	public start(): void {
		vscode.window.showInformationMessage(`BMad Portal: Starting Git poller with interval: ${this.pollingIntervalSec} seconds.`);
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
		}

		// Initial poll
		vscode.window.showInformationMessage('BMad Portal: Performing initial Git state poll...');
		this.pollGitState();

		// Setup scheduled polling
		this.pollTimer = setInterval(() => {
			vscode.window.showInformationMessage('BMad Portal: Scheduled Git state poll triggered...');
			this.pollGitState();
		}, this.pollingIntervalSec * 1000);
	}

	public stop(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = undefined;
		}
	}

	public onStateChange(callback: (state: GitState) => void): void {
		this.onStateChangeCallbacks.push(callback);
	}

	private async pollGitState(forceUpload: boolean = false): Promise<void> {
		try {
			vscode.window.showInformationMessage('BMad Portal: Detecting local Git state...');
			const state = await this.detectGitState();
			vscode.window.showInformationMessage(`BMad Portal: Git state detected - Is Git Repo: ${state.isGitRepo}. Ahead: ${state.aheadCount}. Behind: ${state.behindCount}. Sync State: ${state.syncState}`);
			this.notifyStateChange(state);

			// If this is a force upload (from event override), notify the state reporter
			if (forceUpload) {
				vscode.window.showInformationMessage('BMad Portal: Force upload triggered from Git event override.');
				// The state reporter integration is handled in extension.ts
			}
		} catch (error) {
			vscode.window.showWarningMessage(`BMad Portal: Git state polling error: ${error}`);
		}
	}

	private async handleGitEvent(event: GitEventData): Promise<void> {
		// Trigger an immediate state upload (event-driven override)
		// This does not disrupt the scheduled poll timer
		vscode.window.showInformationMessage(`BMad Portal: Git event detected (${event.eventType}), triggering immediate state upload (event-driven polling)...`);

		// Force poll and upload state
		await this.pollGitState(true);
	}

	private async detectGitState(): Promise<GitState> {
		// Check if the current workspace is a Git repository
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return {
				isGitRepo: false,
				aheadCount: 0,
				behindCount: 0,
				isRebasing: false,
				isMerging: false,
				hasConflicts: false,
				syncState: 'synced',
			};
		}

		// Try to get Git repository info using vscode.git API
		try {
			// Note: In a real implementation, this would use vscode.git extension API
			// For now, we'll simulate the Git state detection
			const gitExtension = vscode.extensions.getExtension('vscode.git');
			if (gitExtension && gitExtension.isActive) {
				const gitApi = gitExtension.exports?.getAPI(1);
				if (gitApi && gitApi.repositories.length > 0) {
					const repo = gitApi.repositories[0];
					const gitState: GitState = {
						isGitRepo: true,
						remoteUrl: repo.ui.remote?.url || undefined,
						aheadCount: repo.status?.ahead || 0,
						behindCount: repo.status?.behind || 0,
						isRebasing: repo.status?.isRebasing || false,
						isMerging: repo.status?.isMerging || false,
						hasConflicts: repo.status?.hasConflicts || false,
						syncState: this.determineSyncState(repo.status),
					};
					return gitState;
				}
			}
		} catch (error) {
			// Fallback to non-Git state
		}

		// Fallback state for non-Git or un-detected repositories
		return {
			isGitRepo: true,
			aheadCount: 0,
			behindCount: 0,
			isRebasing: false,
			isMerging: false,
			hasConflicts: false,
			syncState: 'synced',
		};
	}

	private determineSyncState(status: any): 'synced' | 'drift' | 'conflict' | 'syncing-active' {
		if (status?.hasConflicts) {
			return 'conflict';
		}
		if (status?.isRebasing || status?.isMerging) {
			return 'syncing-active';
		}
		if (status?.ahead && status?.ahead > 0 || status?.behind && status?.behind > 0) {
			return 'drift';
		}
		return 'synced';
	}

	private notifyStateChange(state: GitState): void {
		for (const callback of this.onStateChangeCallbacks) {
			callback(state);
		}
	}
}
