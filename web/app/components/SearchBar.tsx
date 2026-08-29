"use client";

import { useState } from "react";
import { callApi, firstErrorMessage, type Block } from "../lib/api";

export default function SearchBar() {
  const [message, setMessage] = useState("");
  const [block, setBlock] = useState<Block | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texte = message.trim();
    if (!texte || isLoading) return;

    setIsLoading(true);
    setBlock(null);
    setIsError(false);

    const reponse = await callApi("/ask", { message: texte });
    const erreur = firstErrorMessage(reponse);
    setIsError(erreur !== null);
    if (erreur) {
      setBlock({ kind: "text", body: erreur });
    } else {
      setBlock(reponse.blocks[0] ?? { kind: "text", body: "Pas de réponse." });
    }
    setIsLoading(false);
  }

  async function handleToggle(id: string) {
    await callApi("/tasks/toggle", { reference_id: id });
    const reponse = await callApi("/tasks/list", { inclure_faites: true });
    const bloc = reponse.blocks[0];
    if (bloc) setBlock(bloc);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        {block && block.kind === "text" && (
          <div
            className={`max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm ${
              isError
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                : "border-border bg-surface text-foreground"
            }`}
          >
            {block.body}
          </div>
        )}

        {block && block.kind === "list" && (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {block.items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleToggle(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      item.done
                        ? "border-accent bg-accent text-white"
                        : "border-border text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`flex-1 text-sm ${item.done ? "text-foreground/40 line-through" : "text-foreground"}`}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
            {block.items.length === 0 && (
              <p className="text-sm text-foreground/60">Aucun résultat.</p>
            )}
          </ul>
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
