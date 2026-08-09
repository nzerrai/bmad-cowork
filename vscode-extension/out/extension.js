"use strict";
/**
 * BMad Portal VS Code Extension
 *
 * This is the entry point for the BMad Portal VS Code extension.
 * It provides IDE integration and dashboard display capabilities.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateReporter = exports.gitPoller = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const git_poller_1 = require("./git-poller");
const state_reporter_1 = require("./state-reporter");
function activate(context) {
    // Initialize state reporter and git poller
    exports.stateReporter = new state_reporter_1.StateReporter(context);
    exports.gitPoller = new git_poller_1.GitPoller(context);
    // Register commands
    const refreshDashboardCommand = vscode.commands.registerCommand('bmad-portal.refreshDashboard', async () => {
        vscode.window.showInformationMessage('BMad Portal: Dashboard refresh triggered');
        // Force immediate poll
        if (exports.gitPoller) {
            await exports.gitPoller['pollGitState']();
        }
    });
    const openDashboardCommand = vscode.commands.registerCommand('bmad-portal.openDashboard', async () => {
        vscode.window.showInformationMessage('BMad Portal: Opening dashboard');
    });
    const disconnectCommand = vscode.commands.registerCommand('bmad-portal.disconnect', async () => {
        vscode.window.showInformationMessage('BMad Portal: Disconnecting from backend');
        // State update for view visibility
        vscode.commands.executeCommand('setContext', 'bmadPortal.connected', false);
        // Stop polling
        if (exports.gitPoller) {
            exports.gitPoller.stop();
        }
    });
    const reconnectCommand = vscode.commands.registerCommand('bmad-portal.reconnect', async () => {
        vscode.window.showInformationMessage('BMad Portal: Reconnecting to backend');
        // State update for view visibility
        vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);
        // Start polling
        if (exports.gitPoller) {
            exports.gitPoller.start();
        }
    });
    context.subscriptions.push(refreshDashboardCommand, openDashboardCommand, disconnectCommand, reconnectCommand);
    // Initialize extension state
    const backendHubUrl = vscode.workspace.getConfiguration('bmadPortal').get('backendHubUrl', 'http://localhost:3000');
    const authMethod = vscode.workspace.getConfiguration('bmadPortal').get('authMethod', 'session');
    const dashboardDisplayMode = vscode.workspace.getConfiguration('bmadPortal').get('dashboardDisplayMode', 'sidebar');
    vscode.window.showInformationMessage(`BMad Portal Hub extension activated. Backend: ${backendHubUrl}`);
    // Set initial connected state
    vscode.commands.executeCommand('setContext', 'bmadPortal.connected', true);
    // Start the Git polling engine
    if (exports.gitPoller) {
        exports.gitPoller.start();
        // Listen for state changes and report to backend
        exports.gitPoller.onStateChange(async (state) => {
            if (exports.stateReporter) {
                await exports.stateReporter.reportGitState(state);
            }
        });
    }
}
function deactivate() {
    // Cleanup on extension deactivation
    if (exports.gitPoller) {
        exports.gitPoller.stop();
    }
    vscode.window.showInformationMessage('BMad Portal Hub extension deactivated');
}
//# sourceMappingURL=extension.js.map