"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { ContributorGrid } from "@/app/components/contributors/ContributorGrid";
import { PresenceSignal, SyncStateSignal } from "@/app/components/contributors/ContributorStatusPill";

interface ContributorData {
  id: string;
  name: string;
  email: string;
  presence: PresenceSignal;
  syncState: SyncStateSignal;
}

// Mock data for demonstration
const MOCK_CONTRIBUTORS: ContributorData[] = [
  {
    id: "user-1",
    name: "Alice Smith",
    email: "alice.smith@example.com",
    presence: "connected",
    syncState: "Synced",
  },
  {
    id: "user-2",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    presence: "connected",
    syncState: "Drift",
  },
  {
    id: "user-3",
    name: "Charlie Brown",
    email: "charlie.brown@example.com",
    presence: "connected",
    syncState: "Conflict",
  },
  {
    id: "user-4",
    name: "Diana Prince",
    email: "diana.prince@example.com",
    presence: "connected",
    syncState: "Syncing-Active",
  },
  {
    id: "user-5",
    name: "Eve Davis",
    email: "eve.davis@example.com",
    presence: "connected",
    syncState: "Claimed",
  },
  {
    id: "user-6",
    name: "Frank Miller",
    email: "frank.miller@example.com",
    presence: "absent",
    syncState: "Synced",
  },
  {
    id: "user-7",
    name: "Grace Lee",
    email: "grace.lee@example.com",
    presence: "absent",
    syncState: "Drift",
  },
];

export default function HubContributorsPage() {
  const router = useRouter();
  const contributors = MOCK_CONTRIBUTORS;
  const loading = false;
  const error = null;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <p className="text-sm text-text-secondary">Chargement des contributeurs...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Contributors</h1>
        <p className="text-sm text-text-secondary">
          View contributor status indicators including presence and sync-state signals
        </p>
      </div>

      <ContributorGrid
        contributors={contributors}
      />
    </main>
  );
}
