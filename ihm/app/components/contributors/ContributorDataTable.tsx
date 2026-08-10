/** Contributor Data-heavy Tables Component (UX-DR8)
 *
 * Lignes haute densité, actions inline, cellules de statut colorées;
 * même règles pour paires label/valeur en panneau non-tabulaire.
 */

"use client";

import React from "react";

interface DataRow {
  label: string;
  value: string;
  status?: "success" | "warning" | "error" | "info" | "neutral";
}

interface ContributorDataTableProps {
  title: string;
  rows: DataRow[];
  hasProjectAccess: boolean;
  isStale?: boolean;
  lastKnownTime?: string;
}

export function ContributorDataTable({
  title,
  rows,
  hasProjectAccess,
  isStale,
  lastKnownTime,
}: ContributorDataTableProps) {
  if (!hasProjectAccess) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface px-4 py-6">
        <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          {title}
        </h3>
        <p className="text-sm text-text-secondary">Requires project access</p>
      </div>
    );
  }

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-success/15 text-success";
      case "warning":
        return "bg-warning/15 text-warning";
      case "error":
        return "bg-error/15 text-error";
      case "info":
        return "bg-info/15 text-info";
      case "neutral":
      default:
        return "bg-neutral/15 text-neutral";
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => {
          // Apply stale handler for repo-state rows
          const displayValue = isStale && row.label.includes("Repo State") && lastKnownTime
            ? `Last known — ${lastKnownTime}`
            : row.value;

          return (
            <div
              key={index}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface/50 px-3 py-2"
            >
              <span className="text-sm text-text-secondary">{row.label}</span>
              {row.status ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${getStatusClass(
                    row.status
                  )}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {displayValue}
                </span>
              ) : (
                <span className="text-sm text-foreground">{displayValue}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
