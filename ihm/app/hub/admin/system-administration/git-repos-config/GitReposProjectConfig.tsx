/** Git/Repos Project Configuration Form Component
 *
 * Allows administrators to view and edit the connected Git repository configuration.
 */

"use client";

import React, { useState, useEffect } from "react";
import { ReconnectingToast } from "@/components/ui/toast/reconnecting-toast";
import { useToast } from "@/app/components/ui/toast-provider";

interface GitReposConfig {
  project_name: string;
  primary_repo_url: string;
  backup_repo_url: string | null;
  webhook_url: string | null;
}

interface GitReposProjectConfigProps {
  config: GitReposConfig | null;
  isBackendReachable: boolean;
  onSave: (config: GitReposConfig) => void;
}

export function GitReposProjectConfig({
  config,
  isBackendReachable,
  onSave,
}: GitReposProjectConfigProps) {
  const [projectName, setProjectName] = useState(config?.project_name || "");
  const [primaryRepoUrl, setPrimaryRepoUrl] = useState(config?.primary_repo_url || "");
  const [backupRepoUrl, setBackupRepoUrl] = useState(config?.backup_repo_url || "");
  const [webhookUrl, setWebhookUrl] = useState(config?.webhook_url || "");

  const [showReconnectingToast, setShowReconnectingToast] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (config) {
      setProjectName(config.project_name || "");
      setPrimaryRepoUrl(config.primary_repo_url || "");
      setBackupRepoUrl(config.backup_repo_url || "");
      setWebhookUrl(config.webhook_url || "");
    }
  }, [config]);

  // Show reconnecting toast when backend is unreachable
  useEffect(() => {
    if (!isBackendReachable) {
      setShowReconnectingToast(true);
    } else {
      setShowReconnectingToast(false);
    }
  }, [isBackendReachable]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBackendReachable) {
      // Save actions are disabled when Backend is unreachable
      setShowReconnectingToast(true);
      return;
    }

    const newConfig: GitReposConfig = {
      project_name: projectName,
      primary_repo_url: primaryRepoUrl,
      backup_repo_url: backupRepoUrl || null,
      webhook_url: webhookUrl || null,
    };

    onSave(newConfig);
  };

  const toggleReconnectingToast = () => {
    setShowReconnectingToast(false);
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {showReconnectingToast && <ReconnectingToast onClose={toggleReconnectingToast} />}

      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={!isBackendReachable}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter project name"
          />
        </div>

        <div>
          <label
            htmlFor="primary-repo-url"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Primary Repository URL
          </label>
          <input
            id="primary-repo-url"
            type="url"
            value={primaryRepoUrl}
            onChange={(e) => setPrimaryRepoUrl(e.target.value)}
            disabled={!isBackendReachable}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="https://github.com/organization/project.git"
          />
        </div>

        <div>
          <label
            htmlFor="backup-repo-url"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Backup Repository URL (Optional)
          </label>
          <input
            id="backup-repo-url"
            type="url"
            value={backupRepoUrl || ""}
            onChange={(e) => setBackupRepoUrl(e.target.value)}
            disabled={!isBackendReachable}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="https://github.com/organization/project-backup.git"
          />
        </div>

        <div>
          <label
            htmlFor="webhook-url"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Webhook URL (Optional)
          </label>
          <input
            id="webhook-url"
            type="url"
            value={webhookUrl || ""}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={!isBackendReachable}
            className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="https://api.example.com/webhooks/git-repos"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isBackendReachable || !projectName || !primaryRepoUrl}
          className="rounded-md bg-action/20 px-4 py-2 text-sm font-semibold text-action hover:bg-action/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
}
