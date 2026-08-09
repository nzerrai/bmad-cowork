/** Status Pill Component (UX-DR5)
 *
 * Pastille + label ; clic navigue toujours vers le détail de l'entité
 * (jamais purement décoratif).
 */

import React from "react";
import Link from "next/link";

type StatusPillTone = "pending" | "active" | "access_revoked";

const PILL_TONE_CLASSES: Record<StatusPillTone, string> = {
  pending: "bg-warning/15 text-warning",
  active: "bg-success/15 text-success",
  access_revoked: "bg-error/15 text-error",
};

const PILL_LABELS: Record<StatusPillTone, string> = {
  pending: "En attente d'accès",
  active: "Actif",
  access_revoked: "Accès révoqué",
};

interface StatusPillProps {
  status: StatusPillTone;
  onClick?: () => void;
  href?: string;
}

export function StatusPill({ status, onClick, href }: StatusPillProps) {
  const tone = PILL_TONE_CLASSES[status];
  const label = PILL_LABELS[status];

  const pillContent = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${tone}`}
      onClick={onClick}
      role={onClick || href ? "button" : "status"}
      aria-label={`Statut: ${label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="cursor-pointer hover:opacity-80 transition-opacity">
        {pillContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${tone} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={onClick}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {label}
      </button>
    );
  }

  return pillContent;
}
