/** Branch and PR Status Component
 *
 * Shows current branch state and open PRs with their status,
 * with Local vs Remote context visually distinguished per DESIGN.md:
 * - Local: muted — {colors.neutral} and {colors.text-secondary}
 * - Remote: vibrant — {colors.info} and {colors.action} with glow
 */

import React from "react";

export type ContextType = "local" | "remote";
export type StatusType = "up-to-date" | "ahead" | "behind" | "conflict";

export interface BranchInfo {
  name: string;
  context: ContextType;
  status: StatusType;
}

export interface PRInfo {
  number: number;
  title: string;
  status: "open" | "review" | "merged" | "closed";
  context: ContextType;
  updatedAt: string;
}

interface BranchPRStatusProps {
  currentBranch?: BranchInfo | null;
  openPRs?: PRInfo[];
}

const statusLabels: Record<StatusType, string> = {
  "up-to-date": "Up to date",
  ahead: "Ahead",
  behind: "Behind",
  conflict: "Conflict",
};

const prStatusLabels: Record<PRInfo["status"], string> = {
  open: "Open",
  review: "In Review",
  merged: "Merged",
  closed: "Closed",
};

export function BranchPRStatus({ currentBranch, openPRs = [] }: BranchPRStatusProps) {
  const getContextClasses = (context: ContextType) => {
    if (context === "local") {
      return `text-neutral text-text-secondary`;
    }
    return `text-info`;
  };

  const getContextGlow = (context: ContextType) => {
    return context === "remote" ? "shadow-[0_0_8px_rgba(56,189,248,0.3)]" : "";
  };

  const getStatusBadgeClass = (status: StatusType) => {
    switch (status) {
      case "up-to-date":
        return "bg-success/15 text-success";
      case "ahead":
        return "bg-info/15 text-info";
      case "behind":
        return "bg-warning/15 text-warning";
      case "conflict":
        return "bg-error/15 text-error";
    }
  };

  const getPRStatusBadgeClass = (status: PRInfo["status"]) => {
    switch (status) {
      case "open":
        return "bg-info/15 text-info";
      case "review":
        return "bg-action/15 text-action";
      case "merged":
        return "bg-success/15 text-success";
      case "closed":
        return "bg-neutral/15 text-neutral";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Current Branch State */}
      {currentBranch && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
            Current Branch State
          </h3>
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-[320px] border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="px-4 py-3 font-medium text-text-secondary">Branch</td>
                  <td className={`px-4 py-3 font-mono ${getContextClasses(currentBranch.context)} ${getContextGlow(currentBranch.context)}`}>
                    {currentBranch.name}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-text-secondary">Sync Status</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${getStatusBadgeClass(
                        currentBranch.status,
                      )}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {statusLabels[currentBranch.status]}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Open PRs */}
      {openPRs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
            Open Pull Requests
          </h3>
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-soft">
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">PR</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Title</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Context</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Updated</th>
                </tr>
              </thead>
              <tbody>
                {openPRs.map((pr) => (
                  <tr key={pr.number} className="border-b border-border-soft">
                    <td className="px-4 py-3 font-mono">#{pr.number}</td>
                    <td className="px-4 py-3 text-foreground">{pr.title}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${getContextClasses(pr.context)} ${getContextGlow(pr.context)}`}>
                        {pr.context === "local" ? "Local" : "Remote"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${getPRStatusBadgeClass(
                          pr.status,
                        )}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {prStatusLabels[pr.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-faint">{pr.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
