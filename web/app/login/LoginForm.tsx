"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const reponse = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (reponse.ok) {
      router.push(searchParams.get("from") ?? "/");
      router.refresh();
    } else {
      setError("Jeton invalide.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="mb-2 text-center text-xl font-semibold text-foreground">
        Le Domaine
      </h1>
      <input
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="Jeton d'accès"
        autoFocus
        className="rounded-full border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
      />
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isLoading || !token}
        className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isLoading ? "…" : "Entrer"}
      </button>
    </form>
  );
}
