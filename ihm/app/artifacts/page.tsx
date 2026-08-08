"use client";

import { useCallback, useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch, clearToken, getToken } from "@/lib/auth";

type Completeness = "complete" | "incomplete" | "missing";
type SyncStatus = "synced" | "stale" | "deleted" | "error";

interface ArtifactTypeHealth {
  artifact_type: string;
  completeness: Completeness;
  count: number;
  error_count: number;
}

interface ArtifactLinkOut {
  source_field: string;
  target_path: string;
  target_artifact_id: string | null;
  resolved: boolean;
}

interface ArtifactOut {
  id: string;
  artifact_type: string;
  title: string | null;
  file_path: string;
  status: string | null;
  error: string | null;
  sync_status: SyncStatus;
  indexed_at: string;
  links_out: ArtifactLinkOut[];
}

interface ArtifactHealthResponse {
  types: ArtifactTypeHealth[];
  artifacts: ArtifactOut[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: ArtifactHealthResponse };

type LoadAction =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "loaded"; data: ArtifactHealthResponse };

// A reducer (rather than useState) so the fetch-on-mount effect can call
// `dispatch` without tripping the "no setState in effects" lint rule, which
// only recognizes bare `useState` setters, not `useReducer` dispatch.
function loadReducer(_state: LoadState, action: LoadAction): LoadState {
  switch (action.type) {
    case "loading":
      return { status: "loading" };
    case "error":
      return { status: "error", message: action.message };
    case "loaded":
      return { status: "loaded", data: action.data };
  }
}

// DESIGN.md's 11-type catalogue (FR1) — labels for the English snake_case
// `ArtifactType` values the Backend returns.
const TYPE_LABELS: Record<string, string> = {
  brainstorming: "Brainstorming",
  brief: "Brief",
  prd: "PRD",
  architecture: "Architecture",
  ux: "UX",
  tests: "Tests",
  specs: "Specs",
  epics: "Epics",
  stories: "Stories",
  decisions: "Decisions",
  ceremonies: "Ceremonies",
};

type PillTone = "success" | "warning" | "error" | "neutral";

const PILL_TONE_CLASSES: Record<PillTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  neutral: "bg-neutral/15 text-neutral",
};

const COMPLETENESS_TONE: Record<Completeness, PillTone> = {
  complete: "success",
  incomplete: "warning",
  missing: "neutral",
};

const SYNC_STATUS_TONE: Record<SyncStatus, PillTone> = {
  synced: "success",
  stale: "warning",
  deleted: "error",
  error: "neutral",
};

function StatusPill({ tone, label }: { tone: PillTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${PILL_TONE_CLASSES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border-soft">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-elevated" />
        </td>
      ))}
    </tr>
  );
}

function LinkChip({
  link,
  artifactById,
}: {
  link: ArtifactLinkOut;
  artifactById: Map<string, ArtifactOut>;
}) {
  if (link.resolved && link.target_artifact_id) {
    const target = artifactById.get(link.target_artifact_id);
    return (
      <span className="font-mono text-text-secondary">
        {target?.title ?? target?.file_path ?? link.target_path}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-error">
      <span aria-hidden>⚠</span>
      {link.target_path}
    </span>
  );
}

export default function ArtifactsPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(loadReducer, { status: "loading" });

  const load = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const response = await authFetch("/artifacts/health");
      if (response.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!response.ok) {
        dispatch({
          type: "error",
          message: `Artifact health check failed (HTTP ${response.status}).`,
        });
        return;
      }
      const data = (await response.json()) as ArtifactHealthResponse;
      dispatch({ type: "loaded", data });
    } catch {
      dispatch({ type: "error", message: "Backend unreachable." });
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [router, load]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link href="/artifacts/traceability" className="text-xs text-text-secondary underline underline-offset-2">
          Traceability Matrix →
        </Link>
        <h1 className="text-xl font-bold text-foreground">Artifact Health</h1>
      </div>

      {state.status === "error" ? (
        <div className="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error">
          {state.message}{" "}
          <button
            type="button"
            onClick={() => load()}
            className="ml-2 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Completeness by type
        </h2>
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs font-bold tracking-wider text-text-secondary uppercase">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">Errors</th>
              </tr>
            </thead>
            <tbody>
              {state.status === "loading"
                ? Array.from({ length: Object.keys(TYPE_LABELS).length }).map((_, index) => (
                    <SkeletonRow key={index} columns={4} />
                  ))
                : state.status === "loaded"
                  ? state.data.types.map((type) => (
                      <tr key={type.artifact_type} className="border-b border-border-soft last:border-b-0">
                        <td className="px-4 py-3 text-foreground">
                          {TYPE_LABELS[type.artifact_type] ?? type.artifact_type}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            tone={COMPLETENESS_TONE[type.completeness]}
                            label={type.completeness}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{type.count}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">
                          {type.error_count}
                        </td>
                      </tr>
                    ))
                  : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Artifacts
        </h2>
        {state.status === "loaded" && state.data.artifacts.length === 0 ? (
          <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
            No artifacts indexed yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs font-bold tracking-wider text-text-secondary uppercase">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">File path</th>
                  <th className="px-4 py-3">Sync</th>
                  <th className="px-4 py-3">Links</th>
                </tr>
              </thead>
              <tbody>
                {state.status === "loading" ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} columns={5} />
                  ))
                ) : state.status === "loaded" ? (
                  (() => {
                    const artifactById = new Map(
                      state.data.artifacts.map((artifact) => [artifact.id, artifact]),
                    );
                    return state.data.artifacts.map((artifact) => (
                      <tr key={artifact.id} className="border-b border-border-soft last:border-b-0">
                        <td className="px-4 py-3 text-foreground">
                          {TYPE_LABELS[artifact.artifact_type] ?? artifact.artifact_type}
                        </td>
                        <td className="px-4 py-3 text-foreground">{artifact.title ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">
                          {artifact.file_path}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            tone={SYNC_STATUS_TONE[artifact.sync_status]}
                            label={artifact.sync_status}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {artifact.links_out.length === 0 ? (
                            <span className="text-text-faint">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              {artifact.links_out.map((link, index) => (
                                <LinkChip
                                  key={`${link.source_field}-${index}`}
                                  link={link}
                                  artifactById={artifactById}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ));
                  })()
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
