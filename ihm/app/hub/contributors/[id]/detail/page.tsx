"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { getToken } from "@/lib/auth";
import { ContributorIdentityHeader } from "@/app/components/contributors/ContributorIdentityHeader";
import { ContributorMultiAxisIndicators } from "@/app/components/contributors/ContributorMultiAxisIndicators";
import { ContributorDataTable } from "@/app/components/contributors/ContributorDataTable";
import { ContributorActivityFeed } from "@/app/components/contributors/ContributorActivityFeed";
import { AlertBanner } from "@/app/components/ui/alert-banner";
import type { PresenceSignal, SyncStateSignal } from "@/app/components/contributors/ContributorStatusPill";

interface ActivityEvent {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export default function ContributorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contributorId = params?.id as string;

  const [hasProjectAccess] = useState(true);
  const [presence] = useState<PresenceSignal>("connected");
  const [syncState] = useState<SyncStateSignal>("Synced");
  const [isStale] = useState(false);
  const [lastKnownTime] = useState<string>();
  const [activityEvents] = useState<ActivityEvent[]>([
    {
      id: "1",
      timestamp: "2026-08-10 14:30",
      action: "Git Push",
      details: "Pushed 3 commits to feature/contributor-detail",
    },
    {
      id: "2",
      timestamp: "2026-08-10 13:15",
      action: "Claim Acquired",
      details: "Claimed story 3-5-contributor-detail-panel",
    },
    {
      id: "3",
      timestamp: "2026-08-10 12:00",
      action: "Login",
      details: "Connected to Hub",
    },
  ]);

  // Check authentication synchronously
  const token = getToken();
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!contributorId) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error">
          Contributor ID is required.
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Mock blocking condition for demo (in real impl, would check actual conditions)
  const hasBlockingCondition = false;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Contributor Detail</h1>
        <p className="text-sm text-text-secondary">
          Contributor ID: {contributorId}
        </p>
      </div>

      {/* Identity Header */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Identity Header
        </h2>
        <ContributorIdentityHeader
          name="John Doe"
          role="Developer"
        />
      </section>

      {/* Multi-Axis Indicators (Presence + Sync-State + Status Pill) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Status Indicators
        </h2>
        <ContributorMultiAxisIndicators
          presence={presence}
          syncState={syncState}
          contributorId={contributorId}
          href={`/hub/contributors/${contributorId}/detail`}
        />
      </section>

      {/* Alert Banner (only if blocking condition exists) */}
      {hasBlockingCondition && (
        <section className="flex flex-col gap-3">
          <AlertBanner variant="warning" title="Sync Conflict Detected">
            There is a sync conflict for this contributor. Please resynchronize.
          </AlertBanner>
        </section>
      )}

      {/* Data-heavy Tables (Access & Repo State) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Access & Repo State
        </h2>
        <ContributorDataTable
          title="Access Status"
          rows={[
            { label: "Project Access", value: "Granted", status: "success" },
            { label: "Role", value: "Developer", status: "info" },
          ]}
          hasProjectAccess={hasProjectAccess}
        />
        <ContributorDataTable
          title="Repo State"
          rows={[
            { label: "Branch", value: "feature/contributor-detail", status: "info" },
            { label: "Ahead/Behind", value: "3 / 0", status: "neutral" },
            { label: "Last Sync", value: "2026-08-10 14:30", status: "success" },
          ]}
          hasProjectAccess={hasProjectAccess}
          isStale={isStale}
          lastKnownTime={lastKnownTime}
        />
      </section>

      {/* Activity Feed */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Recent Activity
        </h2>
        <ContributorActivityFeed
          events={activityEvents}
          hasProjectAccess={hasProjectAccess}
        />
      </section>
    </main>
  );
}
