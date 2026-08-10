/** ContributorRow Component
 *
 * Individual contributor row component to show individual contributor rows with the Status Pill
 * and handle click navigation to Detail panel.
 */

"use client";

import React from "react";
import { ContributorStatusPill, PresenceSignal, SyncStateSignal } from "./ContributorStatusPill";

export interface ContributorData {
  id: string;
  name: string;
  email: string;
  presence: PresenceSignal;
  syncState: SyncStateSignal;
}

interface ContributorRowProps {
  contributor: ContributorData;
}

export function ContributorRow({ contributor }: ContributorRowProps) {
  const detailHref = `/hub/contributors/${contributor.id}/detail`;

  return (
    <tr className="border-b border-border-soft hover:bg-surface-hover transition-colors">
      <td className="px-4 py-3 text-foreground font-medium">{contributor.name}</td>
      <td className="px-4 py-3 text-text-secondary">{contributor.email}</td>
      <td className="px-4 py-3">
        <ContributorStatusPill
          presence={contributor.presence}
          syncState={contributor.syncState}
          contributorId={contributor.id}
          href={detailHref}
        />
      </td>
    </tr>
  );
}
