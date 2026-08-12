"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getToken } from "@/lib/auth";
import { GitReposProjectConfig, RepoOut } from "./git-repos-config/GitReposProjectConfig";
import { SkeletonFormField } from "@/components/ui/skeleton/form-field";
import { SkeletonTableRow, SkeletonTableHeader } from "@/components/ui/skeleton/table-row";
import { UserRoleManagement } from "./user-role-management/UserRoleManagement";
import { useToast } from "@/app/components/ui/toast-provider";

type Role = "developer" | "product_manager" | "architect_tech_lead" | "ux_designer" | "admin";

interface UserSession {
  id: string;
  email: string;
  role: Role;
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
  const [repos, setRepos] = useState<RepoOut[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [connectedUsersStats, setConnectedUsersStats] = useState<any[]>([]);
  const [isConnectedUsersLoading, setIsConnectedUsersLoading] = useState(true);
  const { addToast } = useToast();
  const reconnectingToastShownRef = useRef(false);

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
    setIsConnectedUsersLoading(true);

    // Helper to handle backend unreachable
    const handleBackendUnreachable = () => {
      if (!reconnectingToastShownRef.current) {
        reconnectingToastShownRef.current = true;
        addToast({
          variant: "warning",
          title: "Reconnecting…",
          message: "Unable to reach the backend. Attempting to reconnect.",
        });
      }
      setIsBackendReachable(false);
    };

    // Helper to handle backend reachable
    const handleBackendReachable = () => {
      reconnectingToastShownRef.current = false;
      setIsBackendReachable(true);
    };

    // Fetch connected Git repos (Space list, discovered + manual)
    try {
      const reposResponse = await authFetch("/hub/admin/repos");
      if (reposResponse.ok) {
        const data = await reposResponse.json();
        setRepos(data.repos || []);
        handleBackendReachable();
      } else if (reposResponse.status === 503 || reposResponse.status === 502 || reposResponse.status === 504) {
        handleBackendUnreachable();
      } else {
        handleBackendReachable();
      }
    } catch {
      handleBackendUnreachable();
    }

    // Fetch users
    try {
      const usersResponse = await authFetch("/users/");
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data);
        handleBackendReachable();
      } else if (usersResponse.status === 503 || usersResponse.status === 502 || usersResponse.status === 504) {
        handleBackendUnreachable();
      } else {
        handleBackendReachable();
      }
    } catch {
      handleBackendUnreachable();
    }

    // Fetch connected users stats
    try {
      const statsResponse = await authFetch("/hub/admin/connected-users-stats");
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setConnectedUsersStats(data.users || []);
        handleBackendReachable();
      } else if (statsResponse.status === 503 || statsResponse.status === 502 || statsResponse.status === 504) {
        handleBackendUnreachable();
      } else {
        handleBackendReachable();
      }
    } catch {
      handleBackendUnreachable();
    } finally {
      setIsLoading(false);
      setIsUsersLoading(false);
      setIsConnectedUsersLoading(false);
    }
  };

  const handleAddRepo = async (technicalIdentifier: string) => {
    if (!isBackendReachable) {
      throw new Error("Backend unreachable");
    }

    const token = getToken();
    if (!token) return;

    try {
      const response = await authFetch("/hub/admin/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technical_identifier: technicalIdentifier }),
      });

      if (response.ok) {
        const newRepo: RepoOut = await response.json();
        setRepos((prev) => {
          // The Backend returns the existing `Space` (same id) when the
          // identifier was already known (discovered or previously added
          // manually) -- replace that row in place instead of appending a
          // duplicate with a colliding React key.
          const existingIndex = prev.findIndex((r) => r.id === newRepo.id);
          if (existingIndex === -1) return [...prev, newRepo];
          const next = [...prev];
          next[existingIndex] = newRepo;
          return next;
        });
      } else if (response.status === 503 || response.status === 502 || response.status === 504) {
        setIsBackendReachable(false);
        throw new Error("Backend unreachable");
      } else {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Impossible d'ajouter le dépôt.");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Backend unreachable") {
        setIsBackendReachable(false);
      }
      throw error;
    }
  };

  const handleAuthorizeRepo = async (repoId: string, credential: string) => {
    if (!isBackendReachable) {
      throw new Error("Backend unreachable");
    }

    const token = getToken();
    if (!token) return;

    try {
      const response = await authFetch(`/hub/admin/repos/${repoId}/credential`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      if (response.ok) {
        const updatedRepo: RepoOut = await response.json();
        setRepos((prev) => prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r)));
        if (updatedRepo.status !== "active") {
          // Access still refused with this credential -- surface it as a
          // failure so the inline form shows the error message, even
          // though the PATCH itself succeeded (credential was stored).
          throw new Error("Access still refused");
        }
      } else if (response.status === 503 || response.status === 502 || response.status === 504) {
        setIsBackendReachable(false);
        throw new Error("Backend unreachable");
      } else {
        throw new Error("Failed to authorize repository access");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Backend unreachable") {
        setIsBackendReachable(false);
      }
      throw error;
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

  if (isLoading || isUsersLoading || isConnectedUsersLoading) {
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

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border" role="table" aria-label="Dépôts Git connectés">
                <SkeletonTableHeader columns={4} />
                <tbody className="divide-y divide-border">
                  <SkeletonTableRow columns={4} />
                  <SkeletonTableRow columns={4} />
                </tbody>
              </table>
            </div>
            <SkeletonFormField label="Ajouter un dépôt" />
          </section>

          <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
            <h2 className="text-lg font-bold text-foreground">User & Role Management</h2>

            <div className="flex flex-col gap-4">
              <SkeletonFormField label="User Email" />
              <SkeletonFormField label="Role" />
            </div>
          </section>

          <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
            <h2 className="text-lg font-bold text-foreground">Connected Users Dashboard</h2>

            <div className="overflow-x-auto">
              <table
                className="min-w-full divide-y divide-border"
                role="table"
                aria-label="Connected Users Dashboard"
              >
                <SkeletonTableHeader />
                <tbody className="divide-y divide-border">
                  <SkeletonTableRow columns={9} />
                  <SkeletonTableRow columns={9} />
                  <SkeletonTableRow columns={9} />
                </tbody>
              </table>
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
            repos={repos}
            isBackendReachable={isBackendReachable}
            onAddRepo={handleAddRepo}
            onAuthorizeRepo={handleAuthorizeRepo}
          />
        </section>

        <UserRoleManagement
          users={users}
          isLoading={isUsersLoading}
          isBackendReachable={isBackendReachable}
          onSaveUserRole={handleSaveUserRole}
        />

        <section className="flex flex-col gap-6 rounded-md border border-border bg-surface px-4 py-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-foreground">Connected Users Dashboard</h2>
            <p className="text-sm text-text-secondary">
              List of connected users sorted by repository, with request counts by type
            </p>
          </div>

          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-border"
              role="table"
              aria-label="Connected Users Dashboard"
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
                    User ID
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Repository
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Heartbeat Count
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Claim Events
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Sync Events
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Conflict Events
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Total Requests
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-text-secondary"
                  >
                    Connection Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {connectedUsersStats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-3 text-sm text-text-secondary text-center">
                      No connected users found.
                    </td>
                  </tr>
                ) : (
                  connectedUsersStats.map((stat: any, index: number) => (
                    <tr key={stat.user_id || index} className="hover:bg-surface-elevated/50">
                      <td className="px-4 py-3 text-sm text-foreground">{stat.user_email}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{stat.user_id}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{stat.repository}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                        {stat.heartbeat_count || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                        {stat.claim_events || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                        {stat.sync_events || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                        {stat.conflict_events || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">
                        {stat.total_requests || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {stat.connection_source === 'http_rest' ? 'VS Code Extension' :
                         stat.connection_source === 'websocket' ? 'WebSocket' :
                         stat.connection_source || 'Unknown'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
