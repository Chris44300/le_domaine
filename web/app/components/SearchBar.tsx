"use client";

import { useState } from "react";
import { callApi, firstErrorMessage, type Block, type ListItem } from "../lib/api";

function isTaskItem(item: ListItem) {
  return item.done !== undefined;
}

export default function SearchBar() {
  const [message, setMessage] = useState("");
  const [block, setBlock] = useState<Block | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [documentOuvert, setDocumentOuvert] = useState<{ name: string; body: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texte = message.trim();
    if (!texte || isLoading) return;

    setIsLoading(true);
    setBlock(null);
    setIsError(false);
    setDocumentOuvert(null);
    setMessage("");

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

  async function handleToggleTask(id: string) {
    await callApi("/tasks/toggle", { reference_id: id });
    const reponse = await callApi("/tasks/list", { inclure_faites: true });
    const bloc = reponse.blocks[0];
    if (bloc) setBlock(bloc);
  }

  async function handleOpenDocument(item: ListItem) {
    const reponse = await callApi("/documents/read", { nom_fichier: item.id });
    const erreur = firstErrorMessage(reponse);
    const bloc = reponse.blocks[0];
    setDocumentOuvert({
      name: item.label,
      body: erreur ?? (bloc && bloc.kind === "text" ? bloc.body : ""),
    });
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

        {documentOuvert && (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">{documentOuvert.name}</h2>
              <button onClick={() => setDocumentOuvert(null)} className="text-xs text-accent">
                Fermer
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/80">{documentOuvert.body}</p>
          </div>
        )}

        {block && block.kind === "list" && !documentOuvert && (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {block.items.map((item) =>
              isTaskItem(item) ? (
                <li key={item.id}>
                  <button
                    onClick={() => handleToggleTask(item.id)}
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
              ) : (
                <li key={item.id}>
                  <button
                    onClick={() =>
                      item.meta?.type === "dossier" ? undefined : handleOpenDocument(item)
                    }
                    disabled={item.meta?.type === "dossier"}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left disabled:opacity-60"
                  >
                    <span className="shrink-0">{item.meta?.type === "dossier" ? "📁" : "📄"}</span>
                    <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
                  </button>
                </li>
              ),
            )}
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
