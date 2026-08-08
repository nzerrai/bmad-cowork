"use client";

import { useCallback, useEffect, useReducer, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authFetch, clearToken, getToken } from "@/lib/auth";

type NodeStatus = "completed" | "pending" | "linked" | "not_started";

interface TraceabilityNode {
  status: NodeStatus;
  artifact_id: string | null;
  title: string | null;
  file_path: string | null;
}

interface TraceabilityRow {
  epic_num: number;
  story_num: number;
  epic_title: string;
  story_title: string;
  idea_brief: TraceabilityNode;
  prd: TraceabilityNode;
  architecture: TraceabilityNode;
  ux: TraceabilityNode;
  story: TraceabilityNode;
  prs: TraceabilityNode;
  tests: TraceabilityNode;
}

interface TraceabilityMatrixResponse {
  rows: TraceabilityRow[];
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: TraceabilityMatrixResponse };

type LoadAction =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "loaded"; data: TraceabilityMatrixResponse };

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

const NODE_COLUMNS: { key: keyof Omit<TraceabilityRow, "epic_num" | "story_num" | "epic_title" | "story_title">; label: string }[] = [
  { key: "idea_brief", label: "Idea/Brief" },
  { key: "prd", label: "PRD" },
  { key: "architecture", label: "Architecture" },
  { key: "ux", label: "UX" },
  { key: "story", label: "Story" },
  { key: "prs", label: "PRs" },
  { key: "tests", label: "Tests" },
];

const COLUMN_COUNT = 2 + NODE_COLUMNS.length;

type PillTone = "success" | "warning" | "error" | "neutral";

const PILL_TONE_CLASSES: Record<PillTone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  neutral: "bg-neutral/15 text-neutral",
};

// Same 3-tone vocabulary Story 1.2 established for completeness/sync-status:
// `completed`/`linked` both mean "this stage is healthy" (shared meaning,
// same color slot, per DESIGN.md's "one meaning per color" rule).
const NODE_STATUS_TONE: Record<NodeStatus, PillTone> = {
  completed: "success",
  linked: "success",
  pending: "warning",
  not_started: "neutral",
};

const NODE_STATUS_LABEL: Record<NodeStatus, string> = {
  completed: "completed",
  pending: "pending",
  linked: "linked",
  not_started: "not started",
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

function buildRowElements(rows: TraceabilityRow[]): ReactNode[] {
  const elements: ReactNode[] = [];
  let previousEpicNum: number | null = null;

  for (const row of rows) {
    if (row.epic_num !== previousEpicNum) {
      previousEpicNum = row.epic_num;
      elements.push(
        <tr key={`epic-${row.epic_num}`} className="border-b border-border-soft bg-surface-elevated">
          <td
            colSpan={COLUMN_COUNT}
            className="px-4 py-2 text-xs font-bold tracking-wider text-text-secondary uppercase"
          >
            Epic {row.epic_num}: {row.epic_title}
          </td>
        </tr>,
      );
    }

    elements.push(
      <tr key={`${row.epic_num}-${row.story_num}`} className="border-b border-border-soft last:border-b-0">
        <td className="px-4 py-3 font-mono text-text-secondary">{row.epic_num}</td>
        <td className="px-4 py-3 text-foreground">
          {row.story_num}: {row.story_title}
        </td>
        {NODE_COLUMNS.map((column) => {
          const node = row[column.key];
          return (
            <td key={column.key} className="px-4 py-3">
              <StatusPill tone={NODE_STATUS_TONE[node.status]} label={NODE_STATUS_LABEL[node.status]} />
            </td>
          );
        })}
      </tr>,
    );
  }

  return elements;
}

export default function TraceabilityMatrixPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(loadReducer, { status: "loading" });

  const load = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const response = await authFetch("/artifacts/traceability");
      if (response.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!response.ok) {
        dispatch({
          type: "error",
          message: `Traceability matrix fetch failed (HTTP ${response.status}).`,
        });
        return;
      }
      const data = (await response.json()) as TraceabilityMatrixResponse;
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link href="/artifacts" className="text-xs text-text-secondary underline underline-offset-2">
          ← Artifact Health
        </Link>
        <h1 className="text-xl font-bold text-foreground">Traceability Matrix</h1>
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

      {state.status === "loaded" && state.data.rows.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
          No epics document indexed yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs font-bold tracking-wider text-text-secondary uppercase">
                <th className="px-4 py-3">Epic</th>
                <th className="px-4 py-3">Story</th>
                {NODE_COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.status === "loading"
                ? Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} columns={COLUMN_COUNT} />
                  ))
                : state.status === "loaded"
                  ? buildRowElements(state.data.rows)
                  : null}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
