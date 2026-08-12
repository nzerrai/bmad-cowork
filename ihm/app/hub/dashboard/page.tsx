"use client";

import { useEffect, useState } from "react";
import { OverviewDashboard, DashboardRepo } from "@/app/components/dashboard/OverviewDashboard";
import { authFetch } from "@/lib/auth";

export default function HubDashboardPage() {
  const [repos, setRepos] = useState<DashboardRepo[]>([]);
  // Distinct from "confirmed empty" (`repos.length === 0` after the fetch
  // settles) -- without this, a user with many repos would flash the
  // "No repositories connected yet" onboarding message on every load, and a
  // failed/401 fetch would be indistinguishable from a genuine empty state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    authFetch("/hub/dashboard/repos")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Your session has expired. Please sign in again."
              : "Unable to load your repositories right now.",
          );
        }
        return res.json();
      })
      .then((data: { repos?: DashboardRepo[] }) => {
        if (!cancelled) {
          // Guard against a malformed response shape crashing
          // `OverviewDashboard`'s `.map()` over repos.
          setRepos(Array.isArray(data.repos) ? data.repos : []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load your repositories right now.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <p className="text-sm text-text-secondary">Loading your repositories...</p>
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

  return <OverviewDashboard initialRepos={repos} />;
}
