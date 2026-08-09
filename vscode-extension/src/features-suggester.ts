/**
 * Features Suggester for BMad Portal VS Code Extension
 *
 * This module provides Command Palette integration for suggested features
 * based on JWT claims (role, permissions).
 */

import * as vscode from 'vscode';

export interface FeatureClaim {
	role: string;
	permissions: string[];
}

export interface SuggestedFeature {
	id: string;
	title: string;
	description: string;
	requiredRole?: string;
	requiredPermissions?: string[];
}

export class FeaturesSuggester {
	private context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
	}

	/**
	 * Register the "BMad Portal: Show Suggested Features" Command Palette command
	 */
	public registerCommand(): vscode.Disposable {
		return vscode.commands.registerCommand(
			'bmad-portal.showSuggestedFeatures',
			async () => {
				await this.showSuggestedFeatures();
			}
		);
	}

	/**
	 * Get suggested features based on resolved JWT claims (role, permissions)
	 * Mirroring the platform convention that role-gated capabilities are
	 * surfaced only when authorized, never shown-then-blocked.
	 */
	public getFeaturesForClaims(claims?: FeatureClaim): SuggestedFeature[] {
		if (!claims || !claims.role) {
			// Graceful degradation: no claims data, return features available to all
			return this.getAllFeatures();
		}

		const role = claims.role.toLowerCase();
		const permissions = claims.permissions || [];

		// Filter features based on role/claims
		const allFeatures = this.getAllFeatures();
		const suggestedFeatures: SuggestedFeature[] = [];

		for (const feature of allFeatures) {
			// Check if feature has role or permission requirements
			if (feature.requiredRole || feature.requiredPermissions) {
				// Check role requirement
				if (feature.requiredRole && feature.requiredRole.toLowerCase() !== role) {
					continue;
				}

				// Check permission requirements
				if (feature.requiredPermissions && feature.requiredPermissions.length > 0) {
					const hasRequiredPermission = feature.requiredPermissions.some(
						(reqPerm) => permissions.includes(reqPerm)
					);
					if (!hasRequiredPermission) {
						continue;
					}
				}
			}

			suggestedFeatures.push(feature);
		}

		return suggestedFeatures;
	}

	/**
	 * Show suggested features in the Command Palette or as a quick pick
	 */
	private async showSuggestedFeatures(): Promise<void> {
		// Get claims from extension context or auth manager
		// For now, we simulate with a basic claims structure
		const claims: FeatureClaim = {
			role: 'Dev',
			permissions: ['read:dashboard', 'read:claims', 'read:risk-signals']
		};

		const suggestedFeatures = this.getFeaturesForClaims(claims);

		if (suggestedFeatures.length === 0) {
			vscode.window.showInformationMessage('BMad Portal: No suggested features available for your role.');
			return;
		}

		// Create quick pick items
		const quickPickItems = suggestedFeatures.map(feature => ({
			label: feature.title,
			description: feature.description,
			detail: feature.requiredRole ? `Required role: ${feature.requiredRole}` : 'Available to all users',
			feature: feature
		}));

		const selected = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: 'Select a suggested feature to learn more',
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (selected && selected.feature) {
			vscode.window.showInformationMessage(
				`BMad Portal: ${selected.feature.title}\n\n${selected.feature.description}`
			);
		}
	}

	/**
	 * Get all available features (for filtering based on claims)
	 */
	private getAllFeatures(): SuggestedFeature[] {
		return [
			{
				id: 'dashboard-overview',
				title: 'Dashboard Overview',
				description: 'View the global Git + BMAD state (branches, PRs, sync status, Local vs Remote)'
			},
			{
				id: 'my-claims',
				title: 'My Claims',
				description: 'View and manage your active story claims and leases',
				requiredRole: 'Developer',
				requiredPermissions: ['read:claims']
			},
			{
				id: 'risk-signals',
				title: 'Risk Signals',
				description: 'View risk signals including stale stories, conflict-risk modules, and PRs awaiting review',
				requiredPermissions: ['read:risk-signals']
			},
			{
				id: 'sprint-status',
				title: 'Sprint Status',
				description: 'View sprint progress, stories done vs total, dates, and objectives',
				requiredRole: 'Developer',
				requiredPermissions: ['read:sprint']
			},
			{
				id: 'system-admin',
				title: 'System Administration',
				description: 'Configure Git/Repos, manage users/roles, and supervise platform governance',
				requiredRole: 'Admin',
				requiredPermissions: ['admin:system']
			}
		];
	}
}
