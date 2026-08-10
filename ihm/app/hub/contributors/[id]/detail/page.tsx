"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function ContributorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contributorId = params?.id as string;

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  if (!contributorId) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error">
          Contributor ID is required.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Contributor Detail</h1>
        <p className="text-sm text-text-secondary">
          Contributor ID: {contributorId}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold tracking-wider text-text-secondary uppercase">
          Detail Panel
        </h2>
        <div className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
          Contributor detail panel for {contributorId} - Content to be implemented
        </div>
      </section>
    </main>
  );
}
