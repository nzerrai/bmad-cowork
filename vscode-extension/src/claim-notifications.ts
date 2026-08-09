/**
 * Claim Notifications for BMad Portal VS Code Extension
 *
 * This module provides non-intrusive Toast notifications for claims events
 * such as expiration or new available features.
 * Matches the platform's existing "Instant Notifications" interaction primitive.
 */

import * as vscode from 'vscode';

export type ClaimEventType = 'expiration' | 'new-available-features' | 'claim-accepted' | 'claim-rejected';

export interface ClaimEvent {
	type: ClaimEventType;
	title: string;
	message: string;
	severity: 'information' | 'warning' | 'error';
}

export class ClaimNotifications {
	private enableNotifications: boolean;

	constructor(enableNotifications: boolean = true) {
		this.enableNotifications = enableNotifications;
	}

	/**
	 * Show a non-intrusive Toast notification for a claims event
	 * Matches the platform's existing "Instant Notifications" interaction primitive
	 */
	public showClaimEvent(event: ClaimEvent): void {
		if (!this.enableNotifications) {
			return;
		}

		switch (event.severity) {
			case 'warning':
				vscode.window.showWarningMessage(`BMad Portal: ${event.title}\n${event.message}`, {
					modal: false
				});
				break;
			case 'error':
				vscode.window.showErrorMessage(`BMad Portal: ${event.title}\n${event.message}`, {
					modal: false
				});
				break;
			case 'information':
			default:
				vscode.window.showInformationMessage(`BMad Portal: ${event.title}\n${event.message}`, {
					modal: false
				});
				break;
		}
	}

	/**
	 * Show notification for claims expiration event
	 */
	public showExpirationEvent(claimTitle: string, expirationTime: string): void {
		const event: ClaimEvent = {
			type: 'expiration',
			title: 'Claim Expiration',
			message: `Your claim for "${claimTitle}" is expiring on ${expirationTime}. Please renew or re-claim if needed.`,
			severity: 'warning'
		};

		this.showClaimEvent(event);
	}

	/**
	 * Show notification for newly available features event
	 */
	public showNewAvailableFeaturesEvent(claims: string[]): void {
		const featureList = claims.join(', ');
		const event: ClaimEvent = {
			type: 'new-available-features',
			title: 'New Features Available',
			message: `New features are now available for your role: ${featureList}. Check the Command Palette for "BMad Portal: Show Suggested Features".`,
			severity: 'information'
		};

		this.showClaimEvent(event);
	}

	/**
	 * Show notification for claim accepted event
	 */
	public showClaimAcceptedEvent(claimTitle: string): void {
		const event: ClaimEvent = {
			type: 'claim-accepted',
			title: 'Claim Accepted',
			message: `Your claim for "${claimTitle}" has been accepted.`,
			severity: 'information'
		};

		this.showClaimEvent(event);
	}

	/**
	 * Show notification for claim rejected event
	 */
	public showClaimRejectedEvent(claimTitle: string, reason?: string): void {
		const event: ClaimEvent = {
			type: 'claim-rejected',
			title: 'Claim Rejected',
			message: `Your claim for "${claimTitle}" was rejected.${reason ? ` Reason: ${reason}` : ''} Please resynchronize with the Backend.`,
			severity: 'error'
		};

		this.showClaimEvent(event);
	}

	/**
	 * Enable or disable notifications
	 */
	public setEnabled(enabled: boolean): void {
		this.enableNotifications = enabled;
	}

	/**
	 * Check if notifications are enabled
	 */
	public isEnabled(): boolean {
		return this.enableNotifications;
	}
}
