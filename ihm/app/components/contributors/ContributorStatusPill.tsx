/** ContributorStatusPill Component
 *
 * Status Pill component with collapse rule logic based on two independent signals:
 * - presence signal: connected/absent
 * - sync-state signal: Synced/Drift/Conflict/Syncing-Active/Claimed
 *
 * Collapse rule:
 * - If presence = absent, the Pill always shows "Idle-Offline" regardless of sync-state
 * - If presence = connected, the Pill shows the sync-state value
 */

"use client";

import React from "react";
import Link from "next/link";

export type PresenceSignal = "connected" | "absent";
export type SyncStateSignal = "Synced" | "Drift" | "Conflict" | "Syncing-Active" | "Claimed";

// Pill styles mapping for sync-state values
const PILL_STYLE_CLASSES: Record<SyncStateSignal | "Idle-Offline", string> = {
  Synced: "bg-success/15 text-success",
  Drift: "bg-warning/15 text-warning",
  Conflict: "bg-error/15 text-error",
  "Syncing-Active": "bg-info/15 text-info",
  Claimed: "bg-primary/15 text-primary",
  "Idle-Offline": "bg-neutral/15 text-neutral",
};

const PILL_LABELS: Record<SyncStateSignal | "Idle-Offline", string> = {
  Synced: "Synced",
  Drift: "Drift",
  Conflict: "Conflict",
  "Syncing-Active": "Syncing-Active",
  Claimed: "Claimed",
  "Idle-Offline": "Idle-Offline",
};

interface ContributorStatusPillProps {
  presence: PresenceSignal;
  syncState: SyncStateSignal;
  contributorId: string;
  href?: string;
}

/**
 * Computes the status pill value based on the fixed collapse rule:
 * - If presence = absent, the Pill always shows "Idle-Offline" regardless of sync-state
 * - If presence = connected, the Pill shows the sync-state value
 */
export function computeStatusPillValue(presence: PresenceSignal, syncState: SyncStateSignal): {
  value: SyncStateSignal | "Idle-Offline";
  tone: string;
  label: string;
} {
  let pillValue: SyncStateSignal | "Idle-Offline";

  if (presence === "absent") {
    pillValue = "Idle-Offline";
  } else {
    // presence === "connected"
    pillValue = syncState;
  }

  const tone = PILL_STYLE_CLASSES[pillValue];
  const label = PILL_LABELS[pillValue];

  return { value: pillValue, tone, label };
}

export function ContributorStatusPill({
  presence,
  syncState,
  contributorId,
  href,
}: ContributorStatusPillProps) {
  const { tone, label } = computeStatusPillValue(presence, syncState);

  const pillContent = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${tone}`}
      role={href ? "button" : "status"}
      aria-label={`Contributor status: ${label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${tone}`} aria-hidden />
      {label}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        aria-label={`Navigate to contributor ${contributorId} detail panel - Status: ${label}`}
      >
        {pillContent}
      </Link>
    );
  }

  return pillContent;
}
