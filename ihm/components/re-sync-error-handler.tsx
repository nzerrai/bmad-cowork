/** Re-sync Error Handler Component

Shows "Re-sync failed — retry" inline error without blocking others.
Aligns with the inline error pattern for failed operations.
*/

import React from "react";

interface ReSyncErrorHandlerProps {
  error: string | null;
}

export function ReSyncErrorHandler({ error }: ReSyncErrorHandlerProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error-foreground"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{error}</span>
      </div>
    </div>
  );
}
