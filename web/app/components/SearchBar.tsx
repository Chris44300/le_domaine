"use client";

import { useState } from "react";

type AskBlock = { kind: string; body?: string; message?: string };
type AskResponse = { status: "ok" | "error"; blocks: AskBlock[] };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SearchBar() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texte = message.trim();
    if (!texte || isLoading) return;

    setIsLoading(true);
    setAnswer(null);
    setIsError(false);

    try {
      const reponse = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte }),
      });
      const corps: AskResponse = await reponse.json();
      const bloc = corps.blocks[0];
      setIsError(corps.status === "error");
      setAnswer(bloc?.body ?? bloc?.message ?? "Pas de réponse.");
    } catch {
      setIsError(true);
      setAnswer(
        `Impossible de joindre l'API (${API_URL}). Le serveur local tourne-t-il ?`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        {answer && (
          <div
            className={`max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm ${
              isError
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                : "border-border bg-surface text-foreground"
            }`}
          >
            {answer}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Demande quelque chose au Domaine…"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {isLoading ? "…" : "Go"}
          </button>
        </form>
      </div>
    </div>
  );
}
