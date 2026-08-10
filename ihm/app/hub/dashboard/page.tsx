"use client";

import { OverviewDashboard } from "@/app/components/dashboard/OverviewDashboard";

type BranchStatusType = "up-to-date" | "ahead" | "behind" | "conflict";

interface BranchInfo {
  name: string;
  context: "local" | "remote";
  status: BranchStatusType;
}

interface PRInfo {
  number: number;
  title: string;
  status: "open" | "review" | "merged" | "closed";
  context: "local" | "remote";
  updatedAt: string;
}

// Mock data for demonstration
const MOCK_BRANCH: BranchInfo = {
  name: "main",
  context: "remote",
  status: "up-to-date",
};

const MOCK_PRS: PRInfo[] = [
  {
    number: 142,
    title: "feat: implement dashboard overview health view",
    status: "review",
    context: "remote",
    updatedAt: "2026-08-10 14:30",
  },
  {
    number: 141,
    title: "feat: add real-time status bar component",
    status: "open",
    context: "remote",
    updatedAt: "2026-08-10 12:15",
  },
];

export default function HubDashboardPage() {
  const hubStatus: "healthy" | "unreachable" = "healthy";
  const lastKnownStateTimestamp: string | null = null;

  return (
    <OverviewDashboard
      initialBranch={MOCK_BRANCH}
      initialPRs={MOCK_PRS}
      initialHubStatus={hubStatus}
      initialLastKnownStateTimestamp={lastKnownStateTimestamp}
    />
  );
}
