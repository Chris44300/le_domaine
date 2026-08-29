"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Spinner from "../components/Spinner";
import { buildDownloadUrl, buildPreviewUrl, callApi, downloadZip, firstErrorMessage, type ListItem } from "../lib/api";

type Selection =
  | {
      item: ListItem;
      kind: "read" | "summarize";
      body: string;
      warning?: string;
      page?: number;
      totalPages?: number;
      feuilles?: ListItem[];
    }
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

type SlowNotice = { token: number; label: string };
type CompletedNotice = { message: string; onView?: () => void };

const DELAI_AVANT_NOTICE_LENTE_MS = 10000;

function joinPath(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex-1 px-6 pb-40 pt-16 text-sm text-foreground/60">Chargement…</div>}>
      <DocumentsPageInner />
    </Suspense>
  );
}

function DocumentsPageInner() {
  const searchParams = useSearchParams();
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
  const [docQueryMode, setDocQueryMode] = useState<"motcle" | "question">("motcle");
  const [qaHistory, setQaHistory] = useState<QaEntry[]>([]);
  const [qaHistoryOuvert, setQaHistoryOuvert] = useState(true);
  const [qaInput, setQaInput] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [reader, setReader] = useState<ReaderView | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Map<string, ListItem>>(new Map());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderSelectLoading, setFolderSelectLoading] = useState<string | null>(null);
  const [gallerySelection, setGallerySelection] = useState<ListItem[] | null>(null);
  const [gridView, setGridView] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [pageSelectorOuvert, setPageSelectorOuvert] = useState(false);
  const [pageInput, setPageInput] = useState("");
  // Jeton de navigation : incrémenté à chaque écran ouvert et à chaque
  // retour arrière. Une requête en cours compare son jeton au jeton
  // courant avant d'appliquer son résultat - si l'utilisateur est parti
  // ailleurs entre-temps (bouton Retour, autre document...), le résultat
  // tardif est ignoré au lieu de forcer l'écran en arrière (retour de
  // Chris : "je devrais avoir le moyen d'annuler avec retour plutôt que
  // de forcer").
  const requestTokenRef = useRef(0);
  // Jetons pour lesquels l'utilisateur a explicitement demandé à être
  // prévenu ("M'avertir quand c'est terminé") après un chargement lent -
  // ceux-là, contrairement aux autres requêtes abandonnées, déclenchent
  // un avertissement discret à leur arrivée même si l'écran a changé.
  const notifiedTokensRef = useRef<Set<number>>(new Set());
  const [slowNotice, setSlowNotice] = useState<SlowNotice | null>(null);
  const [completedNotice, setCompletedNotice] = useState<CompletedNotice | null>(null);

  async function loadFolder(path: string) {
    requestTokenRef.current += 1;
    setIsLoading(true);
    setError(null);
    setSlowNotice(null);
    setSelection(null);
    setReader(null);
    setSelectMode(false);
    setSelectedFiles(new Map());
    setSelectedFolders(new Set());
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
    // Lien profond depuis la recherche du Domaine (SearchBar.tsx) -
    // "m'amener directement dans le bon niveau de l'application
    // document" plutot qu'un apercu limite dans le petit widget de
    // recherche. Cas de fetch-in-effect explicitement valide selon
    // https://react.dev/learn/you-might-not-need-an-effect
    const dossierParam = searchParams.get("dossier");
    const fichierParam = searchParams.get("fichier");
    const ligneParam = searchParams.get("ligne");

    if (fichierParam) {
      const derniereBarre = Math.max(fichierParam.lastIndexOf("/"), fichierParam.lastIndexOf("\\"));
      const dossierDuFichier = derniereBarre >= 0 ? fichierParam.slice(0, derniereBarre) : null;
      const nomFichier = derniereBarre >= 0 ? fichierParam.slice(derniereBarre + 1) : fichierParam;
      const itemCible: ListItem = {
        id: fichierParam,
        label: nomFichier,
        meta: { type: "fichier", dossier: dossierDuFichier },
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFolder(dossierDuFichier ?? "");
      if (ligneParam) {
        openReaderAt(itemCible, Number(ligneParam));
      } else {
        openFile(itemCible, "read");
      }
      return;
    }

    loadFolder(dossierParam ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(endpoint: "search" | "search-content") {
    const motCle = query.trim();
    if (!motCle) return;

    requestTokenRef.current += 1;
    setIsLoading(true);
    setError(null);
    setSlowNotice(null);
    setSelection(null);
    setReader(null);
    setSelectMode(false);
    setSelectedFiles(new Map());
    setSelectedFolders(new Set());
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
    // Les fichiers issus d'une sélection de dossier récursive (voir
    // toggleFolderSelected) portent leur propre dossier d'origine dans
    // meta - ils ne vivent pas forcément dans le dossier actuellement
    // affiché, donc currentPath/searchActive ne s'appliquent pas à eux.
    if (item.meta && "dossier" in item.meta) {
      return { nomFichier: item.label, dossier: (item.meta.dossier as string | null) ?? null };
    }
    return {
      nomFichier: searchActive ? item.id : item.label,
      dossier: searchActive ? null : currentPath || null,
    };
  }

  function folderPath(item: ListItem) {
    return searchActive ? item.id : joinPath(currentPath, item.label);
  }

  function openSelection(item: ListItem) {
    requestTokenRef.current += 1;
    setSlowNotice(null);
    setDocFilter("");
    setDocSearchResults(null);
    setQaHistory([]);
    setQaInput("");
    setReader(null);
    setGridView(false);
    if (item.meta?.image) {
      setSelection({ item, kind: "image" });
      return;
    }
    openFile(item, "read");
  }

  function toggleDocQueryMode(mode: "motcle" | "question") {
    setDocQueryMode(mode);
    setDocFilter("");
    setDocSearchResults(null);
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

  async function openFile(item: ListItem, kind: "read" | "summarize", page: number = 1) {
    const token = ++requestTokenRef.current;
    const key = `${item.id}-${kind}`;
    setLoadingKey(key);
    setError(null);
    setReader(null);
    // Un filtre/résultat de recherche-dans-le-document laissé par la vue
    // précédente ne doit jamais rester affiché par-dessus un nouveau
    // contenu (Lire -> Résumer, ou changement de fichier) - sinon le
    // nouveau contenu chargé reste invisible, masqué par la liste
    // d'occurrences périmée (bug trouvé par Chris : le résumé se
    // chargeait bien mais restait caché derrière une recherche "budget"
    // encore active).
    setDocFilter("");
    setDocSearchResults(null);
    if (!selection || selection.kind === "image" || selection.item.id !== item.id) {
      setQaHistory([]);
      setQaInput("");
      setPageSelectorOuvert(false);
      setPageInput("");
      setDocQueryMode("motcle");
    }

    // Le résumé passe par un LLM, et la lecture peut déclencher un OCR
    // sur un scan - les deux peuvent prendre plusieurs secondes, donc
    // proposer de prévenir plutôt que de bloquer sur l'attente (demande
    // de Chris, élargie après avoir remarqué qu'une lecture pouvait
    // aussi mouliner longtemps sans aucun avertissement).
    const minuteur: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (requestTokenRef.current === token) {
        setSlowNotice({
          token,
          label: kind === "summarize" ? `le résumé de ${item.label}` : `la lecture de ${item.label}`,
        });
      }
    }, DELAI_AVANT_NOTICE_LENTE_MS);

    const { nomFichier, dossier } = resolveFileTarget(item);
    const reponse = await callApi(
      kind === "read" ? "/documents/read-page" : "/documents/summarize",
      kind === "read" ? { nom_fichier: nomFichier, dossier, page } : { nom_fichier: nomFichier, dossier },
    );
    clearTimeout(minuteur);

    const message = firstErrorMessage(reponse);
    const bloc = reponse.blocks[0];
    const resultat: Selection = {
      item,
      kind,
      body: bloc && bloc.kind === "text" ? bloc.body : "",
      warning: bloc && bloc.kind === "text" ? bloc.warning : undefined,
      page: bloc && bloc.kind === "text" ? bloc.page : undefined,
      totalPages: bloc && bloc.kind === "text" ? bloc.total_pages : undefined,
      feuilles: bloc && bloc.kind === "text" ? bloc.feuilles : undefined,
    };

    if (requestTokenRef.current === token) {
      if (message) setError(message);
      else setSelection(resultat);
      setLoadingKey(null);
      setSlowNotice((precedent) => (precedent?.token === token ? null : precedent));
    } else if (notifiedTokensRef.current.has(token)) {
      // L'utilisateur a demandé à être prévenu et est parti voir autre
      // chose entre-temps - ne pas forcer son écran, juste le signaler.
      notifiedTokensRef.current.delete(token);
      const label = kind === "summarize" ? "Le résumé" : "La lecture";
      const pret = kind === "summarize" ? "prêt" : "prête";
      setCompletedNotice({
        message: message ? `${label} de "${item.label}" a échoué : ${message}` : `${label} de "${item.label}" est ${pret}.`,
        onView: message ? undefined : () => setSelection(resultat),
      });
    }
  }

  async function openReaderAt(item: ListItem, ligne: number, fenetreDebut?: number, fenetreFin?: number) {
    // Ne touche plus à `selection` en arrière-plan : ouvrir automatiquement
    // le début du document surprenait Chris en fermant la fenêtre
    // contextuelle ("ça m'affiche un autre texte, pas très intuitif").
    // Résumer/Télécharger sont accessibles directement depuis l'en-tête de
    // cette vue à la place - fermer révèle exactement ce qu'il y avait
    // avant, jamais un écran fabriqué.
    const token = ++requestTokenRef.current;
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
    if (requestTokenRef.current !== token) return;

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

    const token = ++requestTokenRef.current;
    const item = selection.item;
    setQaLoading(true);
    setQaInput("");

    let minuteur: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (requestTokenRef.current === token) {
        setSlowNotice({ token, label: `la réponse sur ${item.label}` });
      }
    }, DELAI_AVANT_NOTICE_LENTE_MS);

    const { nomFichier, dossier } = resolveFileTarget(item);
    const reponse = await callApi("/documents/question", { nom_fichier: nomFichier, dossier, question });
    if (minuteur) clearTimeout(minuteur);
    minuteur = null;

    const message = firstErrorMessage(reponse);
    const bloc = reponse.blocks[0];
    const reponseTexte = message ?? (bloc && bloc.kind === "text" ? bloc.body : "");

    if (requestTokenRef.current === token) {
      setQaHistory((history) => [...history, { question, answer: reponseTexte }]);
      setQaLoading(false);
      setSlowNotice((precedent) => (precedent?.token === token ? null : precedent));
    } else if (notifiedTokensRef.current.has(token)) {
      notifiedTokensRef.current.delete(token);
      setCompletedNotice({
        message: `Réponse prête pour "${item.label}" : ${question}`,
        onView: () => {
          setQaHistory((history) => [...history, { question, answer: reponseTexte }]);
        },
      });
    }
  }

  function goBack() {
    // Invalide toute requête en cours (résumé, lecture...) sans en
    // relancer une nouvelle - si elle arrive quand même plus tard, elle
    // sera ignorée (sauf si l'utilisateur a explicitement demandé à être
    // prévenu, voir slowNotice/completedNotice).
    requestTokenRef.current += 1;
    setLoadingKey(null);
    setReaderLoading(false);
    setSlowNotice(null);
    if (reader) {
      setReader(null);
      return;
    }
    setSelection(null);
    setGallerySelection(null);
    setGridView(false);
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

  function toggleSelected(item: ListItem) {
    setSelectedFiles((precedent) => {
      const suivant = new Map(precedent);
      if (suivant.has(item.id)) {
        suivant.delete(item.id);
      } else {
        suivant.set(item.id, item);
      }
      return suivant;
    });
  }

  function toggleSelectMode() {
    setSelectMode((actif) => !actif);
    setSelectedFiles(new Map());
    setSelectedFolders(new Set());
  }

  const itemsSelectionnes = Array.from(selectedFiles.values());
  const fichiersDuDossier = items.filter((item) => item.meta?.type !== "dossier");
  const tousSelectionnes = fichiersDuDossier.length > 0 && fichiersDuDossier.every((item) => selectedFiles.has(item.id));

  function toggleSelectAll() {
    setSelectedFiles((precedent) => {
      const suivant = new Map(precedent);
      if (tousSelectionnes) {
        fichiersDuDossier.forEach((item) => suivant.delete(item.id));
      } else {
        fichiersDuDossier.forEach((item) => suivant.set(item.id, item));
      }
      return suivant;
    });
  }

  async function toggleFolderSelected(item: ListItem) {
    const dossier = folderPath(item);
    if (selectedFolders.has(dossier)) {
      setSelectedFolders((precedent) => {
        const suivant = new Set(precedent);
        suivant.delete(dossier);
        return suivant;
      });
      setSelectedFiles((precedent) => {
        const suivant = new Map(precedent);
        for (const [cle, fichier] of suivant) {
          const dossierFichier = typeof fichier.meta?.dossier === "string" ? fichier.meta.dossier : null;
          if (dossierFichier === dossier || dossierFichier?.startsWith(`${dossier}/`)) {
            suivant.delete(cle);
          }
        }
        return suivant;
      });
      return;
    }

    // Parcourt le dossier et ses sous-dossiers (POST /documents/list
    // répété) pour récupérer tous les fichiers - demande explicite de
    // Chris ("sélectionner tout un dossier"), pas de route de listing
    // récursif côté API pour l'instant, donc orchestré ici.
    setFolderSelectLoading(dossier);
    setError(null);
    const fichiers: ListItem[] = [];
    const aExplorer = [dossier];
    while (aExplorer.length > 0) {
      const dossierCourant = aExplorer.pop()!;
      const reponse = await callApi("/documents/list", { dossier: dossierCourant });
      const message = firstErrorMessage(reponse);
      if (message) continue;
      const bloc = reponse.blocks[0];
      const elements = bloc && bloc.kind === "list" ? bloc.items : [];
      for (const element of elements) {
        if (element.meta?.type === "dossier") {
          aExplorer.push(joinPath(dossierCourant, element.label));
        } else {
          fichiers.push({
            id: `${dossierCourant}::${element.label}`,
            label: element.label,
            meta: { type: "fichier", image: Boolean(element.meta?.image), dossier: dossierCourant },
          });
        }
      }
    }
    setSelectedFolders((precedent) => new Set(precedent).add(dossier));
    setSelectedFiles((precedent) => {
      const suivant = new Map(precedent);
      fichiers.forEach((fichier) => suivant.set(fichier.id, fichier));
      return suivant;
    });
    setFolderSelectLoading(null);
  }

  function openGallery() {
    const imagesSelectionnees = itemsSelectionnes.filter((item) => item.meta?.image);
    if (imagesSelectionnees.length === 0) return;
    requestTokenRef.current += 1;
    setSlowNotice(null);
    setGallerySelection(imagesSelectionnees);
    // Par defaut en grille pour une selection multiple - voir une a une
    // reste possible en cliquant une vignette (retour de Chris : "Voir"
    // affichait toujours la premiere au lieu d'une vue multiple).
    setGridView(imagesSelectionnees.length > 1);
    setSelection({ item: imagesSelectionnees[0], kind: "image" });
  }

  async function downloadSelection() {
    // Un seul fichier .zip (une seule requete, un seul telechargement)
    // plutot qu'un clic par fichier : Chrome bloque silencieusement les
    // telechargements automatiques successifs sans permission explicite,
    // ce qui empechait la selection multiple de fonctionner (retour de
    // Chris). /documents/zip cote Nigel construit l'archive en memoire.
    setDownloadingZip(true);
    const erreur = await downloadZip(itemsSelectionnes.map((item) => resolveFileTarget(item)));
    if (erreur) setError(erreur);
    setDownloadingZip(false);
  }

  const segments = currentPath ? currentPath.split("/") : [];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 pb-40 pt-16">
      {/* Rangée 1 : titre de la pièce + retour discret vers le Domaine
          general (a droite). Rangée 2 : navigation A L'INTERIEUR de
          Documents (accueil du dossier a gauche, retour arrière contextuel
          a droite) - deux notions bien distinctes que Chris confondait
          quand elles étaient mélangées sur une seule ligne. */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
        <Link href="/" className="flex shrink-0 items-center gap-1 text-xs text-foreground/60 hover:text-accent">
          🏰 Retour au Domaine
        </Link>
      </div>

      <nav className="flex items-center justify-between gap-1 text-sm text-foreground/70">
        <div className="flex flex-wrap items-center gap-1">
          <button onClick={() => loadFolder("")} className="flex items-center gap-1 hover:text-accent">
            🏠 Accueil
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
        </div>
        {(reader || selection) && (
          <button onClick={goBack} className="flex shrink-0 items-center gap-1 text-accent hover:text-accent">
            ↩ Retour
          </button>
        )}
      </nav>

      {/* Cachée quand un fichier/la lecture contextuelle est ouvert -
          affichée en même temps que la recherche "dans ce document" ci-
          dessous, les deux barres cote a cote perturbaient (retour de
          Chris). Une seule recherche visible a la fois, adaptee au
          niveau ou l'on se trouve. */}
      {!reader && !selection && (
        <>
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
        </>
      )}

      {!isLoading && !selection && !reader && items.length > 0 && (
        <div className="flex items-center gap-3 self-start text-xs">
          <button onClick={toggleSelectMode} className="text-accent underline">
            {selectMode ? "Annuler la sélection" : "Sélectionner"}
          </button>
          {selectMode && (
            <button onClick={toggleSelectAll} className="text-accent underline">
              {tousSelectionnes ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          )}
        </div>
      )}

      {selectMode && selectedFiles.size > 0 && (
        // Fixe en bas de l'ecran plutot qu'inline dans le flux : inserer
        // ce bandeau au-dessus de la liste faisait descendre toutes les
        // lignes d'un cran a chaque coche, perturbant pour cocher
        // plusieurs elements a la suite (retour de Chris).
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-accent bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{selectedFiles.size} sélectionné(s)</span>
            <div className="flex gap-2">
              {itemsSelectionnes.some((item) => item.meta?.image) && (
                <button onClick={openGallery} className="rounded-full border border-border px-3 py-1 text-xs text-foreground">
                  Voir
                </button>
              )}
              <button
                onClick={downloadSelection}
                disabled={downloadingZip}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground disabled:opacity-50"
              >
                {downloadingZip && <Spinner />}⬇ Télécharger
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {slowNotice && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span>⏳ Réseau lent, {slowNotice.label} met du temps à charger…</span>
          <button
            onClick={() => {
              notifiedTokensRef.current.add(slowNotice.token);
              setSlowNotice(null);
            }}
            className="shrink-0 underline"
          >
            M&apos;avertir quand c&apos;est terminé
          </button>
        </div>
      )}

      {completedNotice && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-accent bg-surface px-4 py-2 text-sm">
          <span className="text-foreground">{completedNotice.message}</span>
          <div className="flex shrink-0 gap-2">
            {completedNotice.onView && (
              <button
                onClick={() => {
                  completedNotice.onView?.();
                  setCompletedNotice(null);
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
              >
                Regarder
              </button>
            )}
            <button
              onClick={() => setCompletedNotice(null)}
              className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      {reader && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-sm font-medium text-foreground">{reader.item.label}</h2>
            <div className="flex shrink-0 items-center gap-3 text-xs text-accent">
              <button
                onClick={() => openFile(reader.item, "read")}
                disabled={loadingKey === `${reader.item.id}-read`}
                className="flex items-center gap-1 disabled:opacity-50"
              >
                {loadingKey === `${reader.item.id}-read` && <Spinner />}
                Lire
              </button>
              <button
                onClick={() => openFile(reader.item, "summarize")}
                disabled={loadingKey === `${reader.item.id}-summarize`}
                className="flex items-center gap-1 disabled:opacity-50"
              >
                {loadingKey === `${reader.item.id}-summarize` && <Spinner />}
                Résumer
              </button>
              <a href={downloadHref(reader.item)} title="Télécharger">
                ⬇
              </a>
            </div>
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
            <div className="flex shrink-0 items-center gap-3">
              {selection.kind !== "image" && (
                <>
                  <button
                    onClick={() => openFile(selection.item, selection.kind === "summarize" ? "read" : "summarize")}
                    disabled={
                      loadingKey === `${selection.item.id}-${selection.kind === "summarize" ? "read" : "summarize"}`
                    }
                    className="flex items-center gap-1 text-xs text-accent disabled:opacity-50"
                  >
                    {loadingKey === `${selection.item.id}-${selection.kind === "summarize" ? "read" : "summarize"}` && (
                      <Spinner />
                    )}
                    {selection.kind === "summarize" ? "Lire" : "Résumer"}
                  </button>
                  <a href={downloadHref(selection.item)} className="text-xs text-accent" title="Télécharger">
                    ⬇
                  </a>
                </>
              )}
            </div>
          </div>

          {selection.kind === "image" ? (
            <>
              {images.length > 1 && (
                <button
                  onClick={() => setGridView((actif) => !actif)}
                  className="self-start rounded-full border border-border px-3 py-1 text-xs text-foreground"
                >
                  {gridView ? "🖼️ Vue simple" : "🔲 Voir toutes les photos"}
                </button>
              )}
              {gridView ? (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image) => {
                    const { nomFichier, dossier } = resolveFileTarget(image);
                    return (
                      <button
                        key={image.id}
                        onClick={() => {
                          setSelection({ item: image, kind: "image" });
                          setGridView(false);
                        }}
                        className="aspect-square overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buildPreviewUrl(nomFichier, dossier)}
                          alt={image.label}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
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
              )}
            </>
          ) : (
            <>
              {selection.warning && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {selection.warning}
                </p>
              )}

              {/* Une seule barre pour les deux besoins (mot-clé déterministe
                  vs question groundée par LLM) - avoir les deux formes
                  affichées en permanence perturbait (retour de Chris). */}
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => toggleDocQueryMode("motcle")}
                  className={docQueryMode === "motcle" ? "font-medium text-accent underline" : "text-foreground/60"}
                >
                  🔍 Mot-clé
                </button>
                <button
                  onClick={() => toggleDocQueryMode("question")}
                  className={docQueryMode === "question" ? "font-medium text-accent underline" : "text-foreground/60"}
                >
                  💬 Question
                </button>
              </div>

              <form onSubmit={docQueryMode === "motcle" ? searchInDocument : askQuestion} className="flex gap-2">
                <input
                  type="text"
                  value={docQueryMode === "motcle" ? docFilter : qaInput}
                  onChange={(event) =>
                    docQueryMode === "motcle" ? setDocFilter(event.target.value) : setQaInput(event.target.value)
                  }
                  placeholder={
                    docQueryMode === "motcle"
                      ? "Chercher un mot-clé dans ce document…"
                      : "Poser une question sur ce document…"
                  }
                  className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                {docQueryMode === "motcle" && docSearchResults ? (
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
                    disabled={docQueryMode === "motcle" ? docSearchLoading || !docFilter.trim() : qaLoading || !qaInput.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {(docQueryMode === "motcle" ? docSearchLoading : qaLoading) && <Spinner />}
                    {docQueryMode === "motcle" ? "Chercher" : "Demander"}
                  </button>
                )}
              </form>

              {/* Juste sous la barre, pas tout en bas apres le document
                  entier - retour de Chris : la reponse arrivait apres tout
                  le contenu, trop loin de la question posee. */}
              {qaHistory.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface/50 p-3">
                  <button
                    type="button"
                    onClick={() => setQaHistoryOuvert((ouvert) => !ouvert)}
                    className="flex items-center justify-between text-sm font-medium text-foreground/80 hover:text-accent"
                  >
                    <span>
                      {qaHistory.length} question{qaHistory.length > 1 ? "s" : ""}
                    </span>
                    <span>{qaHistoryOuvert ? "▲ Réduire" : "▼ Afficher"}</span>
                  </button>
                  {qaHistoryOuvert &&
                    qaHistory.map((entry, index) => (
                      <div key={index} className="flex flex-col gap-1 text-sm">
                        <p className="font-medium text-foreground">
                          Q{index + 1}. {entry.question}
                        </p>
                        <p className="text-foreground/80">{entry.answer}</p>
                      </div>
                    ))}
                </div>
              )}

              {docQueryMode === "motcle" && docSearchResults ? (
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
                <div className="flex flex-col gap-2">
                  {selection.kind === "read" && selection.feuilles && selection.feuilles.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {selection.feuilles.map((feuille) => (
                        <button
                          key={feuille.id}
                          onClick={() => openFile(selection.item, "read", feuille.meta!.page as number)}
                          disabled={loadingKey !== null}
                          className={`rounded-full border px-3 py-1 text-xs disabled:opacity-50 ${
                            feuille.meta!.page === selection.page
                              ? "border-accent text-accent"
                              : "border-border text-foreground hover:border-accent"
                          }`}
                        >
                          📄 {feuille.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-foreground/80">
                    {selection.body}
                  </p>
                  {selection.kind === "read" && selection.totalPages && selection.totalPages > 1 && (
                    <div className="flex flex-col gap-2 border-t border-border pt-2">
                      <div className="flex items-center justify-between text-xs text-foreground/70">
                        <button
                          onClick={() => openFile(selection.item, "read", (selection.page ?? 1) - 1)}
                          disabled={loadingKey !== null || (selection.page ?? 1) <= 1}
                          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
                        >
                          {loadingKey !== null && <Spinner />}← Page précédente
                        </button>
                        <button
                          onClick={() => setPageSelectorOuvert((ouvert) => !ouvert)}
                          className="underline hover:text-accent"
                        >
                          Page {selection.page} / {selection.totalPages}
                        </button>
                        <button
                          onClick={() => openFile(selection.item, "read", (selection.page ?? 1) + 1)}
                          disabled={loadingKey !== null || (selection.page ?? 1) >= (selection.totalPages ?? 1)}
                          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-foreground disabled:opacity-40"
                        >
                          Page suivante →{loadingKey !== null && <Spinner />}
                        </button>
                      </div>
                      {pageSelectorOuvert && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const page = Number(pageInput);
                            if (page >= 1 && page <= (selection.totalPages ?? 1)) {
                              openFile(selection.item, "read", page);
                              setPageSelectorOuvert(false);
                              setPageInput("");
                            }
                          }}
                          className="flex gap-2"
                        >
                          <input
                            type="number"
                            min={1}
                            max={selection.totalPages}
                            value={pageInput}
                            onChange={(event) => setPageInput(event.target.value)}
                            placeholder={`Aller à la page (1–${selection.totalPages})`}
                            className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
                          >
                            Aller
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  selectMode ? (
                    <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFolders.has(folderPath(item))}
                        onChange={() => toggleFolderSelected(item)}
                        disabled={folderSelectLoading !== null}
                        className="shrink-0"
                      />
                      <button onClick={() => openFolder(item)} className="flex flex-1 items-center gap-2 text-left">
                        <span>📁</span>
                        <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
                        {folderSelectLoading === folderPath(item) && <Spinner />}
                        <span className="text-foreground/40">›</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openFolder(item)}
                      className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left"
                    >
                      <span>📁</span>
                      <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
                      <span className="text-foreground/40">›</span>
                    </button>
                  )
                ) : (
                  <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex flex-1 items-center gap-2 truncate text-sm text-foreground">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(item.id)}
                            onChange={() => toggleSelected(item)}
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
                              disabled={loadingKey === `${item.id}-read`}
                              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground disabled:opacity-50"
                            >
                              {loadingKey === `${item.id}-read` && <Spinner />}
                              Lire
                            </button>
                            <button
                              onClick={() => openFile(item, "summarize")}
                              disabled={loadingKey === `${item.id}-summarize`}
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
