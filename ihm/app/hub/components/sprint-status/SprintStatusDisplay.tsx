/** Sprint Status Display Component

Displays sprint progression (stories done vs total), dates, objectives,
and completion percentage. Shows "No active sprint" if no sprint is configured.
*/

"use client";

import React from "react";

export interface SprintData {
  id: string;
  name: string;
  status: "active" | "completed";
  startDate: string;
  endDate: string;
  objectives: string[];
  storiesDone: number;
  storiesTotal: number;
}

export interface SprintStatusDisplayProps {
  sprint?: SprintData | null;
}

const calculateCompletionPercentage = (storiesDone: number, storiesTotal: number): number => {
  if (storiesTotal === 0) {
    return 0;
  }
  return Math.round((storiesDone / storiesTotal) * 100);
};

export function SprintStatusDisplay({ sprint }: SprintStatusDisplayProps) {
  // Handle the case where no sprint is configured
  if (!sprint) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No active sprint
        </p>
      </section>
    );
  }

  const completionPercentage = calculateCompletionPercentage(
    sprint.storiesDone,
    sprint.storiesTotal,
  );

  const isCompleted = sprint.status === "completed";
  const statusLabel = isCompleted ? "Completed" : "Active";

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold text-foreground">{sprint.name}</h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
              isCompleted
                ? "bg-success/15 text-success"
                : "bg-info/15 text-info"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Progression - Stories Done vs Total */}
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Progression
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-sans text-sm font-medium text-text-secondary">Stories</span>
            <span className="font-mono tabular-nums text-sm font-semibold text-foreground">
              {sprint.storiesDone} / {sprint.storiesTotal}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-inset">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-success"
                  : "bg-action"
              }`}
              style={{ width: `${completionPercentage}%` }}
              role="progressbar"
              aria-valuenow={completionPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Sprint completion: ${completionPercentage}%`}
            />
          </div>
        </div>
      </div>

      {/* Completion Percentage */}
      <div className="flex flex-col gap-2">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Completion
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-sans text-sm font-medium text-text-secondary">Percentage</span>
          <span className="font-mono tabular-nums text-lg font-bold text-foreground">
            {completionPercentage}%
          </span>
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-col gap-2">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Sprint Dates
        </h3>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
          <table className="w-full min-w-[240px] border-collapse text-sm">
            <tbody>
              <tr>
                <td className="px-4 py-2 font-medium text-text-secondary">Start</td>
                <td className="px-4 py-2 font-mono tabular-nums text-foreground">{sprint.startDate}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium text-text-secondary">End</td>
                <td className="px-4 py-2 font-mono tabular-nums text-foreground">{sprint.endDate}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Objectives */}
      {sprint.objectives && sprint.objectives.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            Objectives
          </h3>
          <ul className="flex flex-col gap-2">
            {sprint.objectives.map((objective, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-md bg-surface-inset px-3 py-2"
              >
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-action flex-shrink-0" aria-hidden />
                <span className="font-sans text-sm text-foreground">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
