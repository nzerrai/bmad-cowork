/** Compliance Score Display Component

Displays compliance score with per-section breakdown to show which section is
dragging the score down. Handles broken cross-references by showing "Unresolved
reference: {path}" instead of a score, and marks the overall score as partial
when unresolved references exist.

All quality gate verification is 100% deterministic — zero LLM/AI calls for these tasks.
*/

"use client";

import React from "react";

export interface SectionComplianceScore {
  section_name: string;
  score: number | null;
  has_unresolved_reference: boolean;
  unresolved_path: string | null;
}

export interface ComplianceScoreData {
  overall_score: number | null;
  is_partial_score: boolean;
  sections: SectionComplianceScore[];
}

export interface ComplianceScoreDisplayProps {
  data?: ComplianceScoreData | null;
}

const PARTIAL_COLOR = "amber"; // {colors.warning}
const COMPLETE_COLOR = "emerald"; // {colors.success}
const INCOMPLETE_COLOR = "rose"; // {colors.error}

export function ComplianceScoreDisplay({ data }: ComplianceScoreDisplayProps) {
  // Handle the case where no data is provided
  if (!data) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No compliance score data available
        </p>
      </section>
    );
  }

  const { overall_score, is_partial_score, sections } = data;

  // Determine the overall score status
  let overallTone: string = "neutral";
  if (overall_score !== null && overall_score >= 80) {
    overallTone = COMPLETE_COLOR;
  } else if (overall_score !== null && overall_score >= 50) {
    overallTone = "amber";
  } else {
    overallTone = INCOMPLETE_COLOR;
  }

  const hasUnresolvedReferences = sections.some(s => s.has_unresolved_reference || s.score === null);

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      {/* Overall Compliance Score */}
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Overall Compliance Score
        </h3>
        <div className="flex items-center gap-4">
          {hasUnresolvedReferences || is_partial_score ? (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase">
                <span
                  className={`h-2 w-2 rounded-full bg-${PARTIAL_COLOR}-500`}
                  aria-hidden
                />
                Partial Score — Unresolved References
              </span>
              <p className="font-sans text-xs text-text-secondary">
                Overall score is marked partial due to unresolved references
              </p>
            </div>
          ) : overall_score !== null ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase ${
                overallTone === COMPLETE_COLOR
                  ? "bg-emerald/15 text-emerald"
                  : overallTone === "amber"
                    ? "bg-amber/15 text-amber"
                    : "bg-rose/15 text-rose"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full bg-current`}
                aria-hidden
              />
              {overall_score.toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase bg-neutral/15 text-neutral">
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
              No Score Available
            </span>
          )}
        </div>
      </div>

      {/* Per-Section Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Compliance Score Breakdown by Section
        </h3>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-inset/50">
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Section</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Score</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => (
                <tr key={index} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-foreground">{section.section_name}</td>
                  <td className="px-4 py-2 font-mono tabular-nums text-foreground">
                    {section.has_unresolved_reference || section.score === null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-rose/15 text-rose">
                        Unresolved reference: {section.unresolved_path || "unknown path"}
                      </span>
                    ) : section.score !== null ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                          section.score >= 80
                            ? "bg-emerald/15 text-emerald"
                            : section.score >= 50
                              ? "bg-amber/15 text-amber"
                              : "bg-rose/15 text-rose"
                        }`}
                      >
                        {section.score}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-neutral/15 text-neutral">
                        N/A
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {section.has_unresolved_reference ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-rose/15 text-rose">
                        Unresolved
                      </span>
                    ) : section.score === 100 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-emerald/15 text-emerald">
                        Complete
                      </span>
                    ) : section.score === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-rose/15 text-rose">
                        Missing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-amber/15 text-amber">
                        Incomplete
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
