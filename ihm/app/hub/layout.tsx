/** Hub Layout with Navigation and RBAC Enforcement
 *
 * Provides the layout for all hub pages including the navigation with RBAC enforcement.
 * The System Administration nav item is hidden entirely from non-Admin users.
 */

"use client";

import React, { useEffect, useState } from "react";
import { Navigation } from "@/app/components/nav/Navigation";
import { getToken } from "@/lib/auth";

type Role = "developer" | "product_manager" | "architect_tech_lead" | "ux_designer" | "admin";

interface HubLayoutProps {
  children: React.ReactNode;
}

// Decode JWT token to get user role
function decodeTokenRole(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export default function HubLayout({ children }: HubLayoutProps) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const token = getToken();
    const userRole = decodeTokenRole(token);
    setRole(userRole);
  }, []);

  return (
    <div className="flex flex-1 min-h-full bg-[#0A1120] font-sans">
      <Navigation role={role} />
      <div className="flex flex-1 flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
