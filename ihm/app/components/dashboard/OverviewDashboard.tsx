/** Overview Dashboard Component
 *
 * Main dashboard component showing global Git + BMAD state including branches,
 * PRs, sync status, and Local vs Remote context.
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RealTimeStatusBar, StatusBarStatus } from "./RealTimeStatusBar";
import { BranchPRStatus, BranchInfo, PRInfo } from "../git/BranchPRStatus";
import { RealtimeConnection, ConnectionStatus } from "@/lib/websocket";

export type DashboardHubStatus = "healthy" | "unreachable";

interface OverviewDashboardProps {
  initialBranch?: BranchInfo | null;
  initialPRs?: PRInfo[];
  initialHubStatus?: DashboardHubStatus;
  initialLastKnownStateTimestamp?: string | null;
}

export function OverviewDashboard({
  initialBranch = null,
  initialPRs = [],
  initialHubStatus = "healthy",
  initialLastKnownStateTimestamp = null,
}: OverviewDashboardProps) {
  const [hubStatus, setHubStatus] = useState<DashboardHubStatus>(
    initialHubStatus || "healthy",
  );
  const [wsConnectionStatus, setWsConnectionStatus] = useState<ConnectionStatus>(
    "closed",
  );
  const [currentBranch] = useState<BranchInfo | null>(initialBranch);
  const [openPRs] = useState<PRInfo[]>(initialPRs);
  const [lastKnownStateTimestamp, setLastKnownStateTimestamp] = useState<string | null>(
    initialLastKnownStateTimestamp,
  );

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
          if (currentBranch || openPRs.length > 0) {
            setLastKnownStateTimestamp(new Date().toLocaleString());
          }
        }
      });
    }
  }, [hubStatus, currentBranch, openPRs]);

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
  const hasNoRepositories = !currentBranch && openPRs.length === 0;

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

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
            Git + BMAD State
          </h2>
          <BranchPRStatus currentBranch={currentBranch} openPRs={openPRs} />
        </section>
      </main>
    </div>
  );
}
