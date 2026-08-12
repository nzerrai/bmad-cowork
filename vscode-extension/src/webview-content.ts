/**
 * Web View Content Generator
 *
 * This module generates the HTML/JS content for the web view with theme-adaptive
 * styling and accessibility compliance (WCAG AA contrast, full keyboard access).
 */

import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, theme: vscode.ColorTheme): string {
	// Determine theme-based colors based on VS Code theme kind
	// ColorThemeKind has: Light (1), Dark (2), HighContrast (3)
	const isDark = theme.kind === vscode.ColorThemeKind.Dark;
	const isHighContrast = theme.kind === vscode.ColorThemeKind.HighContrast;

	// CSS variables for theme adaptation
	const themeColors = {
		backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
		textColor: isDark ? '#cccccc' : '#333333',
		borderColor: isDark ? '#3e3e42' : '#e5e5e5',
		accentColor: '#007acc',
		successColor: '#4ec9b0',
		warningColor: '#dcdcaa',
		errorColor: '#f48771',
		infoColor: '#4fc1ff'
	};

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
	<title>BMad Portal Dashboard</title>
	<style>
		:root {
			--bg-color: ${themeColors.backgroundColor};
			--text-color: ${themeColors.textColor};
			--border-color: ${themeColors.borderColor};
			--accent-color: ${themeColors.accentColor};
			--success-color: ${themeColors.successColor};
			--warning-color: ${themeColors.warningColor};
			--error-color: ${themeColors.errorColor};
			--info-color: ${themeColors.infoColor};
		}

		* {
			box-sizing: border-box;
		}

		body {
			margin: 0;
			padding: 0;
			background-color: var(--bg-color);
			color: var(--text-color);
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
			line-height: 1.5;
			overflow-x: hidden;
		}

		/* Accessibility: Focus indicators for keyboard navigation */
		:focus {
			outline: 2px solid var(--accent-color);
			outline-offset: 2px;
		}

		/* WCAG AA Contrast Requirements */
		.status-indicator {
			font-weight: 600;
			padding: 4px 8px;
			border-radius: 4px;
			display: inline-block;
		}

		.status-synced {
			color: var(--success-color);
			background-color: ${isDark ? '#1a332f' : '#e8f8f5'};
		}

		.status-drift {
			color: var(--warning-color);
			background-color: ${isDark ? '#33301a' : '#fef9e7'};
		}

		.status-conflict {
			color: var(--error-color);
			background-color: ${isDark ? '#332020' : '#fdedec'};
		}

		.status-syncing-active {
			color: var(--info-color);
			background-color: ${isDark ? '#1a2a33' : '#ebf8fb'};
		}

		.status-claimed {
			color: var(--accent-color);
			background-color: ${isDark ? '#1a2a33' : '#ebf5fb'};
		}

		.status-idle-offline {
			color: var(--text-color);
			background-color: ${isDark ? '#333333' : '#f5f5f5'};
		}

		.dashboard-header {
			padding: 16px;
			border-bottom: 1px solid var(--border-color);
		}

		.dashboard-header h2 {
			margin: 0;
			font-size: 16px;
			font-weight: 600;
		}

		.dashboard-content {
			padding: 16px;
		}

		.dashboard-section {
			margin-bottom: 24px;
		}

		.dashboard-section h3 {
			margin: 0 0 12px 0;
			font-size: 14px;
			font-weight: 600;
			color: var(--text-color);
		}

		.dashboard-loading {
			text-align: center;
			padding: 32px 16px;
			color: var(--text-color);
		}

		.dashboard-error {
			text-align: center;
			padding: 32px 16px;
			color: var(--error-color);
		}

		/* Keyboard accessible buttons */
		.btn {
			display: inline-block;
			padding: 8px 16px;
			background-color: var(--accent-color);
			color: #ffffff;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
			text-decoration: none;
		}

		.btn:focus {
			outline: 2px solid var(--accent-color);
			outline-offset: 2px;
		}

		.btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	</style>
</head>
<body>
	<div class="dashboard-header">
		<h2>BMad Portal Dashboard</h2>
	</div>

	<div class="dashboard-content">
		<div id="loading-state" class="dashboard-loading">
			<p>Loading dashboard data...</p>
		</div>

		<div id="error-state" class="dashboard-error" style="display: none;">
			<p>Error loading dashboard data.</p>
			<button id="reauth-button" class="btn">Reauthenticate</button>
		</div>

		<div id="dashboard-data" style="display: none;">
			<!-- Repo State Section -->
			<div class="dashboard-section">
				<h3>Repository State</h3>
				<div id="repo-state-content">
					<span class="status-indicator status-synced" id="sync-status">Synced</span>
					<span id="repo-details">Ahead: 0, Behind: 0</span>
				</div>
			</div>

			<!-- Claims Section -->
			<div class="dashboard-section">
				<h3>Claims</h3>
				<div id="claims-content">
					<p>No active claims or available features.</p>
				</div>
			</div>

			<!-- Risk Signals Section -->
			<div class="dashboard-section">
				<h3>Risk Signals</h3>
				<div id="risk-signals-content">
					<p>No risk signals detected.</p>
				</div>
			</div>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		// Handle messages from VS Code extension
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.command) {
				case 'dashboardDataReceived':
					handleDashboardData(message.data);
					break;
				case 'dashboardDataError':
					handleDashboardError(message.error);
					break;
				case 'reauthenticationRequired':
					handleReauthenticationRequired();
					break;
				case 'themeChanged':
					handleThemeChange(message.themeKind);
					break;
				case 'refreshDashboard':
					requestDashboardData();
					break;
			}
		});

		// Request dashboard data on load
		requestDashboardData();

		function requestDashboardData() {
			vscode.postMessage({
				command: 'getDashboardData'
			});
		}

		function handleDashboardData(data) {
			// Hide loading state
			document.getElementById('loading-state').style.display = 'none';

			// Show dashboard data
			document.getElementById('dashboard-data').style.display = 'block';

			// Show staleness indicator if data is stale
			if (data.isStale && data.lastKnownTime) {
				const stalenessEl = document.createElement('div');
				stalenessEl.className = 'dashboard-staleness';
				stalenessEl.textContent = data.lastKnownTime;
				stalenessEl.style.padding = '8px 16px';
				stalenessEl.style.backgroundColor = 'var(--warning-color)';
				stalenessEl.style.color = 'var(--text-color)';
				stalenessEl.style.borderRadius = '4px';
				stalenessEl.style.marginBottom = '16px';
				document.getElementById('dashboard-data').prepend(stalenessEl);
			}

			// Update repo state
			if (data.repoState) {
				const syncStatusEl = document.getElementById('sync-status');
				syncStatusEl.className = 'status-indicator status-' + data.repoState.syncStatus;

				// Format sync status for display
				const syncStatusText = data.repoState.syncStatus === 'Idle-Offline' ? 'Idle-Offline' :
					data.repoState.syncStatus.charAt(0).toUpperCase() + data.repoState.syncStatus.slice(1).replace('-', ' ');
				syncStatusEl.textContent = syncStatusText;

				const repoDetailsEl = document.getElementById('repo-details');
				let details = 'Ahead: ' + (data.repoState.ahead || 0) + ', Behind: ' + (data.repoState.behind || 0);
				if (data.repoState.hasInProgressRebase) {
					details += ' | Rebase in progress';
				}
				if (data.repoState.hasInProgressMerge) {
					details += ' | Merge in progress';
				}
				if (data.repoState.hasInProgressConflict) {
					details += ' | Conflict detected';
				}
				repoDetailsEl.textContent = details;
			}

			// Update claims
			if (data.claims !== undefined) {
				const claimsEl = document.getElementById('claims-content');
				if (data.claims.length > 0) {
					const claimsList = data.claims.map(claim => {
						const statusText = claim.status === 'active' ? 'Active' :
							claim.status === 'available' ? 'Available' : 'Expired';
						return '<li>' + claim.title + ' (' + statusText + ')' + (claim.expiration ? ' - Expires: ' + claim.expiration : '') + '</li>';
					}).join('');
					claimsEl.innerHTML = '<ul style="margin: 0; padding-left: 20px;">' + claimsList + '</ul>';
				} else {
					claimsEl.innerHTML = '<p>No active claims or available features.</p>';
				}
			}

			// Update risk signals
			if (data.riskSignals !== undefined) {
				const riskSignalsEl = document.getElementById('risk-signals-content');
				if (data.riskSignals.length > 0) {
					const riskList = data.riskSignals.map(signal => {
						const typeText = signal.type === 'stale-story' ? 'Stale Story (> ' + signal.thresholdDays + ' days)' :
							signal.type === 'awaiting-review' ? 'PR Awaiting Review (> ' + signal.thresholdDays + ' hours)' :
							'Conflict Risk Module';
						return '<li>' + signal.description + ' (' + typeText + ')</li>';
					}).join('');
					riskSignalsEl.innerHTML = '<ul style="margin: 0; padding-left: 20px;">' + riskList + '</ul>';
				} else {
					riskSignalsEl.innerHTML = '<p>No risk signals detected.</p>';
				}
			}
		}

		function handleDashboardError(error) {
			console.error('Dashboard error:', error);
			document.getElementById('loading-state').style.display = 'none';
			document.getElementById('error-state').style.display = 'block';
		}

		function handleReauthenticationRequired() {
			document.getElementById('loading-state').style.display = 'none';
			document.getElementById('error-state').style.display = 'block';
		}

		// Reauthenticate button handler
		document.getElementById('reauth-button')?.addEventListener('click', () => {
			vscode.postMessage({
				command: 'reauthenticate'
			});
		});

		function handleThemeChange(themeKind) {
			// Update CSS variables based on theme kind
			// vscode.ColorThemeKind: Light=1, Dark=2, LightHighContrast=3, DarkHighContrast=4
			const isDark = themeKind === 2 || themeKind === 4; // Dark or DarkHighContrast

			document.documentElement.style.setProperty('--bg-color', isDark ? '#1e1e1e' : '#ffffff');
			document.documentElement.style.setProperty('--text-color', isDark ? '#cccccc' : '#333333');
			document.documentElement.style.setProperty('--border-color', isDark ? '#3e3e42' : '#e5e5e5');
		}
	</script>
</body>
</html>`;
}
