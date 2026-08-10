/** Real-time Status Bar Component (UX-DR8 / UX-DR9)
 *
 * Thin, full-width WebSocket connectivity indicator:
 * - {colors.info} active
 * - {colors.neutral} idle
 * - {colors.error} Hub unreachable — showing last known state
 */

import React from "react";

export type StatusBarStatus = "active" | "idle" | "unreachable";

interface RealTimeStatusBarProps {
  status: StatusBarStatus;
  lastKnownStateTimestamp?: string | null;
}

export function RealTimeStatusBar({ status, lastKnownStateTimestamp }: RealTimeStatusBarProps) {
  const getStatusBarStyles = () => {
    switch (status) {
      case "active":
        return {
          bgColor: "bg-info/10",
          dotColor: "bg-info",
          glow: "shadow-[0_0_8px_rgba(56,189,248,0.3)]",
          text: "text-info",
          message: "Live — WebSocket connected",
        };
      case "idle":
        return {
          bgColor: "bg-neutral/10",
          dotColor: "bg-neutral",
          glow: "",
          text: "text-neutral",
          message: "Idle — WebSocket disconnected",
        };
      case "unreachable":
        return {
          bgColor: "bg-error/10",
          dotColor: "bg-error",
          glow: "shadow-[0_0_8px_rgba(251,100,120,0.3)]",
          text: "text-error",
          message: "Hub unreachable — showing last known state",
        };
    }
  };

  const styles = getStatusBarStyles();

  return (
    <div
      className={`flex items-center justify-between border-b px-4 py-2 ${styles.bgColor} ${styles.glow}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${styles.dotColor} ${styles.glow}`}
          aria-hidden
        />
        <span className={`text-xs font-semibold uppercase tracking-wider ${styles.text}`}>
          {styles.message}
        </span>
      </div>
      {status === "unreachable" && lastKnownStateTimestamp && (
        <span className={`text-xs ${styles.text}`}>
          Data stale since: {lastKnownStateTimestamp}
        </span>
      )}
    </div>
  );
}
