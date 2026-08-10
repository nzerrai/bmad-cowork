/** Quality Gates Display Component

Displays quality gates verification results including:
- Specs presence
- PR review status
- Test linkage verification

All quality gate verification is 100% deterministic — zero LLM/AI calls for these tasks.
*/

"use client";

import React from "react";

export interface QualityGatesData {
  specs_present: boolean;
  pr_review_status_verified: boolean;
  test_linkage_verified: boolean;
  overall_compliance_score: number | null;
  is_partial_score: boolean;
}

export interface QualityGatesDisplayProps {
  data?: QualityGatesData | null;
}

export function QualityGatesDisplay({ data }: QualityGatesDisplayProps) {
  // Handle the case where no data is provided
  if (!data) {
    return (
      <section className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-sans text-base font-semibold text-text-secondary">
          No quality gates data available
        </p>
      </section>
    );
  }

  const {
    specs_present,
    pr_review_status_verified,
    test_linkage_verified,
    overall_compliance_score,
    is_partial_score,
  } = data;

  const gatesVerified = specs_present && pr_review_status_verified && test_linkage_verified;

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      {/* Quality Gates Verification Results */}
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Quality Gates Verification
        </h3>
        <div className="overflow-x-auto rounded-md border border-border bg-surface-inset">
          <table className="w-full min-w-[360px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-inset/50">
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Gate</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">Specs Presence</td>
                <td className="px-4 py-2">
                  {specs_present ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-emerald/15 text-emerald">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-rose/15 text-rose">
                      Missing
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">PR Review Status</td>
                <td className="px-4 py-2">
                  {pr_review_status_verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-emerald/15 text-emerald">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-amber/15 text-amber">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">Test Linkage</td>
                <td className="px-4 py-2">
                  {test_linkage_verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-emerald/15 text-emerald">
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase bg-rose/15 text-rose">
                      Missing
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall Status */}
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
          Verification Status
        </h3>
        <div className="flex items-center gap-4">
          {is_partial_score ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase bg-amber/15 text-amber">
              Partial Verification — Unresolved References Detected
            </span>
          ) : gatesVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase bg-emerald/15 text-emerald">
              All Gates Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold uppercase bg-rose/15 text-rose">
              Gates Not Fully Verified
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
