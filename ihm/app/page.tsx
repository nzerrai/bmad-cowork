"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 min-h-full bg-[#0A1120] font-sans">
      <main className="flex flex-1 w-full max-w-5xl mx-auto flex-col py-16 px-8 sm:px-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-[#E7ECF6] mb-4">
            BMad Portal Hub
          </h1>
          <p className="text-lg leading-8 text-[#96A3C2] max-w-2xl mx-auto">
            Command Center for a distributed BMad platform. Track artifacts, monitor repository state, and coordinate development work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href="/artifacts"
            className="flex flex-col items-center justify-center p-6 bg-[#121B30] rounded-lg border border-[#24314F] hover:border-[#38BDF8] transition-colors"
          >
            <div className="text-2xl font-semibold text-[#E7ECF6] mb-2">
              Artifact Health
            </div>
            <p className="text-sm text-[#96A3C2] text-center">
              View artifact completeness, sync status, and broken links
            </p>
          </Link>

          <Link
            href="/hub/dashboard"
            className="flex flex-col items-center justify-center p-6 bg-[#121B30] rounded-lg border border-[#24314F] hover:border-[#38BDF8] transition-colors"
          >
            <div className="text-2xl font-semibold text-[#E7ECF6] mb-2">
              Dashboard Overview
            </div>
            <p className="text-sm text-[#96A3C2] text-center">
              View global Git + BMAD state: branches, PRs, sync status, and Local vs Remote context
            </p>
          </Link>

          <Link
            href="/hub/spaces"
            className="flex flex-col items-center justify-center p-6 bg-[#121B30] rounded-lg border border-[#24314F] hover:border-[#38BDF8] transition-colors"
          >
            <div className="text-2xl font-semibold text-[#E7ECF6] mb-2">
              Hub & Spaces
            </div>
            <p className="text-sm text-[#96A3C2] text-center">
              Manage space access and contributor git states
            </p>
          </Link>
        </div>

        <div className="bg-[#121B30] rounded-lg p-6 border border-[#24314F]">
          <h2 className="text-xl font-semibold text-[#E7ECF6] mb-4">
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[#5F6D8F]">Backend API</div>
              <div className="text-[#34D399] font-medium">● Running (8000)</div>
            </div>
            <div>
              <div className="text-[#5F6D8F]">WebSocket</div>
              <div className="text-[#34D399] font-medium">● ws://localhost:8000/ws</div>
            </div>
            <div>
              <div className="text-[#5F6D8F]">PostgreSQL</div>
              <div className="text-[#34D399] font-medium">● Running (5433)</div>
            </div>
            <div>
              <div className="text-[#5F6D8F]">Client Agent</div>
              <div className="text-[#96A3C2] font-medium">● v0.1.0</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
