"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.detail ?? "Invalid credentials");
        return;
      }

      const body = await response.json();
      setToken(body.access_token);
      router.push("/hub/dashboard");
    } catch {
      setError("Could not reach the Backend. Is it running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-md border border-border bg-surface p-6"
      >
        <h1 className="mb-6 text-lg font-bold text-foreground">Sign in</h1>

        <label
          className="mb-1 block text-xs font-bold tracking-wider text-text-secondary uppercase"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-4 w-full rounded-sm border border-border bg-surface-inset px-3 py-2 text-sm text-foreground outline-none focus:border-info"
        />

        <label
          className="mb-1 block text-xs font-bold tracking-wider text-text-secondary uppercase"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-sm border border-border bg-surface-inset px-3 py-2 text-sm text-foreground outline-none focus:border-info"
        />

        {error ? <p className="mb-4 text-sm text-error">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-action px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
