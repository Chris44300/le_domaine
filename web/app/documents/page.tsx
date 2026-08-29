"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner";
import { buildDownloadUrl, buildPreviewUrl, callApi, firstErrorMessage, type ListItem } from "../lib/api";

type Selection =
  | { item: ListItem; kind: "read" | "summarize"; body: string; warning?: string }
  | { item: ListItem; kind: "image" };

type QaEntry = { question: string; answer: string; warning?: string };

type Extrait = { texte: string; ligne: number | null };

type ReaderView = {
  item: ListItem;
  ligne: number;
  body: string;
  fenetreDebut: number;
  fenetreFin: number;
  totalLignes: number;
  warning?: string;
};

function joinPath(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

export default function DocumentsPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [contentSearchActive, setContentSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState("");
  const [docSearchResults, setDocSearchResults] = useState<ListItem[] | null>(null);
  const [docSearchLoading, setDocSearchLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<QaEntry[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [reader, setReader] = useState<ReaderView | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [gallerySelection, setGallerySelection] = useState<ListItem[] | null>(null);

  async function loadFolder(path: string) {
    setIsLoading(true);
    setError(null);
    setSelection(null);
    setReader(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setGallerySelection(null);
    setSearchActive(false);
    setContentSearchActive(false);
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

  async function runSearch(endpoint: "search" | "search-content") {
    const motCle = query.trim();
    if (!motCle) return;

    setIsLoading(true);
    setError(null);
    setSelection(null);
    setReader(null);
    setSelectMode(false);
    setSelectedIds(new Set());
    setGallerySelection(null);
    const reponse = await callApi(`/documents/${endpoint}`, { mot_cle: motCle, dossier: currentPath || null });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
      setItems([]);
    } else {
      const bloc = reponse.blocks[0];
      setItems(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setSearchActive(true);
    setContentSearchActive(endpoint === "search-content");
    setIsLoading(false);
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch("search");
  }

  function resolveFileTarget(item: ListItem) {
    return {
      nomFichier: searchActive ? item.id : item.label,
      dossier: searchActive ? null : currentPath || null,
    };
  }

  function openSelection(item: ListItem) {
    setDocFilter("");
    setDocSearchResults(null);
    setQaHistory([]);
    setQaInput("");
    setReader(null);
    if (item.meta?.image) {
      setSelection({ item, kind: "image" });
      return;
    }
    openFile(item, "read");
  }

  async function searchInDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || selection.kind === "image") return;
    const motCle = docFilter.trim();
    if (!motCle) {
      setDocSearchResults(null);
      return;
    }

    setDocSearchLoading(true);
    const { nomFichier, dossier } = resolveFileTarget(selection.item);
    const reponse = await callApi("/documents/search-in-file", { nom_fichier: nomFichier, dossier, mot_cle: motCle });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
      setDocSearchResults([]);
    } else {
      const bloc = reponse.blocks[0];
      setDocSearchResults(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setDocSearchLoading(false);
  }

  async function openFile(item: ListItem, kind: "read" | "summarize") {
    const key = `${item.id}-${kind}`;
    setLoadingKey(key);
    setError(null);
    const { nomFichier, dossier } = resolveFileTarget(item);
    const reponse = await callApi(`/documents/${kind}`, { nom_fichier: nomFichier, dossier });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
    } else {
      const bloc = reponse.blocks[0];
      setSelection({
        item,
        kind,
        body: bloc && bloc.kind === "text" ? bloc.body : "",
        warning: bloc && bloc.kind === "text" ? bloc.warning : undefined,
      });
    }
    setLoadingKey(null);
  }

  async function openReaderAt(item: ListItem, ligne: number, fenetreDebut?: number, fenetreFin?: number) {
    setReaderLoading(true);
    setError(null);
    const { nomFichier, dossier } = resolveFileTarget(item);
    const reponse = await callApi("/documents/read-around", {
      nom_fichier: nomFichier,
      dossier,
      ligne,
      fenetre_debut: fenetreDebut ?? null,
      fenetre_fin: fenetreFin ?? null,
    });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
    } else {
      const bloc = reponse.blocks[0];
      if (bloc && bloc.kind === "text") {
        setReader({
          item,
          ligne,
          body: bloc.body,
          fenetreDebut: bloc.fenetre_debut ?? ligne,
          fenetreFin: bloc.fenetre_fin ?? ligne,
          totalLignes: bloc.total_lignes ?? 0,
          warning: bloc.warning,
        });
      }
    }
    setReaderLoading(false);
  }

  function readerFenetre(direction: 1 | -1) {
    if (!reader) return;
    const taille = reader.fenetreFin - reader.fenetreDebut + 1;
    if (direction === 1) {
      const debut = reader.fenetreFin + 1;
      if (reader.totalLignes && debut > reader.totalLignes) return;
      openReaderAt(reader.item, reader.ligne, debut, debut + taille - 1);
    } else {
      const fin = reader.fenetreDebut - 1;
      if (fin < 1) return;
      openReaderAt(reader.item, reader.ligne, Math.max(1, fin - taille + 1), fin);
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || selection.kind === "image") return;
    const question = qaInput.trim();
    if (!question) return;

    setQaLoading(true);
    setQaInput("");
    const { nomFichier, dossier } = resolveFileTarget(selection.item);
    const reponse = await callApi("/documents/question", { nom_fichier: nomFichier, dossier, question });
    const message = firstErrorMessage(reponse);
    const bloc = reponse.blocks[0];
    setQaHistory((history) => [
      ...history,
      { question, answer: message ?? (bloc && bloc.kind === "text" ? bloc.body : "") },
    ]);
    setQaLoading(false);
  }

  function openFolder(item: ListItem) {
    loadFolder(searchActive ? item.id : joinPath(currentPath, item.label));
  }

  function downloadHref(item: ListItem) {
    const { nomFichier, dossier } = resolveFileTarget(item);
    return buildDownloadUrl(nomFichier, dossier);
  }

  const images = (gallerySelection ?? items).filter((item) => item.meta?.image);
  const imageIndex = selection?.kind === "image" ? images.findIndex((image) => image.id === selection.item.id) : -1;

  function showImage(delta: number) {
    if (imageIndex < 0) return;
    const cible = imageIndex + delta;
    if (cible < 0 || cible >= images.length) return;
    setSelection({ item: images[cible], kind: "image" });
  }

  function toggleSelected(id: string) {
    setSelectedIds((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(id)) {
        suivant.delete(id);
      } else {
        suivant.add(id);
      }
      return suivant;
    });
  }

  function toggleSelectMode() {
    setSelectMode((actif) => !actif);
    setSelectedIds(new Set());
  }

  const itemsSelectionnes = items.filter((item) => selectedIds.has(item.id));

  function openGallery() {
    const imagesSelectionnees = itemsSelectionnes.filter((item) => item.meta?.image);
    if (imagesSelectionnees.length === 0) return;
    setGallerySelection(imagesSelectionnees);
    setSelection({ item: imagesSelectionnees[0], kind: "image" });
  }

  async function downloadSelection() {
    // Pas encore de zip cote serveur (a faire plus tard, en reprenant la
    // logique de decoupage par taille deja presente cote Telegram) - en
    // attendant, on declenche un telechargement par fichier. Le navigateur
    // demandera une confirmation au-dela de quelques fichiers, c'est un
    // comportement natif normal, pas un bug.
    for (const item of itemsSelectionnes) {
      const lien = document.createElement("a");
      lien.href = downloadHref(item);
      lien.download = item.label;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
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

      {searchActive && !isLoading && (
        <button
          onClick={() => runSearch(contentSearchActive ? "search" : "search-content")}
          className="self-start text-xs text-accent underline"
        >
          {contentSearchActive
            ? "← Revenir à la recherche par nom"
            : "🔍 Rechercher aussi dans le contenu des documents"}
        </button>
      )}

      {!isLoading && !selection && !reader && items.some((item) => item.meta?.type !== "dossier") && (
        <button onClick={toggleSelectMode} className="self-start text-xs text-accent underline">
          {selectMode ? "Annuler la sélection" : "☑️ Sélectionner plusieurs documents"}
        </button>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-accent bg-surface px-4 py-2 text-sm">
          <span className="text-foreground">{selectedIds.size} sélectionné(s)</span>
          <div className="flex gap-2">
            {itemsSelectionnes.some((item) => item.meta?.image) && (
              <button onClick={openGallery} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
                Voir
              </button>
            )}
            <button onClick={downloadSelection} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
              ⬇ Télécharger
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {reader && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">{reader.item.label}</h2>
            <button onClick={() => setReader(null)} className="text-xs text-accent">
              Fermer
            </button>
          </div>

          {reader.warning && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {reader.warning}
            </p>
          )}

          <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/80">
            {reader.body}
          </p>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-foreground/70">
            <button
              onClick={() => readerFenetre(-1)}
              disabled={readerLoading || reader.fenetreDebut <= 1}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
            >
              {readerLoading && <Spinner />}← Contexte précédent
            </button>
            <span>
              Lignes {reader.fenetreDebut}–{reader.fenetreFin}
              {reader.totalLignes ? ` / ${reader.totalLignes}` : ""}
            </span>
            <button
              onClick={() => readerFenetre(1)}
              disabled={readerLoading || (reader.totalLignes > 0 && reader.fenetreFin >= reader.totalLignes)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
            >
              Contexte suivant →{readerLoading && <Spinner />}
            </button>
          </div>
        </div>
      )}

      {!reader && selection && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              {selection.kind === "summarize" ? "Résumé — " : ""}
              {selection.item.label}
            </h2>
            <button
              onClick={() => {
                setSelection(null);
                setGallerySelection(null);
              }}
              className="text-xs text-accent"
            >
              Fermer
            </button>
          </div>

          {selection.kind === "image" ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(() => {
                  const { nomFichier, dossier } = resolveFileTarget(selection.item);
                  return buildPreviewUrl(nomFichier, dossier);
                })()}
                alt={selection.item.label}
                className="max-h-96 w-full rounded-lg object-contain"
              />
              {images.length > 1 && (
                <div className="flex items-center justify-between text-xs text-foreground/70">
                  <button
                    onClick={() => showImage(-1)}
                    disabled={imageIndex <= 0}
                    className="rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
                  >
                    ← Précédente
                  </button>
                  <span>
                    {imageIndex + 1} / {images.length}
                  </span>
                  <button
                    onClick={() => showImage(1)}
                    disabled={imageIndex >= images.length - 1}
                    className="rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
                  >
                    Suivante →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {selection.warning && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {selection.warning}
                </p>
              )}
              <form onSubmit={searchInDocument} className="flex gap-2">
                <input
                  type="text"
                  value={docFilter}
                  onChange={(event) => setDocFilter(event.target.value)}
                  placeholder="Chercher un mot-clé dans ce document…"
                  className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                {docSearchResults ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDocFilter("");
                      setDocSearchResults(null);
                    }}
                    className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
                  >
                    Effacer
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={docSearchLoading || !docFilter.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {docSearchLoading && <Spinner />}
                    Chercher
                  </button>
                )}
              </form>

              {docSearchResults ? (
                <ul className="max-h-96 overflow-y-auto text-sm text-foreground/80">
                  {docSearchResults.map((occurrence) => (
                    <li key={occurrence.id} className="border-b border-border/50 py-1.5 last:border-0">
                      {typeof occurrence.meta?.ligne === "number" ? (
                        <button
                          onClick={() => openReaderAt(selection.item, occurrence.meta!.ligne as number)}
                          className="text-left hover:text-accent"
                        >
                          {occurrence.label}
                        </button>
                      ) : (
                        occurrence.label
                      )}
                    </li>
                  ))}
                  {docSearchResults.length === 0 && (
                    <li className="py-1.5 text-foreground/60">Aucune occurrence trouvée.</li>
                  )}
                </ul>
              ) : (
                <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/80">
                  {selection.body}
                </p>
              )}

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {qaHistory.map((entry, index) => (
                  <div key={index} className="flex flex-col gap-1 text-sm">
                    <p className="font-medium text-foreground">Q. {entry.question}</p>
                    <p className="text-foreground/80">{entry.answer}</p>
                  </div>
                ))}
                <form onSubmit={askQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={qaInput}
                    onChange={(event) => setQaInput(event.target.value)}
                    placeholder="Poser une question sur ce document…"
                    className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={qaLoading || !qaInput.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {qaLoading && <Spinner />}
                    Demander
                  </button>
                </form>
              </div>
            </>
          )}
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
                  <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex flex-1 items-center gap-2 truncate text-sm text-foreground">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            className="shrink-0"
                          />
                        )}
                        <span className="truncate">
                          {item.meta?.image ? "🖼️" : "📄"} {item.label}
                        </span>
                      </span>
                      <div className="flex shrink-0 gap-2">
                        {item.meta?.image ? (
                          <button
                            onClick={() => openSelection(item)}
                            className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                          >
                            Aperçu
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openFile(item, "read")}
                              disabled={loadingKey !== null}
                              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground disabled:opacity-50"
                            >
                              {loadingKey === `${item.id}-read` && <Spinner />}
                              Lire
                            </button>
                            <button
                              onClick={() => openFile(item, "summarize")}
                              disabled={loadingKey !== null}
                              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground disabled:opacity-50"
                            >
                              {loadingKey === `${item.id}-summarize` && <Spinner />}
                              Résumer
                            </button>
                          </>
                        )}
                        <a
                          href={downloadHref(item)}
                          className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
                          title="Télécharger"
                        >
                          ⬇
                        </a>
                      </div>
                    </div>
                    {contentSearchActive &&
                      Array.isArray(item.meta?.extraits) &&
                      (item.meta.extraits as Extrait[]).length > 0 && (
                        <ul className="flex flex-col gap-0.5 pl-1 text-xs text-foreground/60">
                          {(item.meta.extraits as Extrait[]).slice(0, 2).map((extrait, index) => (
                            <li key={index} className="truncate">
                              {extrait.ligne !== null ? (
                                <button
                                  onClick={() => openReaderAt(item, extrait.ligne as number)}
                                  className="text-left underline decoration-dotted hover:text-accent"
                                >
                                  L{extrait.ligne} : {extrait.texte}
                                </button>
                              ) : (
                                extrait.texte
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
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
