/** Git/Repos Project Configuration -- multi-repo admin surface (Story 6.1 revision)
 *
 * Lists every known `Space` (discovered via Client connection or added
 * manually by an Admin), lets an Admin add a repo by URL, and lets an Admin
 * authorize access to a `pending` repo with an access credential.
 */

"use client";

import React, { useState } from "react";
import { ReconnectingToast } from "@/components/ui/toast/reconnecting-toast";
import { StatusPill } from "@/app/components/ui/status-pill";

export type RepoStatus = "pending" | "active" | "access_revoked";
export type RepoOrigin = "discovered" | "manual";

export interface RepoOut {
  id: string;
  technical_identifier: string;
  short_name: string;
  status: RepoStatus;
  origin: RepoOrigin;
  has_credential: boolean;
}

interface GitReposProjectConfigProps {
  repos: RepoOut[];
  isBackendReachable: boolean;
  onAddRepo: (technicalIdentifier: string) => Promise<void>;
  onAuthorizeRepo: (repoId: string, credential: string) => Promise<void>;
}

const ORIGIN_LABELS: Record<RepoOrigin, string> = {
  discovered: "Découvert",
  manual: "Ajout manuel",
};

// Origin is informational, not an operational status -- reuses the same
// neutral badge treatment as the role badge in UserRoleManagement, not the
// semantic status-color vocabulary (StatusPill) reserved for `status`.
const ORIGIN_BADGE_CLASS = "inline-flex items-center rounded-md bg-surface-elevated px-2 py-1 text-xs font-medium text-text-secondary";

// Credential injection (and therefore the "Autoriser l'accès" action) is
// HTTPS-only -- matches the Backend's `check_repo_access`/PATCH-credential
// gate, which only ever injects a stored token for `https://` identifiers.
// SSH (`git@host:...`) and bare `http://` identifiers are both credential-
// ineligible, just for different reasons, so each gets its own accurate
// fallback message rather than one mislabeling the other.
function isHttpsIdentifier(technicalIdentifier: string): boolean {
  return technicalIdentifier.startsWith("https://");
}

function pendingCredentialFallbackMessage(technicalIdentifier: string): string {
  if (technicalIdentifier.startsWith("http://")) {
    return "Identifiants non pris en charge pour ce protocole -- HTTPS requis";
  }
  return "Accès SSH -- à configurer côté serveur";
}

