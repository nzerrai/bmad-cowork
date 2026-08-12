"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  authManager: () => authManager,
  claimNotifications: () => claimNotifications,
  dashboardWebviewProvider: () => dashboardWebviewProvider,
  deactivate: () => deactivate,
  featuresSuggester: () => featuresSuggester,
  gitPoller: () => gitPoller,
  jwtStorage: () => jwtStorage,
  stateReporter: () => stateReporter,
  statusBarWidget: () => statusBarWidget
});
module.exports = __toCommonJS(extension_exports);
var vscode11 = __toESM(require("vscode"));

// src/git-poller.ts
var vscode2 = __toESM(require("vscode"));

// src/git-events.ts
var vscode = __toESM(require("vscode"));
var GitEventManager = class {
  constructor(context) {
    this.context = context;
    this.registerGitEventListeners();
  }
  context;
  onGitEventCallbacks = [];
  eventQueue = [];
  isProcessingEvents = false;
  onGitEvent(callback) {
    this.onGitEventCallbacks.push(callback);
  }
  registerGitEventListeners() {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension && gitExtension.isActive) {
      try {
        const gitApi = gitExtension.exports?.getAPI(1);
        if (gitApi) {
          this.setupGitApiListeners(gitApi);
        }
      } catch (error) {
        vscode.window.showWarningMessage(`BMad Portal: Git event listener setup error: ${error}`);
      }
    }
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (document.uri.fsPath.includes(".git")) {
        this.triggerGitEvent({
          eventType: "checkout",
          // Fallback event type for git file changes
          timestamp: Date.now()
        });
      }
    });
  }
  setupGitApiListeners(gitApi) {
  }
  triggerGitEvent(event) {
    this.eventQueue.push(event);
    if (!this.isProcessingEvents) {
      this.processEventQueue();
    }
  }
  async processEventQueue() {
    this.isProcessingEvents = true;
    try {
      const coalescedEvent = this.coalesceEvents();
      if (coalescedEvent) {
        for (const callback of this.onGitEventCallbacks) {
          callback(coalescedEvent);
        }
      }
      this.eventQueue = [];
    } finally {
      this.isProcessingEvents = false;
    }
  }
  coalesceEvents() {
    if (this.eventQueue.length === 0) {
      return null;
    }
    const hasConflicts = this.eventQueue.some((e) => e.eventType === "conflict");
    const hasMergeOrRebase = this.eventQueue.some((e) => e.eventType === "merge" || e.eventType === "rebase");
    if (hasConflicts) {
      return { eventType: "conflict", timestamp: Date.now() };
    }
    if (hasMergeOrRebase) {
      return { eventType: "merge", timestamp: Date.now() };
    }
    return { eventType: "commit", timestamp: Date.now() };
  }
};

// src/git-poller.ts
var GitPoller = class {
  constructor(context) {
    this.context = context;
    const config = vscode2.workspace.getConfiguration("bmadPortal");
    this.pollingIntervalSec = config.get("repoPollingIntervalSec", 300);
    this.gitEventManager = new GitEventManager(context);
    this.gitEventManager.onGitEvent(async (event) => {
      await this.handleGitEvent(event);
    });
  }
  context;
  pollingIntervalSec;
  pollTimer;
  onStateChangeCallbacks = [];
  gitEventManager;
  start() {
    vscode2.window.showInformationMessage(`BMad Portal: Starting Git poller with interval: ${this.pollingIntervalSec} seconds.`);
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    vscode2.window.showInformationMessage("BMad Portal: Performing initial Git state poll...");
    this.pollGitState();
    this.pollTimer = setInterval(() => {
      vscode2.window.showInformationMessage("BMad Portal: Scheduled Git state poll triggered...");
      this.pollGitState();
    }, this.pollingIntervalSec * 1e3);
  }
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = void 0;
    }
  }
  onStateChange(callback) {
    this.onStateChangeCallbacks.push(callback);
  }
  async pollGitState(forceUpload = false) {
    try {
      vscode2.window.showInformationMessage("BMad Portal: Detecting local Git state...");
      const state = await this.detectGitState();
      vscode2.window.showInformationMessage(`BMad Portal: Git state detected - Is Git Repo: ${state.isGitRepo}. Ahead: ${state.aheadCount}. Behind: ${state.behindCount}. Sync State: ${state.syncState}`);
      this.notifyStateChange(state);
      if (forceUpload) {
        vscode2.window.showInformationMessage("BMad Portal: Force upload triggered from Git event override.");
      }
    } catch (error) {
      vscode2.window.showWarningMessage(`BMad Portal: Git state polling error: ${error}`);
    }
  }
  async handleGitEvent(event) {
    vscode2.window.showInformationMessage(`BMad Portal: Git event detected (${event.eventType}), triggering immediate state upload (event-driven polling)...`);
    await this.pollGitState(true);
  }
  async detectGitState() {
    const workspaceFolders = vscode2.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return {
        isGitRepo: false,
        aheadCount: 0,
        behindCount: 0,
        isRebasing: false,
        isMerging: false,
        hasConflicts: false,
        syncState: "synced"
      };
    }
    try {
      const gitExtension = vscode2.extensions.getExtension("vscode.git");
      if (gitExtension && gitExtension.isActive) {
        const gitApi = gitExtension.exports?.getAPI(1);
        if (gitApi && gitApi.repositories.length > 0) {
          const repo = gitApi.repositories[0];
          const gitState = {
            isGitRepo: true,
            remoteUrl: repo.ui.remote?.url || void 0,
            aheadCount: repo.status?.ahead || 0,
            behindCount: repo.status?.behind || 0,
            isRebasing: repo.status?.isRebasing || false,
            isMerging: repo.status?.isMerging || false,
            hasConflicts: repo.status?.hasConflicts || false,
            syncState: this.determineSyncState(repo.status)
          };
          return gitState;
        }
      }
    } catch (error) {
    }
    return {
      isGitRepo: true,
      aheadCount: 0,
      behindCount: 0,
      isRebasing: false,
      isMerging: false,
      hasConflicts: false,
      syncState: "synced"
    };
  }
  determineSyncState(status) {
    if (status?.hasConflicts) {
      return "conflict";
    }
    if (status?.isRebasing || status?.isMerging) {
      return "syncing-active";
    }
    if (status?.ahead && status?.ahead > 0 || status?.behind && status?.behind > 0) {
      return "drift";
    }
    return "synced";
  }
  notifyStateChange(state) {
    for (const callback of this.onStateChangeCallbacks) {
      callback(state);
    }
  }
};

