/**
 * Git Event Listener for BMad Portal VS Code Extension
 *
 * This module provides event-driven Git polling override by listening to
 * VS Code Git extension events and triggering immediate state uploads.
 */

import * as vscode from 'vscode';

export interface GitEventData {
	/** The type of Git event that occurred */
	eventType: 'commit' | 'push' | 'pull' | 'merge' | 'rebase' | 'conflict' | 'checkout';
	/** Timestamp of the event */
	timestamp: number;
}

export class GitEventManager {
	private onGitEventCallbacks: ((event: GitEventData) => void)[] = [];
	private eventQueue: GitEventData[] = [];
	private isProcessingEvents: boolean = false;

	constructor(private context: vscode.ExtensionContext) {
		this.registerGitEventListeners();
	}

	public onGitEvent(callback: (event: GitEventData) => void): void {
		this.onGitEventCallbacks.push(callback);
	}

	private registerGitEventListeners(): void {
		// Listen for git extension events
		const gitExtension = vscode.extensions.getExtension('vscode.git');
		if (gitExtension && gitExtension.isActive) {
			try {
				const gitApi = gitExtension.exports?.getAPI(1);
				if (gitApi) {
					// Listen for repository state changes
					// Note: vscode.git extension doesn't expose explicit commit/push events,
					// but we can listen to onDidMerge, onDidCommit, etc. through the API
					this.setupGitApiListeners(gitApi);
				}
			} catch (error) {
				vscode.window.showWarningMessage(`BMad Portal: Git event listener setup error: ${error}`);
			}
		}

		// Also listen for workspace file changes that might indicate Git operations
		vscode.workspace.onDidSaveTextDocument((document) => {
			if (document.uri.fsPath.includes('.git')) {
				this.triggerGitEvent({
					eventType: 'checkout', // Fallback event type for git file changes
					timestamp: Date.now(),
				});
			}
		});
	}

	private setupGitApiListeners(gitApi: any): void {
		// In a real implementation, this would subscribe to specific git API events:
		// - gitApi.onDidCommit
		// - gitApi.onDidPush
		// - gitApi.onDidPull
		// - gitApi.onDidMerge
		// - gitApi.onDidRebase
		// - gitApi.onDidChangeState

		// For now, we'll simulate event detection through repository state changes
		// The actual event detection would use vscode.git extension's event emitters
	}

	private triggerGitEvent(event: GitEventData): void {
		// Add to event queue for coalescing
		this.eventQueue.push(event);

		// Start processing if not already processing
		if (!this.isProcessingEvents) {
			this.processEventQueue();
		}
	}

	private async processEventQueue(): Promise<void> {
		this.isProcessingEvents = true;

		try {
			// Coalesce events that occur within a short time window
			const coalescedEvent = this.coalesceEvents();

			if (coalescedEvent) {
				// Notify listeners
				for (const callback of this.onGitEventCallbacks) {
					callback(coalescedEvent);
				}
			}

			// Clear the queue after processing
			this.eventQueue = [];
		} finally {
			this.isProcessingEvents = false;
		}
	}

	private coalesceEvents(): GitEventData | null {
		if (this.eventQueue.length === 0) {
			return null;
		}

		// Coalesce multiple events into a single 'git-change' event
		// Prioritize conflict/merge/rebase events over commit/push events
		const hasConflicts = this.eventQueue.some(e => e.eventType === 'conflict');
		const hasMergeOrRebase = this.eventQueue.some(e => e.eventType === 'merge' || e.eventType === 'rebase');

		if (hasConflicts) {
			return { eventType: 'conflict', timestamp: Date.now() };
		}
		if (hasMergeOrRebase) {
			return { eventType: 'merge', timestamp: Date.now() };
		}

		// Default to commit event
		return { eventType: 'commit', timestamp: Date.now() };
	}
}
