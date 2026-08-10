/** Risk Signals Dashboard Page

Displays risk signals including:
- Stale stories (in-progress without activity > 3 days)
- High-risk Git conflict modules
- PRs awaiting review > 48 hours

All risk signal detection is 100% deterministic — zero LLM/AI calls for these tasks.
*/

"use client";

import React from "react";
import { RiskSignalsDisplay, RiskSignalsData } from "../components/risk-signals/RiskSignalsDisplay";

export default function RiskSignalsPage() {
  // Mock data for demonstration - In production, this would come from the Backend API
  // derived from the local repo state reporting stream (Story 2.5) and canonical state
  // reporting stream for Git drift and in-progress-action data.
  const riskSignals: RiskSignalsData = {
    // Stale stories: in-progress without activity for more than 3 days
    staleStories: [
      {
        id: "story-5-2",
        title: "5-2-quality-gates-verification-with-compliance-score-breakdown",
        lastActivityDate: "2026-08-05",
        daysWithoutActivity: 5,
      },
    ],
    // High-risk Git conflict modules: derived from local drift with multiple contributors
    // touching overlapping paths
    highRiskGitModules: [
      {
        moduleName: "ihm/app/components/notifications",
        contributors: ["nouredinezerrai", "other-dev"],
        overlappingPaths: [
          "ihm/app/components/notifications/WebSocketNotificationProvider.tsx",
          "ihm/app/components/ui/toast-provider.tsx",
        ],
      },
    ],
    // PRs awaiting review for more than 48 hours
    prsAwaitingReview: [
      {
        prId: "pr-1234",
        title: "feat: implement Risk Signals Display",
        awaitingReviewForHours: 72,
        assignees: ["tech-lead", "pm"],
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-xl font-bold text-foreground">Risk & Quality Signals</h1>
          <p className="font-sans text-sm text-text-secondary">
            Identify stories at risk, Git conflict risk modules, and verify quality gates
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
            Risk Signals Dashboard
          </h2>
          <RiskSignalsDisplay signals={riskSignals} />
        </section>
      </main>
    </div>
  );
}
