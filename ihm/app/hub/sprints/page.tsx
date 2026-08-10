/** Sprint & Ceremony Dashboard Page

Main dashboard surface showing sprint status, ceremonies, and deterministic charts.
*/

"use client";

import React from "react";
import { SprintStatusDisplay, SprintData } from "../components/sprint-status/SprintStatusDisplay";
import { CeremonyListDisplay, CeremonyData } from "../components/ceremony-list/CeremonyListDisplay";

export default function SprintsPage() {
  // Mock data for demonstration - In production, this would come from the backend API
  // or be fetched based on the current sprint configuration
  const currentSprint: SprintData | null = null;

  // Mock ceremony data for demonstration - 100% deterministic from existing ceremony and artifact data
  const ceremonies: CeremonyData[] = [
    {
      id: "ceremony-1",
      type: "standup",
      status: "completed",
      scheduledDate: "2026-08-10",
      notesArtifactLink: "/hub/artifacts/ceremony-standup-2026-08-10",
      notesArtifactTitle: "Standup Notes - Aug 10",
    },
    {
      id: "ceremony-2",
      type: "planning",
      status: "completed",
      scheduledDate: "2026-08-05",
      // No notes artifact linked - should show "No notes yet"
    },
    {
      id: "ceremony-3",
      type: "review",
      status: "upcoming",
      scheduledDate: "2026-08-15",
    },
    {
      id: "ceremony-4",
      type: "retro",
      status: "missed",
      scheduledDate: "2026-08-08",
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-xl font-bold text-foreground">Sprint & Ceremony Dashboard</h1>
          <p className="font-sans text-sm text-text-secondary">
            Track sprint progress, ceremony status, and deterministic metrics
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            Sprint Status
          </h2>
          <SprintStatusDisplay sprint={currentSprint} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            Ceremony List & Status
          </h2>
          <CeremonyListDisplay ceremonies={ceremonies} />
        </section>
      </main>
    </div>
  );
}
