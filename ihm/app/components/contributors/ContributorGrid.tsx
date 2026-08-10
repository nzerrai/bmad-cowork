/** ContributorGrid Component
 *
 * Main contributor grid/table component to display contributor rows with Status Pills.
 */

"use client";

import React from "react";
import { ContributorRow, ContributorData } from "./ContributorRow";

interface ContributorGridProps {
  contributors: ContributorData[];
}

export function ContributorGrid({ contributors }: ContributorGridProps) {
  if (contributors.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Contributors
        </h2>
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-surface-alt">
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-text-secondary">
                  No contributors found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
        Contributors
      </h2>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-surface-alt">
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((contributor) => (
              <ContributorRow
                key={contributor.id}
                contributor={contributor}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
