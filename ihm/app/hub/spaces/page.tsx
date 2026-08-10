"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { AlertBanner } from "@/app/components/ui/alert-banner";
import { StatusPill } from "@/app/components/ui/status-pill";

type HubStatus = "pending" | "active" | "access_revoked";

interface SpaceData {
  space_id: string;
  technical_identifier: string;
  short_name: string;
  status: HubStatus;
  access_grant_link?: string | null;
  access_grant_fallback_text?: string | null;
}

// Mock data for demonstration
const MOCK_SPACE_DATA: SpaceData = {
  space_id: "mock-space-id",
  technical_identifier: "github.com/org/repo",
  short_name: "repo",
  status: "pending",
  access_grant_link: "Accordez l'accès en lecture au dépôt sur GitHub : https://github.com/org/repo/settings/keys",
  access_grant_fallback_text: null,
};

export default function HubSpacesPage() {
  const router = useRouter();
  const space = MOCK_SPACE_DATA;
  const loading = false;
  const error = null;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
        <p className="text-sm text-text-secondary">Chargement de l&apos;espace Hub...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error">
          {error}
        </div>
      </main>
    );
  }

  if (!space) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
          Aucun espace Hub trouvé.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Espace Hub</h1>
      </div>

      {/* Pending Access Alert Banner */}
      {space.status === "pending" && (
        <section className="flex flex-col gap-3">
          <AlertBanner
            variant="warning"
            title="Accès au dépôt en attente"
            actionLink={
              space.access_grant_link
                ? {
                    href: space.access_grant_link.includes("https://")
                      ? space.access_grant_link.split("https://")[1].split(" ")[0]
                      : "https://github.com/settings/apps",
                    label: "Accorder l'accès",
                    target: "_blank",
                  }
                : space.access_grant_fallback_text
                ? {
                    href: "#",
                    label: "Voir les paramètres Git",
                    target: "_blank",
                  }
                : undefined
            }
          >
            {space.access_grant_fallback_text ||
              (space.access_grant_link
                ? space.access_grant_link
                : "Veuillez accorder l'accès en lecture au dépôt depuis les paramètres de votre fournisseur Git.")}
          </AlertBanner>
        </section>
      )}

      {/* Active or Access Revoked Status */}
      {space.status === "active" && (
        <section className="flex flex-col gap-3">
          <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success-foreground">
            L&apos;accès au dépôt est actif.
          </div>
        </section>
      )}

      {space.status === "access_revoked" && (
        <section className="flex flex-col gap-3">
          <AlertBanner
            variant="error"
            title="Accès au dépôt révoqué"
          >
            L&apos;accès en lecture au dépôt a été révoqué. Veuillez le rétablir et recharger cette page.
          </AlertBanner>
        </section>
      )}

      {/* Space Details */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Détails de l&apos;espace
        </h2>
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <tbody>
              <tr className="border-b border-border-soft">
                <td className="px-4 py-3 font-medium text-text-secondary">Identifiant technique</td>
                <td className="px-4 py-3 font-mono text-foreground">{space.technical_identifier}</td>
              </tr>
              <tr className="border-b border-border-soft">
                <td className="px-4 py-3 font-medium text-text-secondary">Nom court</td>
                <td className="px-4 py-3 text-foreground">{space.short_name}</td>
              </tr>
              <tr className="border-b border-border-soft">
                <td className="px-4 py-3 font-medium text-text-secondary">Statut</td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={space.status}
                    href={`/hub/spaces/${space.space_id}`}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
