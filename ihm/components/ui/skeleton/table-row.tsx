/** Skeleton Table Row Component
 *
 * Displays a skeleton loading state for data tables.
 */

import React from "react";

export interface SkeletonTableRowProps {
  columns?: number;
  className?: string;
}

export function SkeletonTableRow({ columns = 9, className = "" }: SkeletonTableRowProps) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded-sm bg-surface-elevated" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTableHeader() {
  return (
    <thead className="bg-surface-elevated">
      <tr>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-40 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-20 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
        <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-elevated" />
        </th>
      </tr>
    </thead>
  );
}
