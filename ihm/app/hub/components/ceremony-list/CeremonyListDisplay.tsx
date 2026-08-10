/** Ceremony List Display Component

Displays a list of ceremonies (standup, planning, review, retro) with their status
(upcoming, completed, missed) and links to notes artifacts for completed ceremonies.
For completed ceremonies without linked notes artifacts, displays "No notes yet"
instead of a broken link.

100% deterministic - no AI/LLM involvement in calculations.
*/

"use client";

import React from "react";

export interface CeremonyData {
  id: string;
  type: "standup" | "planning" | "review" | "retro";
  status: "upcoming" | "completed" | "missed";
  scheduledDate: string;
  notesArtifactLink?: string;
  notesArtifactTitle?: string;
}

export interface CeremonyListDisplayProps {
  ceremonies: CeremonyData[];
}

const getCeremonyTypeLabel = (type: CeremonyData["type"]): string => {
  switch (type) {
    case "standup":
      return "Standup";
    case "planning":
      return "Planning";
    case "review":
      return "Review";
    case "retro":
      return "Retro";
    default:
      return type;
  }
};

const getStatusColor = (status: CeremonyData["status"]): string => {
  switch (status) {
    case "completed":
      return "bg-success/15 text-success";
    case "upcoming":
      return "bg-info/15 text-info";
    case "missed":
      return "bg-error/15 text-error";
    default:
      return "bg-surface-inset text-text-secondary";
  }
};

const getStatusLabel = (status: CeremonyData["status"]): string => {
  switch (status) {
    case "completed":
      return "Completed";
    case "upcoming":
      return "Upcoming";
    case "missed":
      return "Missed";
    default:
      return status;
  }
};

export function CeremonyListDisplay({ ceremonies }: CeremonyListDisplayProps) {
  if (!ceremonies || ceremonies.length === 0) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No ceremonies to display
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-sans text-lg font-bold text-foreground">Ceremonies</h2>
        <p className="font-sans text-sm text-text-secondary">
          Track ceremony progress and prepare for upcoming events
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
                Ceremony Type
              </th>
              <th className="px-4 py-3 text-left font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
                Scheduled Date
              </th>
              <th className="px-4 py-3 text-left font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
                Notes Artifact
              </th>
            </tr>
          </thead>
          <tbody>
            {ceremonies.map((ceremony) => (
              <tr key={ceremony.id} className="border-b border-border last:border-b-0 hover:bg-surface-inset/50">
                <td className="px-4 py-3">
                  <span className="font-sans font-medium text-foreground">
                    {getCeremonyTypeLabel(ceremony.type)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono tabular-nums text-foreground">
                    {ceremony.scheduledDate}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${getStatusColor(
                      ceremony.status,
                    )}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-current"
                      aria-hidden
                    />
                    {getStatusLabel(ceremony.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ceremony.status === "completed" && ceremony.notesArtifactLink ? (
                    <a
                      href={ceremony.notesArtifactLink}
                      className="font-sans text-sm font-medium text-action hover:text-action-hover underline underline-offset-2"
                    >
                      {ceremony.notesArtifactTitle || ceremony.notesArtifactLink}
                    </a>
                  ) : ceremony.status === "completed" ? (
                    <span className="font-sans text-sm text-text-secondary">
                      No notes yet
                    </span>
                  ) : (
                    <span className="font-sans text-sm text-text-secondary">
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