export function GitReposProjectConfig({
  repos,
  isBackendReachable,
  onAddRepo,
  onAuthorizeRepo,
}: GitReposProjectConfigProps) {
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [addRepoError, setAddRepoError] = useState<string | null>(null);
  const [isAddingRepo, setIsAddingRepo] = useState(false);

  const [authorizingRepoId, setAuthorizingRepoId] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState("");
  const [authorizeError, setAuthorizeError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const [showReconnectingToast, setShowReconnectingToast] = useState(false);

  const toggleReconnectingToast = () => setShowReconnectingToast(false);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddRepoError(null);

    if (!isBackendReachable) {
      setShowReconnectingToast(true);
      return;
    }

    if (!newRepoUrl.trim()) return;

    setIsAddingRepo(true);
    try {
      await onAddRepo(newRepoUrl.trim());
      setNewRepoUrl("");
    } catch (error) {
      if (error instanceof Error && error.message === "Backend unreachable") {
        setShowReconnectingToast(true);
      } else {
        setAddRepoError(
          error instanceof Error ? error.message : "Impossible d'ajouter le dépôt."
        );
      }
    } finally {
      setIsAddingRepo(false);
    }
  };

  const openAuthorizeForm = (repoId: string) => {
    setAuthorizingRepoId(repoId);
    setCredentialInput("");
    setAuthorizeError(null);
  };

  const cancelAuthorizeForm = () => {
    setAuthorizingRepoId(null);
    setCredentialInput("");
    setAuthorizeError(null);
  };

  const handleAuthorizeRepo = async (e: React.FormEvent, repoId: string) => {
    e.preventDefault();
    setAuthorizeError(null);

    if (!isBackendReachable) {
      setShowReconnectingToast(true);
      return;
    }

    if (!credentialInput.trim()) return;

    setIsAuthorizing(true);
    try {
      await onAuthorizeRepo(repoId, credentialInput.trim());
      setAuthorizingRepoId(null);
      setCredentialInput("");
    } catch (error) {
      if (error instanceof Error && error.message === "Backend unreachable") {
        setShowReconnectingToast(true);
      } else {
        setAuthorizeError("Accès toujours refusé. Vérifiez le token et réessayez.");
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {showReconnectingToast && <ReconnectingToast onClose={toggleReconnectingToast} />}

      <div className="overflow-x-auto">
        {repos.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun dépôt connecté pour le moment.</p>
        ) : (
          <table
            className="min-w-full divide-y divide-border"
            role="table"
            aria-label="Dépôts Git connectés"
          >
            <thead className="bg-surface-elevated">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  Identifiant technique
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  Origine
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  Statut
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {repos.map((repo) => (
                <React.Fragment key={repo.id}>
                  <tr className="hover:bg-surface-elevated/50">
                    <td className="px-4 py-3 font-mono text-sm text-foreground">
                      {repo.technical_identifier}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={ORIGIN_BADGE_CLASS}>
                        {ORIGIN_LABELS[repo.origin] ?? repo.origin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusPill status={repo.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {repo.status === "pending" && isHttpsIdentifier(repo.technical_identifier) ? (
                        <button
                          type="button"
                          onClick={() => openAuthorizeForm(repo.id)}
                          disabled={!isBackendReachable}
                          className="rounded-md bg-action/20 px-3 py-1.5 text-sm font-semibold text-action hover:bg-action/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-info"
                          aria-label={`Autoriser l'accès pour ${repo.technical_identifier}`}
                        >
                          Autoriser l&apos;accès
                        </button>
                      ) : repo.status === "pending" ? (
                        <span className="text-xs text-text-secondary">
                          {pendingCredentialFallbackMessage(repo.technical_identifier)}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  {authorizingRepoId === repo.id && (
                    <tr>
                      <td colSpan={4} className="bg-surface-elevated/50 px-4 py-3">
                        <form
                          onSubmit={(e) => handleAuthorizeRepo(e, repo.id)}
                          className="flex flex-col gap-2"
                        >
                          <label
                            htmlFor={`credential-${repo.id}`}
                            className="text-sm font-medium text-text-secondary"
                          >
                            Token d&apos;accès pour {repo.short_name}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id={`credential-${repo.id}`}
                              type="password"
                              value={credentialInput}
                              onChange={(e) => setCredentialInput(e.target.value)}
                              disabled={!isBackendReachable || isAuthorizing}
                              className="w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="Personal access token"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={!isBackendReachable || isAuthorizing || !credentialInput.trim()}
                              className="rounded-md bg-action/20 px-3 py-1.5 text-sm font-semibold text-action hover:bg-action/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={cancelAuthorizeForm}
                              className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                          {authorizeError && (
                            <p className="text-xs text-error" role="alert">
                              {authorizeError}
                            </p>
                          )}
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={handleAddRepo} className="flex flex-col gap-2 border-t border-border pt-4">
        <label htmlFor="new-repo-url" className="text-sm font-medium text-text-secondary">
          Ajouter un dépôt
        </label>
        <div className="flex items-center gap-2">
          <input
            id="new-repo-url"
            type="text"
            value={newRepoUrl}
            onChange={(e) => setNewRepoUrl(e.target.value)}
            disabled={!isBackendReachable || isAddingRepo}
            className="w-full max-w-md rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="https://github.com/organization/repo.git"
          />
          <button
            type="submit"
            disabled={!isBackendReachable || isAddingRepo || !newRepoUrl.trim()}
            className="rounded-md bg-action/20 px-4 py-2 text-sm font-semibold text-action hover:bg-action/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ajouter
          </button>
        </div>
        {addRepoError && (
          <p className="text-xs text-error" role="alert">
            {addRepoError}
          </p>
        )}
      </form>
    </div>
  );
}
