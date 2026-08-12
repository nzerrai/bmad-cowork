/** Overview Dashboard Component
 *
 * Main dashboard component showing global Git + BMAD state across every
 * repo the current user is scoped to see (admin = every known repo,
 * everyone else = only the repos their Client has reported identity for --
 * see `GET /hub/dashboard/repos`), including branches, sync status, and
 * Local vs Remote context. PRs are always empty in this revision -- no
 * backend PR integration exists, so none are fabricated.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RealTimeStatusBar, StatusBarStatus } from "./RealTimeStatusBar";
import { BranchPRStatus, BranchInfo } from "../git/BranchPRStatus";
import { RealtimeConnection, ConnectionStatus } from "@/lib/websocket";

export type DashboardHubStatus = "healthy" | "unreachable";

/** A contributor's canonical Git state for one repo, as reported by
 * `ContributorGitState` -- present only when it matches this repo's
 * `technical_identifier`, never fabricated otherwise. */
export interface DashboardRepoGitState {
  technical_identifier: string;
  branch: string | null;
  ahead: number;
  behind: number;
  in_progress_action: string;
  last_updated: string;
  is_stale: boolean;
  /** Only present when `is_stale` is true, e.g. `"Last known — 45s ago"`. */
  status_message?: string;
}

/** One repo entry from `GET /hub/dashboard/repos` -- the base shape mirrors
 * `_space_to_repo_out` (also used by `/hub/admin/repos`), plus the optional
 * per-user `git_state` enrichment. */
export interface DashboardRepo {
  id: string;
  technical_identifier: string;
  short_name: string;
  status: string;
  origin: string;
  has_credential: boolean;
  created_at: string;
  updated_at: string;
  git_state: DashboardRepoGitState | null;
}

interface OverviewDashboardProps {
  initialRepos?: DashboardRepo[];
  initialHubStatus?: DashboardHubStatus;
  initialLastKnownStateTimestamp?: string | null;
}

/** Derives a `BranchInfo` badge from a repo's `git_state` -- never
 * fabricated: only called when `git_state` is present. When the state is
 * stale (older than `STALENESS_THRESHOLD_SECONDS`, per AD-008), the
 * rendered name surfaces that rather than rendering as if fresh -- using
 * the backend's own `status_message` (e.g. "Last known — 45s ago") when
 * present. */
function toBranchInfo(gitState: DashboardRepoGitState): BranchInfo {
  let status: BranchInfo["status"] = "up-to-date";
  if (gitState.in_progress_action && gitState.in_progress_action !== "none") {
    status = "conflict";
  } else if (gitState.ahead > 0 && gitState.behind > 0) {
    status = "conflict";
  } else if (gitState.ahead > 0) {
    status = "ahead";
  } else if (gitState.behind > 0) {
    status = "behind";
  }

  const branchName = gitState.branch ?? "(unknown)";
  const name = gitState.is_stale
    ? `${branchName} (${gitState.status_message ?? "stale"})`
    : branchName;

  return {
    name,
    context: "remote",
    status,
  };
}

export function OverviewDashboard({
  initialRepos = [],
  initialHubStatus = "healthy",
  initialLastKnownStateTimestamp = null,
}: OverviewDashboardProps) {
  const [hubStatus, setHubStatus] = useState<DashboardHubStatus>(
    initialHubStatus || "healthy",
  );
  const [wsConnectionStatus, setWsConnectionStatus] = useState<ConnectionStatus>(
    "closed",
  );
  const [lastKnownStateTimestamp, setLastKnownStateTimestamp] = useState<string | null>(
    initialLastKnownStateTimestamp,
  );

  const repos = initialRepos;

  // `initialRepos` now arrives asynchronously (fetched by the parent page,
  // unlike the old static mock prop) -- the `RealtimeConnection` callback
  // below is constructed once (guarded by `realtimeConnRef.current`) and
  // must read the *current* repo list on every invocation, not the one
  // closed over at that first construction (which is often still `[]` at
  // that point). Track it in a ref, updated every render, instead of
  // closing over the `repos` variable/prop directly.
  const reposRef = useRef<DashboardRepo[]>(repos);
  useEffect(() => {
    reposRef.current = repos;
  }, [repos]);

  const realtimeConnRef = useRef<RealtimeConnection | null>(null);

  useEffect(() => {
    if (!realtimeConnRef.current) {
      realtimeConnRef.current = new RealtimeConnection((status: ConnectionStatus) => {
        setWsConnectionStatus(status);
        if (status === "open") {
          setHubStatus("healthy");
          setLastKnownStateTimestamp(null);
        } else if (status === "closed" && hubStatus === "healthy") {
          // Transition to stale state if connection closes
          if (reposRef.current.length > 0) {
            setLastKnownStateTimestamp(new Date().toLocaleString());
          }
        }
      });
    }
  }, [hubStatus]);

  useEffect(() => {
    const conn = realtimeConnRef.current;
    if (conn) {
      if (hubStatus === "healthy" || wsConnectionStatus === "open") {
        conn.connect();
      } else {
        conn.close();
      }
    }

    return () => {
      if (conn) {
        conn.close();
      }
    };
  }, [hubStatus, wsConnectionStatus]);

  const getStatusBarStatus = (): StatusBarStatus => {
    if (hubStatus === "unreachable") {
      return "unreachable";
    }
    if (wsConnectionStatus === "open") {
      return "active";
    }
    return "idle";
  };

  // Check if there are no repositories connected
  const hasNoRepositories = repos.length === 0;

  if (hasNoRepositories) {
    return (
      <div className="flex flex-1 flex-col">
        <RealTimeStatusBar status={getStatusBarStatus()} lastKnownStateTimestamp={lastKnownStateTimestamp} />
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          </div>

          <section className="flex flex-col items-center justify-center rounded-md border border-border bg-surface px-4 py-12 text-center">
            <p className="text-base text-text-secondary">No repositories connected yet</p>
            <Link
              href="/hub/onboarding"
              className="mt-4 inline-flex items-center rounded-md bg-action/20 px-4 py-2 text-sm font-semibold text-action hover:bg-action/30 transition-colors"
            >
              Go to Onboarding
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <RealTimeStatusBar status={getStatusBarStatus()} lastKnownStateTimestamp={lastKnownStateTimestamp} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-sm text-text-secondary">
            Global Git + BMAD state including branches, PRs, sync status, and Local vs Remote context
          </p>
        </div>

        <section className="flex flex-col gap-6">
          <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
            Git + BMAD State
          </h2>
          {repos.map((repo) => (
            <div key={repo.id} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">{repo.short_name}</h3>
              {repo.git_state ? (
                <BranchPRStatus currentBranch={toBranchInfo(repo.git_state)} openPRs={[]} />
              ) : (
                <p className="text-sm text-text-secondary">No local Git state reported</p>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
