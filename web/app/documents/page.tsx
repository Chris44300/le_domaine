"use client";

import Link from "next/link";
import { useState } from "react";
import { callApi, firstErrorMessage, type ListItem } from "../lib/api";

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<{ name: string; body: string } | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motCle = query.trim();
    if (!motCle) return;

    setIsSearching(true);
    setSelected(null);
    const reponse = await callApi("/documents/search", { mot_cle: motCle });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
      setItems([]);
    } else {
      setError(null);
      const bloc = reponse.blocks[0];
      setItems(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setIsSearching(false);
  }

  async function openDocument(item: ListItem, action: "read" | "summarize") {
    setIsOpening(true);
    setError(null);
    const reponse = await callApi(`/documents/${action}`, { nom_fichier: item.id });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
    } else {
      const bloc = reponse.blocks[0];
      setSelected({
        name: item.label,
        body: bloc && bloc.kind === "text" ? bloc.body : "",
      });
    }
    setIsOpening(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 pb-40 pt-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Accueil
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un fichier ou un dossier…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSearching ? "…" : "Chercher"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {selected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-xs text-accent">
              Fermer
            </button>
          </div>
          <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/80">
            {selected.body}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="flex-1 truncate text-sm text-foreground">
                {item.meta?.type === "dossier" ? "📁 " : "📄 "}
                {item.label}
              </span>
              {item.meta?.type !== "dossier" && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openDocument(item, "read")}
                    disabled={isOpening}
                    className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                  >
                    Lire
                  </button>
                  <button
                    onClick={() => openDocument(item, "summarize")}
                    disabled={isOpening}
                    className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                  >
                    Résumer
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
