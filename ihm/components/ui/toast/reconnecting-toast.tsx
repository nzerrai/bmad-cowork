/** Reconnecting Toast Component
 *
 * Displays a non-intrusive toast notification for Backend disconnect states.
 * Toast appears when save actions are attempted while the Backend is unreachable.
 */

"use client";

import React, { useEffect, useState } from "react";

interface ReconnectingToastProps {
  onClose: () => void;
}

export function ReconnectingToast({ onClose }: ReconnectingToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      const fadeOutTimer = setTimeout(() => {
        onClose();
      }, 300); // Match CSS transition duration

      return () => clearTimeout(fadeOutTimer);
    }
  }, [isVisible, onClose]);

  return (
    <div
      className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 shadow-lg transition-opacity duration-300 text-warning-foreground"
      role="alert"
      aria-live="polite"
    >
      <span className="text-sm" aria-hidden>
        ⚠
      </span>
      <div className="flex-1">
        <h4 className="text-sm font-bold">Reconnecting…</h4>
        <p className="mt-1 text-sm">Backend is unreachable. Save actions are disabled.</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
        }}
        className="text-current hover:opacity-70 transition-opacity"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
