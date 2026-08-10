/** Navigation Component with RBAC Enforcement
 *
 * Displays the navigation menu with RBAC enforcement.
 * The System Administration nav item is hidden entirely from non-Admin users.
 */

"use client";

import React from "react";
import Link from "next/link";

type Role = "developer" | "product_manager" | "architect_tech_lead" | "ux_designer" | "admin";

interface NavigationProps {
  role: Role | null;
}

const ADMIN_NAV_ITEMS: Array<{ href: string; label: string; roles: Role[] }> = [
  {
    href: "/hub/admin/system-administration",
    label: "System Administration",
    roles: ["admin"],
  },
];

const COMMON_NAV_ITEMS: Array<{ href: string; label: string; roles: Role[] }> = [
  {
    href: "/hub/dashboard",
    label: "Dashboard",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/hub/spaces",
    label: "Hub & Spaces",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/hub/risk-signals",
    label: "Risk Signals",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/hub/quality-gates",
    label: "Quality Gates",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/hub/sprints",
    label: "Sprints",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/hub/contributors",
    label: "Contributors",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
  {
    href: "/artifacts",
    label: "Artifact Health",
    roles: ["developer", "product_manager", "architect_tech_lead", "ux_designer", "admin"],
  },
];

function isRoleAllowed(role: Role | null, allowedRoles: Role[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}

export function Navigation({ role }: NavigationProps) {
  const navItems = [
    ...COMMON_NAV_ITEMS.filter((item) => isRoleAllowed(role, item.roles)),
    ...ADMIN_NAV_ITEMS.filter((item) => isRoleAllowed(role, item.roles)),
  ];

  return (
    <nav className="flex flex-col gap-2 border-r border-border bg-surface p-4" aria-label="Main navigation">
      <Link href="/hub/dashboard" className="text-lg font-bold text-foreground mb-4 px-2 py-1">
        BMad Portal Hub
      </Link>
      <div className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-elevated hover:text-foreground transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
