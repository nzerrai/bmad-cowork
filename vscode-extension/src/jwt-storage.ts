/**
 * JWT Secret Storage Manager for BMad Portal VS Code Extension
 *
 * This module provides secure storage and retrieval of JWT tokens using VS Code's SecretStorage API.
 */

import * as vscode from 'vscode';

const JWT_STORAGE_KEY = 'bmadPortal.jwtToken';

export class JwtStorageManager {
	constructor(private context: vscode.ExtensionContext) {}

	/**
	 * Store a JWT token securely in VS Code SecretStorage
	 * @param token The JWT token to store
	 */
	public async storeJwtToken(token: string): Promise<void> {
		try {
			await this.context.secrets.store(JWT_STORAGE_KEY, token);
		} catch (error) {
			console.error('Failed to store JWT token in SecretStorage:', error);
			throw new Error(`JWT storage failed: ${error}`);
		}
	}

	/**
	 * Retrieve a JWT token securely from VS Code SecretStorage
	 * @returns The stored JWT token, or undefined if not found
	 */
	public async getJwtToken(): Promise<string | undefined> {
		try {
			return await this.context.secrets.get(JWT_STORAGE_KEY);
		} catch (error) {
			console.error('Failed to retrieve JWT token from SecretStorage:', error);
			return undefined;
		}
	}

	/**
	 * Delete a JWT token from VS Code SecretStorage
	 */
	public async deleteJwtToken(): Promise<void> {
		try {
			await this.context.secrets.delete(JWT_STORAGE_KEY);
		} catch (error) {
			console.error('Failed to delete JWT token from SecretStorage:', error);
		}
	}

	/**
	 * Check if a JWT token is stored
	 * @returns True if a token is stored, false otherwise
	 */
	public async hasJwtToken(): Promise<boolean> {
		const token = await this.getJwtToken();
		return token !== undefined && token !== '';
	}
}
