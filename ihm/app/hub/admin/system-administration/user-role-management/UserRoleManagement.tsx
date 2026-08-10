/** User & Role Management Form Component
 *
 * Allows administrators to view and change user roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin).
 */

"use client";

import React, { useState, useEffect } from "react";
import { ReconnectingToast } from "@/components/ui/toast/reconnecting-toast";
import { SkeletonFormField } from "@/components/ui/skeleton/form-field";
import { authFetch, getToken } from "@/lib/auth";

type Role = "developer" | "product_manager" | "architect_tech_lead" | "ux_designer" | "admin";

export interface UserWithRole {
  id: string;
  email: string;
  role: Role;
}

interface UserRoleManagementProps {
  users: UserWithRole[];
  isLoading: boolean;
  isBackendReachable: boolean;
  onSaveUserRole: (userId: string, newRole: Role) => Promise<void>;
}

const ROLE_LABELS: Record<Role, string> = {
  developer: "Developer",
  product_manager: "Product Manager",
  architect_tech_lead: "Architect/Tech Lead",
  ux_designer: "UX Designer",
  admin: "Admin",
};

const ALL_ROLES: Role[] = [
  "developer",
  "product_manager",
  "architect_tech_lead",
  "ux_designer",
  "admin",
];

export function UserRoleManagement({
  users,
  isLoading,
  isBackendReachable,
  onSaveUserRole,
}: UserRoleManagementProps) {
  const [showReconnectingToast, setShowReconnectingToast] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, Role>>({});

  // Initialize selected roles from users
  useEffect(() => {
    const rolesMap: Record<string, Role> = {};
    users.forEach((user) => {
      rolesMap[user.id] = user.role;
    });
    setSelectedRoles(rolesMap);
  }, [users]);

  const handleRoleChange = (userId: string, newRole: Role) => {
    setSelectedRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const handleSave = async (userId: string, currentRole: Role) => {
    const newRole = selectedRoles[userId];

    if (!newRole || newRole === currentRole) {
      return; // No change
    }

    if (!isBackendReachable) {
      setShowReconnectingToast(true);
      return;
    }

    try {
      await onSaveUserRole(userId, newRole);
    } catch {
      if (!isBackendReachable) {
        setShowReconnectingToast(true);
      }
    }
  };

  const toggleReconnectingToast = () => {
    setShowReconnectingToast(false);
  };

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
        <h2 className="text-lg font-bold text-foreground">User & Role Management</h2>

        <div className="flex flex-col gap-4">
          <SkeletonFormField label="User Email" />
          <SkeletonFormField label="Role" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
      {showReconnectingToast && <ReconnectingToast onClose={toggleReconnectingToast} />}

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-foreground">User & Role Management</h2>
        <p className="text-sm text-text-secondary">
          View and change user roles (Developer, PM, Architect/Tech Lead, UX Designer, Admin)
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {users.length === 0 ? (
          <p className="text-sm text-text-secondary">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-border"
              role="table"
              aria-label="User and Role Management"
            >
              <thead className="bg-surface-elevated">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    User Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Current Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Assign New Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const isRoleChanged = selectedRoles[user.id] !== user.role;
                  const canSave = isBackendReachable && isRoleChanged;

                  return (
                    <tr key={user.id} className="hover:bg-surface-elevated/50">
                      <td className="px-4 py-3 text-sm text-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <span className="inline-flex items-center rounded-md bg-surface-elevated px-2 py-1 text-xs font-medium">
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <select
                          id={`role-select-${user.id}`}
                          value={selectedRoles[user.id]}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          disabled={!isBackendReachable}
                          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-info"
                          aria-label={`Select role for ${user.email}`}
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleSave(user.id, user.role)}
                          disabled={!canSave}
                          className="rounded-md bg-action/20 px-3 py-1.5 text-sm font-semibold text-action hover:bg-action/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-info"
                          aria-label={`Save role change for ${user.email}`}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
