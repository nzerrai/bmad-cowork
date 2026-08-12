/** Toast Provider Component
 *
 * Manages a list of toast notifications and displays them in a non-obstructive area
 * of the UI (top-right corner).
 */

"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Toast, ToastNotification, ToastId } from "./toast";

interface ToastContextType {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, "id"> & { id?: ToastId }) => ToastId;
  removeToast: (id: ToastId) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, "id"> & { id?: ToastId }): ToastId => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      id,
      ...toast,
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: ToastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/** Toast Container Component
 *
 * Renders the toast notifications in a fixed position at the top-right corner.
 * This should be placed inside the <body> element.
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToastContext();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

/** Custom hook to access toast context */
function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return {
    addToast: context.addToast,
    removeToast: context.removeToast,
  };
}
