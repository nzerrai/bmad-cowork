/** Contributor Identity Header Component (UX-DR6)
 *
 * Avatar (initiales sur tuile gradient `{colors.action}`) + nom + rôle.
 */

"use client";

import React from "react";

interface ContributorIdentityHeaderProps {
  name: string;
  role: string;
}

export function ContributorIdentityHeader({
  name,
  role,
}: ContributorIdentityHeaderProps) {
  // Generate initials from name
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Generate a consistent gradient based on contributorId
  const gradientStyle = `linear-gradient(135deg, hsl(var(--action)), hsl(var(--action))/0.7)`;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white"
        style={{ background: gradientStyle }}
        aria-label={`Avatar for ${name}`}
      >
        {initials}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">{name}</div>
        <div className="text-xs text-text-secondary">{role}</div>
      </div>
    </div>
  );
}
