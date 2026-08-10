/** Contributor Multi-Axis Indicators Component
 *
 * Renders presence (Connected/Absent) and sync-state (Synced/Drift/Conflict/Syncing-Active/Claimed)
 * as two independent indicators alongside the collapsed Status Pill — never inferring one from the other.
 */

"use client";

import React from "react";
import { ContributorStatusPill } from "./ContributorStatusPill";
import type { PresenceSignal, SyncStateSignal } from "./ContributorStatusPill";

interface MultiAxisIndicatorsProps {
  presence: PresenceSignal;
  syncState: SyncStateSignal;
  contributorId: string;
  href?: string;
}

export function ContributorMultiAxisIndicators({
  presence,
  syncState,
  contributorId,
  href,
}: MultiAxisIndicatorsProps) {

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-text-secondary uppercase">
              Presence:
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
                presence === "connected"
                  ? "bg-success/15 text-success"
                  : "bg-neutral/15 text-neutral"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-current ${
                  presence === "connected" ? "text-success" : "text-neutral"
                }`}
                aria-hidden
              />
              {presence === "connected" ? "Connected" : "Absent"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-text-secondary uppercase">
              Sync-State:
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
                "bg-info/15 text-info" // Placeholder, actual styling from ContributorStatusPill
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {syncState === "Synced" ? "Synced" : syncState === "Drift" ? "Drift" : syncState === "Conflict" ? "Conflict" : syncState === "Syncing-Active" ? "Syncing-Active" : "Claimed"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-text-secondary uppercase">
            Status Pill:
          </span>
          <ContributorStatusPill
            presence={presence}
            syncState={syncState}
            contributorId={contributorId}
            href={href}
          />
        </div>
      </div>
    </div>
  );
}
