/**
 * Authentication Manager for BMad Portal VS Code Extension
 *
 * This module handles JWT lifecycle, expiration detection, and re-authentication flow.
 */

import * as vscode from 'vscode';
import { JwtStorageManager } from './jwt-storage';

export interface AuthConfig {
	backendHubUrl: string;
	authMethod: string;
}

export class AuthManager {
	private jwtStorage: JwtStorageManager;
	private authToken?: string;
	private isAuthenticated = false;
	private onAuthChangedCallbacks: Array<(authenticated: boolean, token?: string) => void> = [];

	constructor(private context: vscode.ExtensionContext) {
		this.jwtStorage = new JwtStorageManager(context);
	}

	/**
	 * Get JWT token from workspace settings or SecretStorage
	 * @returns The JWT token, or undefined if not found
	 */
	private async getJwtTokenFromSettingsOrStorage(): Promise<string | undefined> {
		// First, check workspace settings for a direct JWT token
		const settingsToken = vscode.workspace.getConfiguration('bmadPortal').get<string>('jwtToken');
		if (settingsToken && settingsToken !== '') {
			console.log('Using JWT token from workspace settings');
			return settingsToken;
		}

		// Fall back to SecretStorage
		const storageToken = await this.jwtStorage.getJwtToken();
		if (storageToken && storageToken !== '') {
			console.log('Using JWT token from SecretStorage');
			return storageToken;
		}

		return undefined;
	}

	/**
	 * Initialize the authentication manager
	 */
	public async initialize(): Promise<void> {
		const token = await this.getJwtTokenFromSettingsOrStorage();
		if (token && token !== '') {
			this.authToken = token;
			this.isAuthenticated = true;
			this.notifyAuthChanged();
		}
	}

	/**
	 * Authenticate with the Backend Hub and store the JWT token
	 * @param token The JWT token received from the Backend
	 */
	public async authenticateWithToken(token: string): Promise<void> {
		if (!token || token === '') {
			throw new Error('Invalid token provided for authentication');
		}

		try {
			// Store the token securely
			await this.jwtStorage.storeJwtToken(token);
			this.authToken = token;
			this.isAuthenticated = true;
			this.notifyAuthChanged();

			vscode.window.showInformationMessage('BMad Portal: Successfully authenticated');
		} catch (error) {
			console.error('Authentication failed:', error);
			throw new Error(`Authentication failed: ${error}`);
		}
	}

	/**
	 * Handle token expiration or invalidation
	 * Triggers re-authentication flow
	 */
	public async handleTokenExpiration(): Promise<void> {
		console.warn('JWT token expired or invalid, triggering re-authentication flow');

		// Clear the invalid token
		await this.jwtStorage.deleteJwtToken();
		this.authToken = undefined;
		this.isAuthenticated = false;
		this.notifyAuthChanged();

		// Trigger re-authentication flow
		vscode.window.showWarningMessage('BMad Portal: Your session has expired. Please re-authenticate.');

		// In a real implementation, this would open a login dialog or redirect to the backend auth flow
		await this.promptReauthentication();
	}

	/**
	 * Check if the user is authenticated
	 * @returns True if authenticated, false otherwise
	 */
	public isAuthenticatedState(): boolean {
		return this.isAuthenticated;
	}

	/**
	 * Get the current auth token
	 * @returns The auth token, or undefined if not authenticated
	 */
	public getAuthToken(): string | undefined {
		return this.authToken;
	}

	/**
	 * Register a callback for authentication state changes
	 * @param callback Function to call when auth state changes
	 */
	public onAuthChanged(callback: (authenticated: boolean, token?: string) => void): void {
		this.onAuthChangedCallbacks.push(callback);
	}

	/**
	 * Unregister a callback for authentication state changes
	 * @param callback Function to remove
	 */
	public offAuthChanged(callback: (authenticated: boolean, token?: string) => void): void {
		const index = this.onAuthChangedCallbacks.indexOf(callback);
		if (index > -1) {
			this.onAuthChangedCallbacks.splice(index, 1);
		}
	}

	private notifyAuthChanged(): void {
		for (const callback of this.onAuthChangedCallbacks) {
			callback(this.isAuthenticated, this.authToken);
		}
	}

	private async promptReauthentication(): Promise<void> {
		const result = await vscode.window.showWarningMessage(
			'BMad Portal: Session expired. Click here to re-authenticate.',
			'Reauthenticate',
			'Cancel'
		);

		if (result === 'Reauthenticate') {
			// In a real implementation, this would initiate the OAuth or JWT auth flow
			vscode.window.showInformationMessage('BMad Portal: Re-authentication flow would be initiated here.');
			// For now, we simulate a successful re-authentication by showing a message
			// await this.initiateAuthFlow();
		}
	}

	// private async initiateAuthFlow(): Promise<void> {
	// 	// Placeholder for actual authentication flow initiation
	// 	// This would typically:
	// 	// 1. Open a browser window to the backend auth endpoint
	// 	// 2. Listen for a redirect with the auth code/token
	// 	// 3. Exchange the code/token for a JWT
	// 	// 4. Call authenticateWithToken with the received JWT
	// }
}
