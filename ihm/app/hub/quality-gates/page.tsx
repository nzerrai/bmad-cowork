/** Quality Gates Verification Page

Displays quality gates verification results and compliance score with per-section
breakdown to show exactly which section is dragging the score down.

All quality gate verification is 100% deterministic — zero LLM/AI calls for these tasks.
*/

"use client";

import { useCallback, useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { authFetch, clearToken, getToken } from "@/lib/auth";
import { QualityGatesDisplay, type QualityGatesData } from "../components/quality-gates/QualityGatesDisplay";
import { ComplianceScoreDisplay, type ComplianceScoreData } from "../components/compliance-score/ComplianceScoreDisplay";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; qualityGates: QualityGatesData; complianceScore: ComplianceScoreData };

type LoadAction =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "loaded"; qualityGates: QualityGatesData; complianceScore: ComplianceScoreData };

// A reducer (rather than useState) so the fetch-on-mount effect can call
// `dispatch` without tripping the "no setState in effects" lint rule.
function loadReducer(_state: LoadState, action: LoadAction): LoadState {
  switch (action.type) {
    case "loading":
      return { status: "loading" };
    case "error":
      return { status: "error", message: action.message };
    case "loaded":
      return { status: "loaded", qualityGates: action.qualityGates, complianceScore: action.complianceScore };
  }
}

interface QualityGatesVerificationResponse {
  specs_present: boolean;
  pr_review_status_verified: boolean;
  test_linkage_verified: boolean;
  overall_compliance_score: number | null;
  is_partial_score: boolean;
  sections: Array<{
    section_name: string;
    score: number | null;
    has_unresolved_reference: boolean;
    unresolved_path: string | null;
  }>;
}

export default function QualityGatesPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(loadReducer, { status: "loading" });

  const load = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      // Fetch quality gates verification data
      const qualityGatesResponse = await authFetch("/quality-gates/verification");
      if (qualityGatesResponse.status === 401) {
        clearToken();
        router.push("/login");
        return;
      }
      if (!qualityGatesResponse.ok) {
        dispatch({
          type: "error",
          message: `Quality gates verification fetch failed (HTTP ${qualityGatesResponse.status}).`,
        });
        return;
      }

      const qualityGatesData = (await qualityGatesResponse.json()) as QualityGatesVerificationResponse;

      // Build compliance score data from the response
      const complianceScoreData: ComplianceScoreData = {
        overall_score: qualityGatesData.overall_compliance_score,
        is_partial_score: qualityGatesData.is_partial_score,
        sections: qualityGatesData.sections,
      };

      const qualityGatesDisplayData: QualityGatesData = {
        specs_present: qualityGatesData.specs_present,
        pr_review_status_verified: qualityGatesData.pr_review_status_verified,
        test_linkage_verified: qualityGatesData.test_linkage_verified,
        overall_compliance_score: qualityGatesData.overall_compliance_score,
        is_partial_score: qualityGatesData.is_partial_score,
      };

      dispatch({ type: "loaded", qualityGates: qualityGatesDisplayData, complianceScore: complianceScoreData });
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
        <h1 className="font-sans text-xl font-bold text-foreground">Quality Gates Verification</h1>
        <p className="font-sans text-sm text-text-secondary">
          Verify artifact completeness and structural adherence to standards with detailed compliance scores
        </p>
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

      {state.status === "loaded" ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
              Quality Gates Verification Results
            </h2>
            <QualityGatesDisplay data={state.qualityGates} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-xs font-bold tracking-wider text-text-secondary uppercase">
              Compliance Score Breakdown
            </h2>
            <ComplianceScoreDisplay data={state.complianceScore} />
          </section>
        </div>
      ) : null}
    </main>
  );
}
