"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildDownloadUrl, callApi, firstErrorMessage, type ListItem } from "../lib/api";

type Selection = { item: ListItem; kind: "read" | "summarize"; body: string };

function joinPath(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

export default function DocumentsPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  async function loadFolder(path: string) {
    setIsLoading(true);
    setError(null);
    setSelection(null);
    setSearchActive(false);
    setQuery("");
    const reponse = await callApi("/documents/list", { dossier: path || null });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
      setItems([]);
    } else {
      const bloc = reponse.blocks[0];
      setItems(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setCurrentPath(path);
    setIsLoading(false);
  }

  useEffect(() => {
    // Chargement initial au montage - cas de fetch-in-effect explicitement
    // valide selon https://react.dev/learn/you-might-not-need-an-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFolder("");
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const motCle = query.trim();
    if (!motCle) return;

    setIsLoading(true);
    setError(null);
    setSelection(null);
    const reponse = await callApi("/documents/search", { mot_cle: motCle, dossier: currentPath || null });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
      setItems([]);
    } else {
      const bloc = reponse.blocks[0];
      setItems(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setSearchActive(true);
    setIsLoading(false);
  }

  async function openFile(item: ListItem, kind: "read" | "summarize") {
    setIsOpening(true);
    setError(null);
    const nomFichier = searchActive ? item.id : item.label;
    const dossier = searchActive ? null : currentPath || null;
    const reponse = await callApi(`/documents/${kind}`, { nom_fichier: nomFichier, dossier });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
    } else {
      const bloc = reponse.blocks[0];
      setSelection({ item, kind, body: bloc && bloc.kind === "text" ? bloc.body : "" });
    }
    setIsOpening(false);
  }

  function openFolder(item: ListItem) {
    loadFolder(searchActive ? item.id : joinPath(currentPath, item.label));
  }

  function downloadHref(item: ListItem) {
    const nomFichier = searchActive ? item.id : item.label;
    const dossier = searchActive ? null : currentPath || null;
    return buildDownloadUrl(nomFichier, dossier);
  }

  const segments = currentPath ? currentPath.split("/") : [];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 pb-40 pt-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Accueil
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
      </div>

      <nav className="flex flex-wrap items-center gap-1 text-sm text-foreground/70">
        <button onClick={() => loadFolder("")} className="hover:text-accent">
          🏠
        </button>
        {segments.map((segment, index) => (
          <span key={index} className="flex items-center gap-1">
            <span>/</span>
            <button
              onClick={() => loadFolder(segments.slice(0, index + 1).join("/"))}
              className="hover:text-accent"
            >
              {segment}
            </button>
          </span>
        ))}
      </nav>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Chercher dans ${currentPath || "tout le dossier"}…`}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        {searchActive ? (
          <button
            type="button"
            onClick={() => loadFolder(currentPath)}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Effacer
          </button>
        ) : (
          <button
            type="submit"
            disabled={!query.trim()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Chercher
          </button>
        )}
      </form>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {selection && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              {selection.kind === "summarize" ? "Résumé — " : ""}
              {selection.item.label}
            </h2>
            <button onClick={() => setSelection(null)} className="text-xs text-accent">
              Fermer
            </button>
          </div>
          <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/80">
            {selection.body}
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-foreground/60">Chargement…</p>
      ) : (
        !selection && (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                {item.meta?.type === "dossier" ? (
                  <button
                    onClick={() => openFolder(item)}
                    className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left"
                  >
                    <span>📁</span>
                    <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
                    <span className="text-foreground/40">›</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                    <span className="flex-1 truncate text-sm text-foreground">📄 {item.label}</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openFile(item, "read")}
                        disabled={isOpening}
                        className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                      >
                        Lire
                      </button>
                      <button
                        onClick={() => openFile(item, "summarize")}
                        disabled={isOpening}
                        className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                      >
                        Résumer
                      </button>
                      <a
                        href={downloadHref(item)}
                        className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                        title="Télécharger"
                      >
                        ⬇
                      </a>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-foreground/60">
                {searchActive ? "Aucun résultat." : "Dossier vide."}
              </p>
            )}
          </ul>
        )
      )}
    </div>
  );
}
