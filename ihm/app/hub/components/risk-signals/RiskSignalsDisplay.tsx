/** Risk Signals Display Component

Displays risk signals including:
- Stale stories (in-progress without activity > 3 days)
- High-risk Git conflict modules
- PRs awaiting review > 48 hours

All risk signal detection is 100% deterministic — zero LLM/AI calls for these tasks.
*/

"use client";

import React from "react";

export interface StaleStory {
  id: string;
  title: string;
  lastActivityDate: string;
  daysWithoutActivity: number;
}

export interface HighRiskGitModule {
  moduleName: string;
  contributors: string[];
  overlappingPaths: string[];
}

export interface PRAwaitingReview {
  prId: string;
  title: string;
  awaitingReviewForHours: number;
  assignees: string[];
}

export interface RiskSignalsData {
  staleStories: StaleStory[];
  highRiskGitModules: HighRiskGitModule[];
  prsAwaitingReview: PRAwaitingReview[];
}

export interface RiskSignalsDisplayProps {
  signals?: RiskSignalsData | null;
}

const RISK_CONFLICT_COLOR = "rose"; // {colors.error}
const DRIFTING_COLOR = "amber"; // {colors.warning}

export function RiskSignalsDisplay({ signals }: RiskSignalsDisplayProps) {
  // Handle the case where no signals data is provided
  if (!signals) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No risk signals data available
        </p>
      </section>
    );
  }

  // Check if there are any risk signals to display
  const hasSignals =
    signals.staleStories.length > 0 ||
    signals.highRiskGitModules.length > 0 ||
    signals.prsAwaitingReview.length > 0;

  if (!hasSignals) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No risk signals detected — all systems nominal
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      {/* Stale Stories */}
      {signals.staleStories.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            Stale Stories (in-progress without activity > 3 days)
          </h3>
          <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-inset/50">
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Story</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Last Activity</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Days Without Activity</th>
                </tr>
              </thead>
              <tbody>
                {signals.staleStories.map((story) => (
                  <tr key={story.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-foreground">{story.title}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">{story.lastActivityDate}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        RISK_CONFLICT_COLOR === "rose"
                          ? "bg-rose/15 text-rose"
                          : "bg-amber/15 text-amber"
                      }`}>
                        {story.daysWithoutActivity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High-Risk Git Conflict Modules */}
      {signals.highRiskGitModules.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            High-Risk Git Conflict Modules
          </h3>
          <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-inset/50">
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Module</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Contributors</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Overlapping Paths</th>
                </tr>
              </thead>
              <tbody>
                {signals.highRiskGitModules.map((module, index) => (
                  <tr key={index} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-foreground">{module.moduleName}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      {module.contributors.join(", ")}
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground text-xs">
                      {module.overlappingPaths.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRs Awaiting Review */}
      {signals.prsAwaitingReview.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            PRs Awaiting Review (> 48 hours)
          </h3>
          <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
            <table className="w-full min-w-[360px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-inset/50">
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">PR</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Awaiting Review For</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Assignees</th>
                </tr>
              </thead>
              <tbody>
                {signals.prsAwaitingReview.map((pr) => (
                  <tr key={pr.prId} className="border-t border-border">
                    <td className="px-4 py-2 font-medium text-foreground">{pr.title}</td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        RISK_CONFLICT_COLOR === "rose"
                          ? "bg-rose/15 text-rose"
                          : "bg-amber/15 text-amber"
                      }`}>
                        {pr.awaitingReviewForHours}h
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                      {pr.assignees.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
