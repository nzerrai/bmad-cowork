/**
 * API Client for Backend Hub REST requests
 *
 * This module handles authentication using the JWT token stored in vscode.SecretStorage
 * and makes REST API requests to the Backend Hub.
 */

import * as vscode from 'vscode';

export interface DashboardData {
	status: 'connected' | 'absent' | 'error';
	repoState: {
		syncStatus: 'synced' | 'drift' | 'conflict' | 'syncing-active' | 'claimed' | 'Idle-Offline';
		ahead: number;
		behind: number;
		hasInProgressRebase?: boolean;
		hasInProgressMerge?: boolean;
		hasInProgressConflict?: boolean;
	};
	claims: Array<{
		id: string;
		title: string;
		status: 'active' | 'available' | 'expired';
		expiration?: string;
	}>;
	riskSignals: Array<{
		type: 'stale-story' | 'awaiting-review' | 'conflict-risk';
		description: string;
		thresholdDays: number;
	}>;
	lastKnownTime?: string;
	isStale?: boolean;
}

export class ApiClient {
	private baseUrl: string;
	private jwtToken: string | null;

	constructor(baseUrl: string, jwtToken: string | null) {
		this.baseUrl = baseUrl;
		this.jwtToken = jwtToken;
	}

	public setJwtToken(token: string | null): void {
		this.jwtToken = token;
	}

	public async getDashboardData(): Promise<DashboardData> {
		if (!this.jwtToken) {
			throw new Error('No JWT token available for authentication');
		}

		const response = await fetch(`${this.baseUrl}/api/dashboard/data`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.jwtToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw new Error('Authentication failed: JWT token expired or invalid');
			}
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		const data: any = await response.json();

		// Apply 30s staleness threshold
		if (data.timestamp) {
			const timestamp = new Date(data.timestamp).getTime();
			const now = Date.now();
			const ageMs = now - timestamp;
			const ageSeconds = ageMs / 1000;

			if (ageSeconds > 30) {
				data.isStale = true;
				data.lastKnownTime = `Last known — ${new Date(timestamp).toLocaleString()}`;
			}
		}

		return data as DashboardData;
	}

	public async getRiskSignals(): Promise<Array<{
		type: 'stale-story' | 'awaiting-review' | 'conflict-risk';
		description: string;
		thresholdDays: number;
	}>> {
		if (!this.jwtToken) {
			throw new Error('No JWT token available for authentication');
		}

		const response = await fetch(`${this.baseUrl}/api/risk-signals`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.jwtToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw new Error('Authentication failed: JWT token expired or invalid');
			}
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		const data: any = await response.json();

		// Ensure risk signal thresholds are fixed platform-wide:
		// - stories stale with no activity for more than 3 days
		// - PRs awaiting review for more than 48 hours

		return data.riskSignals || [];
	}
}
