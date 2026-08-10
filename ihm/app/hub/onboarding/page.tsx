"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function HubOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Repository Onboarding</h1>
        <p className="text-sm text-text-secondary">
          Connect your first repository to start viewing the Dashboard Overview and Git + BMAD state.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-6">
        <h2 className="text-sm font-bold text-foreground">Getting Started</h2>
        <ol className="list-decimal pl-6 text-sm text-text-secondary">
          <li className="mt-2">Configure your Git repository URL in the BMAD Hub settings</li>
          <li className="mt-2">Grant read access to your repository</li>
          <li className="mt-2">Return to the Dashboard to view your branch and PR state</li>
        </ol>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="rounded-md bg-action/20 px-4 py-2 text-sm font-semibold text-action hover:bg-action/30 transition-colors"
          >
            Configure Repository
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors"
            onClick={() => router.push("/hub/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
