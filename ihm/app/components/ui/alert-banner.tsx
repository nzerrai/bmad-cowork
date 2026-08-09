/** Alert Banner Component (UX-DR7)
 *
 * Bloc teinté/bordé, affiché uniquement si condition bloquante existe
 * (pas de variant 'tout va bien').
 */

import React from "react";

type AlertBannerVariant = "warning" | "error" | "info";

interface AlertBannerProps {
  variant?: AlertBannerVariant;
  title: string;
  children: React.ReactNode;
  actionLink?: {
    href: string;
    label: string;
    target?: string;
  };
}

const VARIANT_CLASSES: Record<AlertBannerVariant, string> = {
  warning: "bg-warning/10 border-warning/30 text-warning-foreground",
  error: "bg-error/10 border-error/30 text-error-foreground",
  info: "bg-info/10 border-info/30 text-info-foreground",
};

export function AlertBanner({
  variant = "warning",
  title,
  children,
  actionLink,
}: AlertBannerProps) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${VARIANT_CLASSES[variant]}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-bold">{title}</h3>
          <p className="mt-1 text-sm">{children}</p>
        </div>
        {actionLink && (
          <a
            href={actionLink.href}
            target={actionLink.target || "_blank"}
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md bg-current/10 px-3 py-1.5 text-sm font-semibold hover:bg-current/20 transition-colors"
          >
            {actionLink.label}
          </a>
        )}
      </div>
    </div>
  );
}
