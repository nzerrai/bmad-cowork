"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getToken } from "@/lib/auth";
import { GitReposProjectConfig } from "./git-repos-config/GitReposProjectConfig";
import { SkeletonFormField } from "@/components/ui/skeleton/form-field";
import { UserRoleManagement } from "./user-role-management/UserRoleManagement";

type Role = "developer" | "product_manager" | "architect_tech_lead" | "ux_designer" | "admin";

interface UserSession {
  id: string;
  email: string;
  role: Role;
}

interface GitReposConfig {
  project_name: string;
  primary_repo_url: string;
  backup_repo_url: string | null;
  webhook_url: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  role: Role;
}

// Check if user has admin role
function hasAdminRole(session: UserSession | null): boolean {
  return session?.role === "admin";
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

export default function SystemAdministrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [config, setConfig] = useState<GitReposConfig | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const role = decodeTokenRole(token);

    if (!token || !role) {
      router.push("/login");
      return;
    }

    if (!hasAdminRole({ id: "temp", email: "temp@bmad.com", role })) {
      // Non-admin users should not see the System Administration nav item
      // They should be redirected to the dashboard
      router.push("/hub/dashboard");
      return;
    }

    // Fetch configuration data and users
    fetchConfigAndUsers(token, role);
  }, [router]);

  const fetchConfigAndUsers = async (token: string, role: Role) => {
    setIsLoading(true);
    setIsUsersLoading(true);

    // Fetch configuration data
    try {
      const configResponse = await authFetch("/hub/git-repos-config");
      if (configResponse.ok) {
        const data = await configResponse.json();
        setConfig(data);
      } else if (configResponse.status === 503 || configResponse.status === 502 || configResponse.status === 504) {
        // Backend unreachable
        setIsBackendReachable(false);
      }
    } catch {
      // Backend unreachable
      setIsBackendReachable(false);
    }

    // Fetch users
    try {
      const usersResponse = await authFetch("/users/");
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data);
        setIsBackendReachable(true);
      } else if (usersResponse.status === 503 || usersResponse.status === 502 || usersResponse.status === 504) {
        // Backend unreachable
        setIsBackendReachable(false);
      }
    } catch {
      // Backend unreachable
      setIsBackendReachable(false);
    } finally {
      setIsLoading(false);
      setIsUsersLoading(false);
    }
  };

  const handleSaveConfig = async (newConfig: GitReposConfig) => {
    if (!isBackendReachable) {
      return; // Save actions are disabled when Backend is unreachable
    }

    const token = getToken();
    if (!token) return;

    try {
      const response = await authFetch("/hub/git-repos-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        setConfig(newConfig);
      } else if (response.status === 503 || response.status === 502 || response.status === 504) {
        setIsBackendReachable(false);
      }
    } catch {
      setIsBackendReachable(false);
    }
  };

  const handleSaveUserRole = async (userId: string, newRole: Role) => {
    if (!isBackendReachable) {
      // Save actions are disabled when Backend is unreachable
      throw new Error("Backend unreachable");
    }

    const token = getToken();
    if (!token) return;

    try {
      const response = await authFetch(`/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update the user list with the new role
        const updatedUser = await response.json();
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === updatedUser.id ? { ...u, role: updatedUser.role } : u))
        );
      } else if (response.status === 503 || response.status === 502 || response.status === 504) {
        setIsBackendReachable(false);
        throw new Error("Backend unreachable");
      } else {
        throw new Error("Failed to update user role");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Backend unreachable") {
        setIsBackendReachable(false);
      }
      throw error;
    }
  };

  if (isLoading || isUsersLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-foreground">System Administration</h1>
            <p className="text-sm text-text-secondary">
              Configure project Git repositories and platform settings
            </p>
          </div>

          <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
            <h2 className="text-lg font-bold text-foreground">Git/Repos Project Configuration</h2>

            <div className="flex flex-col gap-4">
              <SkeletonFormField label="Project Name" />
              <SkeletonFormField label="Primary Repository URL" />
              <SkeletonFormField label="Backup Repository URL (Optional)" />
              <SkeletonFormField label="Webhook URL (Optional)" />
            </div>
          </section>

          <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
            <h2 className="text-lg font-bold text-foreground">User & Role Management</h2>

            <div className="flex flex-col gap-4">
              <SkeletonFormField label="User Email" />
              <SkeletonFormField label="Role" />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground">System Administration</h1>
          <p className="text-sm text-text-secondary">
            Configure project Git repositories and platform settings
          </p>
        </div>

        <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
          <h2 className="text-lg font-bold text-foreground">Git/Repos Project Configuration</h2>

          <GitReposProjectConfig
            config={config}
            isBackendReachable={isBackendReachable}
            onSave={handleSaveConfig}
          />
        </section>

        <UserRoleManagement
          users={users}
          isLoading={isUsersLoading}
          isBackendReachable={isBackendReachable}
          onSaveUserRole={handleSaveUserRole}
        />
      </main>
    </div>
  );
}
