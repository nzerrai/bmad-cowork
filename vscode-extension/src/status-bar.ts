/**
 * Status Bar Widget for BMad Portal VS Code Extension
 *
 * This module provides a Status Bar widget that displays sync status and user role,
 * implementing the presence/sync-state collapse rule.
 */

import * as vscode from 'vscode';

export type SyncState = 'synced' | 'drift' | 'conflict' | 'syncing-active' | 'claimed' | 'Idle-Offline';
export type PresenceState = 'connected' | 'absent';

export interface StatusConfig {
	presence: PresenceState;
	syncState: SyncState;
	userRole?: string;
	username?: string;
}

export class StatusBarWidget {
	private statusBarItem: vscode.StatusBarItem;
	private currentPresence: PresenceState = 'connected';
	private currentSyncState: SyncState = 'synced';
	private currentRole?: string;
	private currentUsername?: string;

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.command = 'bmad-portal.refreshDashboard';
		this.updateDisplay();
	}

	/**
	 * Update the status bar with new presence and sync-state
	 * Implements the presence/sync-state collapse rule:
	 * - if presence is absent, show `Idle-Offline` regardless of sync-state
	 * - otherwise show the sync-state value
	 */
	public update(config: StatusConfig): void {
		this.currentPresence = config.presence;
		this.currentSyncState = config.syncState;
		this.currentRole = config.userRole;
		this.currentUsername = config.username;

		this.updateDisplay();
	}

	/**
	 * Get the collapsed status based on presence/sync-state collapse rule
	 * If presence is absent, always return Idle-Offline regardless of sync-state
	 * Otherwise, return the sync-state value
	 */
	public getCollapsedStatus(): SyncState {
		if (this.currentPresence === 'absent') {
			return 'Idle-Offline';
		}
		return this.currentSyncState;
	}

	/**
	 * Get the display text for the status bar
	 */
	public getDisplayText(): string {
		const collapsedStatus = this.getCollapsedStatus();
		const statusIcon = this.getStatusIcon(collapsedStatus);

		if (this.currentRole && this.currentUsername) {
			return `${statusIcon} ${collapsedStatus} | ${this.currentRole}: ${this.currentUsername}`;
		}

		return `${statusIcon} ${collapsedStatus}`;
	}

	/**
	 * Get the status icon based on sync state
	 */
	private getStatusIcon(state: SyncState): string {
		switch (state) {
			case 'synced':
				return '🟢';
			case 'drift':
				return '🟡';
			case 'conflict':
				return '🔴';
			case 'syncing-active':
				return '🔄';
			case 'claimed':
				return '📌';
			case 'Idle-Offline':
				return '⚫';
			default:
				return '⚪';
		}
	}

	/**
	 * Update the status bar display
	 */
	private updateDisplay(): void {
		const displayText = this.getDisplayText();
		this.statusBarItem.text = displayText;
		this.statusBarItem.tooltip = `BMad Portal Status:\nPresence: ${this.currentPresence}\nSync State: ${this.currentSyncState}`;
		this.statusBarItem.show();
	}

	/**
	 * Dispose the status bar widget
	 */
	public dispose(): void {
		this.statusBarItem.dispose();
	}
}
