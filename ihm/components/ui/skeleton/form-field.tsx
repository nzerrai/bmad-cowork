/** Skeleton Form Field Component
 *
 * Displays a skeleton loading state for form fields.
 */

import React from "react";

export interface SkeletonFormFieldProps {
  label?: string;
  className?: string;
}

export function SkeletonFormField({ label, className = "" }: SkeletonFormFieldProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="h-4 w-32 animate-pulse rounded-sm bg-surface-elevated" />
      )}
      <div className="h-10 w-full animate-pulse rounded-md bg-surface-elevated" />
    </div>
  );
}

export function SkeletonFormFieldRow({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {label && (
        <div className="h-4 w-32 animate-pulse rounded-sm bg-surface-elevated flex-shrink-0" />
      )}
      <div className="h-10 w-full animate-pulse rounded-md bg-surface-elevated" />
    </div>
  );
}

export function SkeletonFormFieldText({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="h-4 w-32 animate-pulse rounded-sm bg-surface-elevated" />
      )}
      <div className="h-24 w-full animate-pulse rounded-md bg-surface-elevated" />
    </div>
  );
}
