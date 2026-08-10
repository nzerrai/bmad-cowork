/** Toast Notification Component (Non-intrusive real-time notifications)
 *
 * Displays non-intrusive toast notifications for claim, sync, and conflict events.
 * Toasts appear briefly and auto-dismiss (e.g., 3-5 seconds).
 * Toasts are positioned in a non-obstructive area of the UI (e.g., top-right corner).
 */

import React, { useEffect, useState } from "react";

type ToastVariant = "success" | "warning" | "error" | "info";

interface ToastProps {
  variant?: ToastVariant;
  title: string;
  message: string;
  onClose: () => void;
  autoDismissMs?: number;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "bg-success/10 border-success/30 text-success-foreground",
  warning: "bg-warning/10 border-warning/30 text-warning-foreground",
  error: "bg-error/10 border-error/30 text-error-foreground",
  info: "bg-info/10 border-info/30 text-info-foreground",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: "✓",
  warning: "⚠",
  error: "✕",
  info: "ℹ",
};

export function Toast({
  variant = "info",
  title,
  message,
  onClose,
  autoDismissMs = 5000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onClose]);

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
      className={`flex items-start gap-3 rounded-md border px-4 py-3 shadow-lg transition-opacity duration-300 ${VARIANT_CLASSES[variant]} ${isVisible ? "opacity-100" : "opacity-0"}`}
      role="alert"
      aria-live="polite"
    >
      <span className="text-sm" aria-hidden>
        {VARIANT_ICONS[variant]}
      </span>
      <div className="flex-1">
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="mt-1 text-sm">{message}</p>
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

export type ToastId = string;

export interface ToastNotification {
  id: ToastId;
  variant: ToastVariant;
  title: string;
  message: string;
}
