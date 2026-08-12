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

export interface SkeletonTableHeaderProps {
  columns?: number;
}

const HEADER_CELL_WIDTHS = ["w-32", "w-24", "w-40", "w-20", "w-20", "w-20", "w-20", "w-20", "w-24"];

export function SkeletonTableHeader({ columns = 9 }: SkeletonTableHeaderProps) {
  return (
    <thead className="bg-surface-elevated">
      <tr>
        {Array.from({ length: columns }).map((_, index) => (
          <th
            key={index}
            scope="col"
            className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
          >
            <div
              className={`h-4 ${HEADER_CELL_WIDTHS[index % HEADER_CELL_WIDTHS.length]} animate-pulse rounded-sm bg-surface-elevated`}
            />
          </th>
        ))}
      </tr>
    </thead>
  );
}