// src/state-reporter.ts
var vscode4 = __toESM(require("vscode"));

// src/jwt-storage.ts
var JWT_STORAGE_KEY = "bmadPortal.jwtToken";
var JwtStorageManager = class {
  constructor(context) {
    this.context = context;
  }
  context;
  /**
   * Store a JWT token securely in VS Code SecretStorage
   * @param token The JWT token to store
   */
  async storeJwtToken(token) {
    try {
      await this.context.secrets.store(JWT_STORAGE_KEY, token);
    } catch (error) {
      console.error("Failed to store JWT token in SecretStorage:", error);
      throw new Error(`JWT storage failed: ${error}`);
    }
  }
  /**
   * Retrieve a JWT token securely from VS Code SecretStorage
   * @returns The stored JWT token, or undefined if not found
   */
  async getJwtToken() {
    try {
      return await this.context.secrets.get(JWT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to retrieve JWT token from SecretStorage:", error);
      return void 0;
    }
  }
  /**
   * Delete a JWT token from VS Code SecretStorage
   */
  async deleteJwtToken() {
    try {
      await this.context.secrets.delete(JWT_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to delete JWT token from SecretStorage:", error);
    }
  }
  /**
   * Check if a JWT token is stored
   * @returns True if a token is stored, false otherwise
   */
  async hasJwtToken() {
    const token = await this.getJwtToken();
    return token !== void 0 && token !== "";
  }
};

// src/websocket-client.ts
var vscode3 = __toESM(require("vscode"));
var HttpApiClient = class {
  backendHubUrl;
  jwtToken;
  constructor(backendHubUrl, jwtToken) {
    this.backendHubUrl = backendHubUrl;
    this.jwtToken = jwtToken;
  }
  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.jwtToken) {
      headers["Authorization"] = `Bearer ${this.jwtToken}`;
    }
    return headers;
  }
  async sendGitStateReport(state) {
    const reportUrl = `${this.backendHubUrl}/api/git-state-report`;
    const report = {
      technical_identifier: state.technicalIdentifier,
      branch: state.branch,
      ahead: state.ahead,
      behind: state.behind,
      in_progress_action: state.inProgressAction,
      is_bmad_enabled: state.isBmadEnabled
    };
    try {
      const response = await fetch(reportUrl, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(report)
      });
      if (response.ok) {
        vscode3.window.showInformationMessage("BMad Portal: Git state report sent to Backend Hub via HTTP.");
      } else {
        console.warn(`HTTP error sending git state report: ${response.status} ${response.statusText}`);
        vscode3.window.showWarningMessage(`BMad Portal: Failed to send git state report: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending git state report via HTTP:", error);
      vscode3.window.showWarningMessage(`BMad Portal: Git state report error: ${error}`);
    }
  }
  async getDashboardData() {
    const dashboardUrl = `${this.backendHubUrl}/api/dashboard/data`;
    try {
      const response = await fetch(dashboardUrl, {
        method: "GET",
        headers: this.getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        vscode3.window.showInformationMessage("BMad Portal: Dashboard data received via HTTP.");
        return data;
      } else {
        console.warn(`HTTP error fetching dashboard data: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching dashboard data via HTTP:", error);
      return null;
    }
  }
};

// src/state-reporter.ts
var StateReporter = class {
  constructor(context) {
    this.context = context;
    const config = vscode4.workspace.getConfiguration("bmadPortal");
    this.backendHubUrl = config.get("backendHubUrl", "http://localhost:8000");
    this.jwtStorage = new JwtStorageManager(context);
    this.initializeHttpClient();
  }
  context;
  backendHubUrl;
  jwtStorage;
  httpClient = null;
  lastReportTimestamp;
  async initializeHttpClient() {
    const settingsToken = vscode4.workspace.getConfiguration("bmadPortal").get("jwtToken");
    const jwtToken = settingsToken && settingsToken !== "" ? settingsToken : await this.jwtStorage.getJwtToken() || null;
    this.httpClient = new HttpApiClient(this.backendHubUrl, jwtToken);
  }
  async reportGitState(state) {
    const settingsToken = vscode4.workspace.getConfiguration("bmadPortal").get("jwtToken");
    const jwtToken = settingsToken && settingsToken !== "" ? settingsToken : await this.jwtStorage.getJwtToken();
    if (!this.httpClient) {
      vscode4.window.showInformationMessage("BMad Portal: HTTP client not initialized, initializing...");
      this.httpClient = new HttpApiClient(this.backendHubUrl, jwtToken || null);
    }
    const gitStateReport = {
      technicalIdentifier: state.remoteUrl || "unknown-repo",
      branch: this.extractBranchFromState(state),
      ahead: state.aheadCount,
      behind: state.behindCount,
      inProgressAction: this.determineInProgressAction(state),
      isBmadEnabled: true
    };
    try {
      vscode4.window.showInformationMessage("BMad Portal: Sending Git state report to Backend Hub via HTTP...");
      if (this.httpClient) {
        await this.httpClient.sendGitStateReport(gitStateReport);
      }
      this.lastReportTimestamp = Date.now();
      vscode4.window.showInformationMessage("BMad Portal: Git state report sent successfully via HTTP.");
    } catch (error) {
      vscode4.window.showWarningMessage(`BMad Portal: Git state report failed: ${error}`);
      console.debug("State report failed:", error);
      throw error;
    }
  }
  extractBranchFromState(state) {
    return "main";
  }
  determineInProgressAction(state) {
    if (state.isRebasing) {
      return "rebase";
    }
    if (state.isMerging) {
      return "merge";
    }
    if (state.hasConflicts) {
      return "conflict";
    }
    return "none";
  }
  isStaleReport() {
    if (!this.lastReportTimestamp) {
      return false;
    }
    const timeSinceLastReport = Date.now() - this.lastReportTimestamp;
    return timeSinceLastReport > 3e4;
  }
};

// src/auth-manager.ts
var vscode5 = __toESM(require("vscode"));
var AuthManager = class {
  constructor(context) {
    this.context = context;
    this.jwtStorage = new JwtStorageManager(context);
  }
  context;
  jwtStorage;
  authToken;
  isAuthenticated = false;
  onAuthChangedCallbacks = [];
  /**
   * Get JWT token from workspace settings or SecretStorage
   * @returns The JWT token, or undefined if not found
   */
  async getJwtTokenFromSettingsOrStorage() {
    const settingsToken = vscode5.workspace.getConfiguration("bmadPortal").get("jwtToken");
    if (settingsToken && settingsToken !== "") {
      console.log("Using JWT token from workspace settings");
      return settingsToken;
    }
    const storageToken = await this.jwtStorage.getJwtToken();
    if (storageToken && storageToken !== "") {
      console.log("Using JWT token from SecretStorage");
      return storageToken;
    }
    return void 0;
  }
  /**
   * Initialize the authentication manager
   */
  async initialize() {
    const token = await this.getJwtTokenFromSettingsOrStorage();
    if (token && token !== "") {
      this.authToken = token;
      this.isAuthenticated = true;
      this.notifyAuthChanged();
    }
  }
  /**
   * Authenticate with the Backend Hub and store the JWT token
   * @param token The JWT token received from the Backend
   */
  async authenticateWithToken(token) {
    if (!token || token === "") {
      throw new Error("Invalid token provided for authentication");
    }
    try {
      await this.jwtStorage.storeJwtToken(token);
      this.authToken = token;
      this.isAuthenticated = true;
      this.notifyAuthChanged();
      vscode5.window.showInformationMessage("BMad Portal: Successfully authenticated");
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error(`Authentication failed: ${error}`);
    }
  }
  /**
   * Handle token expiration or invalidation
   * Triggers re-authentication flow
   */
  async handleTokenExpiration() {
    console.warn("JWT token expired or invalid, triggering re-authentication flow");
    await this.jwtStorage.deleteJwtToken();
    this.authToken = void 0;
    this.isAuthenticated = false;
    this.notifyAuthChanged();
    vscode5.window.showWarningMessage("BMad Portal: Your session has expired. Please re-authenticate.");
    await this.promptReauthentication();
  }
  /**
   * Check if the user is authenticated
   * @returns True if authenticated, false otherwise
   */
  isAuthenticatedState() {
    return this.isAuthenticated;
  }
  /**
   * Get the current auth token
   * @returns The auth token, or undefined if not authenticated
   */
  getAuthToken() {
    return this.authToken;
  }
  /**
   * Register a callback for authentication state changes
   * @param callback Function to call when auth state changes
   */
  onAuthChanged(callback) {
    this.onAuthChangedCallbacks.push(callback);
  }
  /**
   * Unregister a callback for authentication state changes
   * @param callback Function to remove
   */
  offAuthChanged(callback) {
    const index = this.onAuthChangedCallbacks.indexOf(callback);
    if (index > -1) {
      this.onAuthChangedCallbacks.splice(index, 1);
    }
  }
  notifyAuthChanged() {
    for (const callback of this.onAuthChangedCallbacks) {
      callback(this.isAuthenticated, this.authToken);
    }
  }
  async promptReauthentication() {
    const result = await vscode5.window.showWarningMessage(
      "BMad Portal: Session expired. Click here to re-authenticate.",
      "Reauthenticate",
      "Cancel"
    );
    if (result === "Reauthenticate") {
      await this.login();
    }
  }
  /**
   * Prompt for email/password, exchange them for a JWT via the Backend
   * Hub's `POST /auth/login`, and store the resulting token.
   * @returns True if authentication succeeded, false if cancelled or failed
   */
  async login() {
    const backendHubUrl = vscode5.workspace.getConfiguration("bmadPortal").get("backendHubUrl", "http://localhost:8000");
    const email = await vscode5.window.showInputBox({
      title: "BMad Portal: Login",
      prompt: "Email",
      placeHolder: "you@example.com",
      ignoreFocusOut: true
    });
    if (!email) {
      return false;
    }
    const password = await vscode5.window.showInputBox({
      title: "BMad Portal: Login",
      prompt: "Password",
      password: true,
      ignoreFocusOut: true
    });
    if (!password) {
      return false;
    }
    try {
      const response = await fetch(`${backendHubUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const message = response.status === 401 ? "Invalid email or password." : `Login failed: ${response.status} ${response.statusText}`;
        vscode5.window.showErrorMessage(`BMad Portal: ${message}`);
        return false;
      }
      const body = await response.json();
      if (!body.access_token) {
        vscode5.window.showErrorMessage("BMad Portal: Login response did not include an access token.");
        return false;
      }
      await this.authenticateWithToken(body.access_token);
      return true;
    } catch (error) {
      vscode5.window.showErrorMessage(`BMad Portal: Could not reach Backend Hub at ${backendHubUrl}: ${error}`);
      return false;
    }
  }
};

// src/webview-provider.ts
var vscode7 = __toESM(require("vscode"));

// src/webview-content.ts
var vscode6 = __toESM(require("vscode"));
function getWebviewContent(webview, extensionUri, theme) {
  const isDark = theme.kind === vscode6.ColorThemeKind.Dark;
  const isHighContrast = theme.kind === vscode6.ColorThemeKind.HighContrast;
  const themeColors = {
    backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
    textColor: isDark ? "#cccccc" : "#333333",
    borderColor: isDark ? "#3e3e42" : "#e5e5e5",
    accentColor: "#007acc",
    successColor: "#4ec9b0",
    warningColor: "#dcdcaa",
    errorColor: "#f48771",
    infoColor: "#4fc1ff"
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
			background-color: ${isDark ? "#1a332f" : "#e8f8f5"};
		}

		.status-drift {
			color: var(--warning-color);
			background-color: ${isDark ? "#33301a" : "#fef9e7"};
		}

		.status-conflict {
			color: var(--error-color);
			background-color: ${isDark ? "#332020" : "#fdedec"};
		}

		.status-syncing-active {
			color: var(--info-color);
			background-color: ${isDark ? "#1a2a33" : "#ebf8fb"};
		}

		.status-claimed {
			color: var(--accent-color);
			background-color: ${isDark ? "#1a2a33" : "#ebf5fb"};
		}

		.status-idle-offline {
			color: var(--text-color);
			background-color: ${isDark ? "#333333" : "#f5f5f5"};
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

// src/api-client.ts
var ApiClient = class {
  baseUrl;
  jwtToken;
  constructor(baseUrl, jwtToken) {
    this.baseUrl = baseUrl;
    this.jwtToken = jwtToken;
  }
  setJwtToken(token) {
    this.jwtToken = token;
  }
  async getDashboardData() {
    if (!this.jwtToken) {
      throw new Error("No JWT token available for authentication");
    }
    const response = await fetch(`${this.baseUrl}/api/dashboard/data`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.jwtToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Authentication failed: JWT token expired or invalid");
      }
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.timestamp) {
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      const ageMs = now - timestamp;
      const ageSeconds = ageMs / 1e3;
      if (ageSeconds > 30) {
        data.isStale = true;
        data.lastKnownTime = `Last known \u2014 ${new Date(timestamp).toLocaleString()}`;
      }
    }
    return data;
  }
  async getRiskSignals() {
    if (!this.jwtToken) {
      throw new Error("No JWT token available for authentication");
    }
    const response = await fetch(`${this.baseUrl}/api/risk-signals`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.jwtToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Authentication failed: JWT token expired or invalid");
      }
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.riskSignals || [];
  }
};

// src/webview-provider.ts
var DashboardWebviewViewProvider = class {
  constructor(_context, authenticatedAuthManager, authenticatedJwtStorage) {
    this._context = _context;
    this._authManager = authenticatedAuthManager;
    this._jwtStorage = authenticatedJwtStorage;
    const backendHubUrl = vscode7.workspace.getConfiguration("bmadPortal").get("backendHubUrl", "http://localhost:8000");
    vscode7.window.showInformationMessage(`BMad Portal: Initializing API client with Backend Hub URL: ${backendHubUrl}`);
    this._apiClient = new ApiClient(backendHubUrl, null);
    this.initializeHttpClient(backendHubUrl);
  }
  _context;
  static viewType = "bmadPortal.dashboard";
  _view;
  _authManager;
  _jwtStorage;
  _apiClient;
  _httpClient;
  async initializeHttpClient(backendHubUrl) {
    const settingsToken = vscode7.workspace.getConfiguration("bmadPortal").get("jwtToken");
    const jwtToken = settingsToken && settingsToken !== "" ? settingsToken : this._jwtStorage ? await this._jwtStorage.getJwtToken() : null;
    this._httpClient = new HttpApiClient(backendHubUrl, jwtToken || null);
    if (this._view) {
      this.refreshDashboard();
    }
  }
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };
    webviewView.webview.html = this._getWebviewContent(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "getDashboardData":
          await this._handleGetDashboardData(webviewView.webview);
          break;
        case "reauthenticate":
          await this._handleReauthenticate();
          break;
        default:
          console.warn("Webview provider: unknown command received", message.command);
      }
    });
    const themeChangeDisposable = vscode7.window.onDidChangeActiveColorTheme((theme) => {
      this._updateTheme(webviewView.webview, theme);
    });
    webviewView.onDidDispose(() => {
      themeChangeDisposable.dispose();
    });
  }
  _getWebviewContent(webview) {
    const currentTheme = vscode7.window.activeColorTheme;
    return getWebviewContent(webview, this._context.extensionUri, currentTheme);
  }
  async _handleGetDashboardData(webview) {
    vscode7.window.showInformationMessage("BMad Portal: Fetching dashboard data from Backend Hub via HTTP...");
    try {
      const settingsToken = vscode7.workspace.getConfiguration("bmadPortal").get("jwtToken");
      const jwtToken = settingsToken && settingsToken !== "" ? settingsToken : this._jwtStorage ? await this._jwtStorage.getJwtToken() : null;
      if (!jwtToken) {
        vscode7.window.showWarningMessage("BMad Portal: No JWT token available for dashboard. Please ensure token is configured in .vscode/settings.json");
        await this._handleReauthenticate();
        return;
      }
      vscode7.window.showInformationMessage("BMad Portal: JWT token found. Preparing dashboard view...");
      if (!this._httpClient) {
        const backendHubUrl = vscode7.workspace.getConfiguration("bmadPortal").get("backendHubUrl", "http://localhost:8000");
        this._httpClient = new HttpApiClient(backendHubUrl, jwtToken);
      }
      const dashboardData = await this._httpClient.getDashboardData();
      if (dashboardData) {
        if (this._view) {
          this._view.webview.postMessage({
            command: "dashboardDataReceived",
            data: dashboardData
          });
          vscode7.window.showInformationMessage("BMad Portal: Dashboard data received via HTTP.");
        }
      } else {
        const initialDashboardData = {
          status: "absent",
          repoState: {
            syncStatus: "Idle-Offline",
            ahead: 0,
            behind: 0,
            hasInProgressRebase: false,
            hasInProgressMerge: false,
            hasInProgressConflict: false
          },
          claims: [],
          riskSignals: [],
          lastKnownTime: (/* @__PURE__ */ new Date()).toLocaleString(),
          isStale: false
        };
        if (this._view) {
          this._view.webview.postMessage({
            command: "dashboardDataReceived",
            data: initialDashboardData
          });
          vscode7.window.showInformationMessage("BMad Portal: Dashboard view initialized with initial state.");
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      vscode7.window.showWarningMessage(`BMad Portal: Dashboard data error: ${error}`);
      if (error instanceof Error && (error.message.includes("JWT token expired or invalid") || error.message.includes("No JWT token available"))) {
        await this._handleReauthenticate();
        return;
      }
      if (this._view) {
        this._view.webview.postMessage({
          command: "dashboardDataError",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }
  async _handleReauthenticate() {
    if (this._authManager) {
      await this._authManager.handleTokenExpiration();
    }
    if (this._view) {
      this._view.webview.postMessage({
        command: "reauthenticationRequired"
      });
    }
  }
  _updateTheme(webview, theme) {
    if (this._view) {
      this._view.webview.postMessage({
        command: "themeChanged",
        themeKind: theme.kind
      });
    }
  }
  async refreshDashboard() {
    if (this._view) {
      this._view.webview.postMessage({
        command: "refreshDashboard"
      });
    }
  }
};

// src/status-bar.ts
var vscode8 = __toESM(require("vscode"));
var StatusBarWidget = class {
  statusBarItem;
  currentPresence = "connected";
  currentSyncState = "synced";
  currentRole;
  currentUsername;
  constructor() {
    this.statusBarItem = vscode8.window.createStatusBarItem(vscode8.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = "bmad-portal.refreshDashboard";
    this.updateDisplay();
  }
  /**
   * Update the status bar with new presence and sync-state
   * Implements the presence/sync-state collapse rule:
   * - if presence is absent, show `Idle-Offline` regardless of sync-state
   * - otherwise show the sync-state value
   */
  update(config) {
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
  getCollapsedStatus() {
    if (this.currentPresence === "absent") {
      return "Idle-Offline";
    }
    return this.currentSyncState;
  }
  /**
   * Get the display text for the status bar
   */
  getDisplayText() {
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
  getStatusIcon(state) {
    switch (state) {
      case "synced":
        return "\u{1F7E2}";
      case "drift":
        return "\u{1F7E1}";
      case "conflict":
        return "\u{1F534}";
      case "syncing-active":
        return "\u{1F504}";
      case "claimed":
        return "\u{1F4CC}";
      case "Idle-Offline":
        return "\u26AB";
      default:
        return "\u26AA";
    }
  }
  /**
   * Update the status bar display
   */
  updateDisplay() {
    const displayText = this.getDisplayText();
    this.statusBarItem.text = displayText;
    this.statusBarItem.tooltip = `BMad Portal Status:
Presence: ${this.currentPresence}
Sync State: ${this.currentSyncState}`;
    this.statusBarItem.show();
  }
  /**
   * Dispose the status bar widget
   */
  dispose() {
    this.statusBarItem.dispose();
  }
};

// src/features-suggester.ts
var vscode9 = __toESM(require("vscode"));
var FeaturesSuggester = class {
  context;
  constructor(context) {
    this.context = context;
  }
  /**
   * Register the "BMad Portal: Show Suggested Features" Command Palette command
   */
  registerCommand() {
    return vscode9.commands.registerCommand(
      "bmad-portal.showSuggestedFeatures",
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
  getFeaturesForClaims(claims) {
    if (!claims || !claims.role) {
      return this.getAllFeatures();
    }
    const role = claims.role.toLowerCase();
    const permissions = claims.permissions || [];
    const allFeatures = this.getAllFeatures();
    const suggestedFeatures = [];
    for (const feature of allFeatures) {
      if (feature.requiredRole || feature.requiredPermissions) {
        if (feature.requiredRole && feature.requiredRole.toLowerCase() !== role) {
          continue;
        }
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
  async showSuggestedFeatures() {
    const claims = {
      role: "Dev",
      permissions: ["read:dashboard", "read:claims", "read:risk-signals"]
    };
    const suggestedFeatures = this.getFeaturesForClaims(claims);
    if (suggestedFeatures.length === 0) {
      vscode9.window.showInformationMessage("BMad Portal: No suggested features available for your role.");
      return;
    }
    const quickPickItems = suggestedFeatures.map((feature) => ({
      label: feature.title,
      description: feature.description,
      detail: feature.requiredRole ? `Required role: ${feature.requiredRole}` : "Available to all users",
      feature
    }));
    const selected = await vscode9.window.showQuickPick(quickPickItems, {
      placeHolder: "Select a suggested feature to learn more",
      matchOnDescription: true,
      matchOnDetail: true
    });
    if (selected && selected.feature) {
      vscode9.window.showInformationMessage(
        `BMad Portal: ${selected.feature.title}

${selected.feature.description}`
      );
    }
  }
  /**
   * Get all available features (for filtering based on claims)
   */
  getAllFeatures() {
    return [
      {
        id: "dashboard-overview",
        title: "Dashboard Overview",
        description: "View the global Git + BMAD state (branches, PRs, sync status, Local vs Remote)"
      },
      {
        id: "my-claims",
        title: "My Claims",
        description: "View and manage your active story claims and leases",
        requiredRole: "Developer",
        requiredPermissions: ["read:claims"]
      },
      {
        id: "risk-signals",
        title: "Risk Signals",
        description: "View risk signals including stale stories, conflict-risk modules, and PRs awaiting review",
        requiredPermissions: ["read:risk-signals"]
      },
      {
        id: "sprint-status",
        title: "Sprint Status",
        description: "View sprint progress, stories done vs total, dates, and objectives",
        requiredRole: "Developer",
        requiredPermissions: ["read:sprint"]
      },
      {
        id: "system-admin",
        title: "System Administration",
        description: "Configure Git/Repos, manage users/roles, and supervise platform governance",
        requiredRole: "Admin",
        requiredPermissions: ["admin:system"]
      }
    ];
  }
};

// src/claim-notifications.ts
var vscode10 = __toESM(require("vscode"));
var ClaimNotifications = class {
  enableNotifications;
  constructor(enableNotifications = true) {
    this.enableNotifications = enableNotifications;
  }
  /**
   * Show a non-intrusive Toast notification for a claims event
   * Matches the platform's existing "Instant Notifications" interaction primitive
   */
  showClaimEvent(event) {
    if (!this.enableNotifications) {
      return;
    }
    switch (event.severity) {
      case "warning":
        vscode10.window.showWarningMessage(`BMad Portal: ${event.title}
${event.message}`, {
          modal: false
        });
        break;
      case "error":
        vscode10.window.showErrorMessage(`BMad Portal: ${event.title}
${event.message}`, {
          modal: false
        });
        break;
      case "information":
      default:
        vscode10.window.showInformationMessage(`BMad Portal: ${event.title}
${event.message}`, {
          modal: false
        });
        break;
    }
  }
  /**
   * Show notification for claims expiration event
   */
  showExpirationEvent(claimTitle, expirationTime) {
    const event = {
      type: "expiration",
      title: "Claim Expiration",
      message: `Your claim for "${claimTitle}" is expiring on ${expirationTime}. Please renew or re-claim if needed.`,
      severity: "warning"
    };
    this.showClaimEvent(event);
  }
  /**
   * Show notification for newly available features event
   */
  showNewAvailableFeaturesEvent(claims) {
    const featureList = claims.join(", ");
    const event = {
      type: "new-available-features",
      title: "New Features Available",
      message: `New features are now available for your role: ${featureList}. Check the Command Palette for "BMad Portal: Show Suggested Features".`,
      severity: "information"
    };
    this.showClaimEvent(event);
  }
  /**
   * Show notification for claim accepted event
   */
  showClaimAcceptedEvent(claimTitle) {
    const event = {
      type: "claim-accepted",
      title: "Claim Accepted",
      message: `Your claim for "${claimTitle}" has been accepted.`,
      severity: "information"
    };
    this.showClaimEvent(event);
  }
  /**
   * Show notification for claim rejected event
   */
  showClaimRejectedEvent(claimTitle, reason) {
    const event = {
      type: "claim-rejected",
      title: "Claim Rejected",
      message: `Your claim for "${claimTitle}" was rejected.${reason ? ` Reason: ${reason}` : ""} Please resynchronize with the Backend.`,
      severity: "error"
    };
    this.showClaimEvent(event);
  }
  /**
   * Enable or disable notifications
   */
  setEnabled(enabled) {
    this.enableNotifications = enabled;
  }
  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.enableNotifications;
  }
};

// src/extension.ts
var gitPoller;
var stateReporter;
var authManager;
var jwtStorage;
var dashboardWebviewProvider;
var statusBarWidget;
var claimNotifications;
var featuresSuggester;
async function activate(context) {
  vscode11.window.showInformationMessage("BMad Portal: Starting extension activation...");
  vscode11.window.showInformationMessage("BMad Portal: Initializing JWT storage and authentication manager...");
  jwtStorage = new JwtStorageManager(context);
  authManager = new AuthManager(context);
  vscode11.window.showInformationMessage("BMad Portal: Initializing authentication manager...");
  await authManager.initialize();
  const isAuthenticated = authManager ? authManager.isAuthenticatedState() : false;
  const authStatus = isAuthenticated ? "authenticated (using workspace JWT token or SecretStorage)" : "not authenticated";
  vscode11.window.showInformationMessage(`BMad Portal: Authentication status: ${authStatus}`);
  if (!isAuthenticated && authManager) {
    vscode11.window.showWarningMessage("BMad Portal: Not connected to the Backend Hub.", "Login").then((selection) => {
      if (selection === "Login") {
        vscode11.commands.executeCommand("bmad-portal.login");
      }
    });
  }
  vscode11.window.showInformationMessage("BMad Portal: Initializing state reporter and Git poller...");
  stateReporter = new StateReporter(context);
  gitPoller = new GitPoller(context);
  vscode11.window.showInformationMessage("BMad Portal: Registering dashboard webview provider...");
  dashboardWebviewProvider = new DashboardWebviewViewProvider(context, authManager, jwtStorage);
  context.subscriptions.push(
    vscode11.window.registerWebviewViewProvider(DashboardWebviewViewProvider.viewType, dashboardWebviewProvider)
  );
  vscode11.window.showInformationMessage("BMad Portal: Initializing status bar widget...");
  statusBarWidget = new StatusBarWidget();
  const enableNotifications = vscode11.workspace.getConfiguration("bmadPortal").get("enableNotifications", true);
  claimNotifications = new ClaimNotifications(enableNotifications);
  vscode11.window.showInformationMessage(`BMad Portal: Claim notifications enabled: ${enableNotifications}`);
  vscode11.window.showInformationMessage("BMad Portal: Initializing features suggester...");
  featuresSuggester = new FeaturesSuggester(context);
  const refreshDashboardCommand = vscode11.commands.registerCommand(
    "bmad-portal.refreshDashboard",
    async () => {
      vscode11.window.showInformationMessage("BMad Portal: Dashboard refresh triggered");
      if (gitPoller) {
        await gitPoller.pollGitState(true);
      }
    }
  );
  const openDashboardCommand = vscode11.commands.registerCommand(
    "bmad-portal.openDashboard",
    async () => {
      try {
        await vscode11.commands.executeCommand(`${DashboardWebviewViewProvider.viewType}.focus`);
      } catch {
        vscode11.window.showInformationMessage('BMad Portal: Dashboard is available in the sidebar. Please look for "BMad Portal" in the activity bar.');
      }
    }
  );
  const disconnectCommand = vscode11.commands.registerCommand(
    "bmad-portal.disconnect",
    async () => {
      vscode11.window.showInformationMessage("BMad Portal: Disconnecting from backend");
      vscode11.commands.executeCommand("setContext", "bmadPortal.connected", false);
      if (gitPoller) {
        gitPoller.stop();
      }
      if (authManager) {
        authManager.isAuthenticatedState();
        await authManager.handleTokenExpiration();
      }
    }
  );
  const reconnectCommand = vscode11.commands.registerCommand(
    "bmad-portal.reconnect",
    async () => {
      vscode11.window.showInformationMessage("BMad Portal: Reconnecting to backend");
      vscode11.commands.executeCommand("setContext", "bmadPortal.connected", true);
      if (gitPoller) {
        gitPoller.start();
      }
    }
  );
  const loginCommand = vscode11.commands.registerCommand(
    "bmad-portal.login",
    async () => {
      if (authManager) {
        const success = await authManager.login();
        if (success) {
          vscode11.commands.executeCommand("setContext", "bmadPortal.connected", true);
          if (gitPoller) {
            gitPoller.start();
          }
          if (dashboardWebviewProvider) {
            await dashboardWebviewProvider.refreshDashboard();
          }
        }
      }
    }
  );
  const reauthCommand = vscode11.commands.registerCommand(
    "bmad-portal.reauthenticate",
    async () => {
      if (authManager) {
        await authManager.login();
      }
    }
  );
  const showSuggestedFeaturesCommand = featuresSuggester.registerCommand();
  context.subscriptions.push(
    refreshDashboardCommand,
    openDashboardCommand,
    disconnectCommand,
    reconnectCommand,
    loginCommand,
    reauthCommand,
    showSuggestedFeaturesCommand
  );
  const backendHubUrl = vscode11.workspace.getConfiguration("bmadPortal").get("backendHubUrl", "http://localhost:8000");
  const authMethod = vscode11.workspace.getConfiguration("bmadPortal").get("authMethod", "jwt");
  const dashboardDisplayMode = vscode11.workspace.getConfiguration("bmadPortal").get("dashboardDisplayMode", "sidebarView");
  vscode11.window.showInformationMessage(`BMad Portal Hub extension activated. Backend: ${backendHubUrl}. Auth Method: ${authMethod}. Dashboard Mode: ${dashboardDisplayMode}`);
  vscode11.commands.executeCommand("setContext", "bmadPortal.connected", true);
  vscode11.window.showInformationMessage("BMad Portal: Set connected state to true.");
  vscode11.window.showInformationMessage("BMad Portal: Starting Git polling engine...");
  if (gitPoller) {
    gitPoller.start();
    vscode11.window.showInformationMessage("BMad Portal: Git polling engine started. Interval: 300 seconds.");
    gitPoller.onStateChange(async (state) => {
      vscode11.window.showInformationMessage(`BMad Portal: Git state change detected. Repo: ${state.isGitRepo ? "Git repository" : "Not a Git repo"}. Sync state: ${state.syncState}`);
      if (stateReporter) {
        try {
          vscode11.window.showInformationMessage("BMad Portal: Attempting to report Git state to backend...");
          await stateReporter.reportGitState(state);
          vscode11.window.showInformationMessage("BMad Portal: Git state report completed (HTTP reporting disabled, using WebSocket placeholder).");
        } catch (error) {
          if (error instanceof Error && error.message.includes("Authentication required: session expired")) {
            vscode11.window.showWarningMessage("BMad Portal: Session expired. Please re-authenticate.");
            if (authManager) {
              await authManager.handleTokenExpiration();
            }
            if (claimNotifications) {
              claimNotifications.showExpirationEvent("Unknown", "now");
            }
          } else {
            vscode11.window.showWarningMessage(`BMad Portal: State report warning: ${error}`);
            console.debug("State report failed:", error);
          }
        }
      }
      if (statusBarWidget) {
        const syncState = state.syncState || "synced";
        const statusConfig = {
          presence: "connected",
          syncState,
          userRole: "Dev",
          username: "user"
        };
        statusBarWidget.update(statusConfig);
        vscode11.window.showInformationMessage(`BMad Portal: Status bar updated. Sync state: ${syncState}.`);
      }
    });
  }
  if (claimNotifications && isAuthenticated) {
    claimNotifications.showNewAvailableFeaturesEvent(["Dashboard Overview", "My Claims", "Risk Signals"]);
  }
}
function deactivate() {
  if (gitPoller) {
    gitPoller.stop();
  }
  if (statusBarWidget) {
    statusBarWidget.dispose();
  }
  vscode11.window.showInformationMessage("BMad Portal Hub extension deactivated");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  authManager,
  claimNotifications,
  dashboardWebviewProvider,
  deactivate,
  featuresSuggester,
  gitPoller,
  jwtStorage,
  stateReporter,
  statusBarWidget
});
