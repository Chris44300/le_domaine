"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Spinner from "./Spinner";
import { callApi, firstErrorMessage, type Block, type ListItem } from "../lib/api";

function isTaskItem(item: ListItem) {
  return item.done !== undefined;
}

function premierExtrait(item: ListItem): { texte: string; ligne: number | null } | undefined {
  const extraits = item.meta?.extraits;
  return Array.isArray(extraits) ? (extraits[0] as { texte: string; ligne: number | null }) : undefined;
}

export default function SearchBar() {
  const router = useRouter();
  const [mode, setMode] = useState<"motcle" | "texte">("motcle");
  const [message, setMessage] = useState("");
  const [block, setBlock] = useState<Block | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Une recherche lancee pendant qu'une precedente est encore en vol ne
  // doit jamais se faire ecraser par la reponse tardive de celle-ci -
  // bug trouve par Chris ("je tape budget je retombe sur le texte
  // d'anissa"), meme mecanisme que documents/page.tsx.
  const requestTokenRef = useRef(0);

  function changerMode(nouveauMode: "motcle" | "texte") {
    setMode(nouveauMode);
    setBlock(null);
    setIsError(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texte = message.trim();
    if (!texte || isLoading) return;

    const token = ++requestTokenRef.current;
    setIsLoading(true);
    setBlock(null);
    setIsError(false);
    setMessage("");

    // Mode "Mot-clé" : appelle directement /documents/search, sans passer
    // par le routeur LLM - une recherche par mot-clé doit toujours
    // chercher, jamais deviner s'il faut chercher ou discuter. Corrige le
    // "gros bug" remonté par Chris via les logs : "AON" ou "Seenovate"
    // (des noms de fichiers réels) atterrissaient en mode conversation
    // libre côté LLM ("AON est une société de courtage d'assurances...")
    // au lieu de chercher dans les documents - le LLM ne pouvait pas
    // deviner qu'un mot correspondait à un fichier local sans que
    // l'utilisateur le lui dise explicitement. Même principe que le
    // choix "🔍 Mot-clé" / "💬 Question" déjà validé dans la salle
    // Documents (documents/page.tsx).
    if (mode === "motcle") {
      const reponse = await callApi("/documents/search", { mot_cle: texte, dossier: null });
      if (requestTokenRef.current !== token) return;
      const erreur = firstErrorMessage(reponse);
      setIsError(erreur !== null);
      setBlock(erreur ? { kind: "text", body: erreur } : reponse.blocks[0] ?? { kind: "list", items: [] });
      setIsLoading(false);
      return;
    }

    // Sans session_id explicite, /ask retombe sur "api-session" (défaut
    // côté API), une session UNIQUE partagée par toutes les recherches de
    // tous les visiteurs, jamais réinitialisée - bug trouvé par Chris ("ça
    // me renvoie toujours vers anissa") : le dossier/fichier résolu par une
    // recherche restait mémorisé et polluait les recherches suivantes,
    // sans rapport. Une barre de recherche doit être sans mémoire d'une
    // requête à l'autre - une session jetable par recherche règle ça.
    const sessionId = crypto.randomUUID();
    const reponse = await callApi("/ask", { message: texte, session_id: sessionId });
    if (requestTokenRef.current !== token) return;

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

  function ouvrirDansDocuments(item: ListItem) {
    // Emmene directement au bon endroit dans la salle Documents plutot
    // que d'ouvrir un apercu limite dans ce petit widget - demande de
    // Chris ("m'amener directement dans le bon niveau de l'application
    // document").
    //
    // item.id n'inclut pas toujours le chemin du dossier parent : les
    // resultats d'une RECHERCHE (rechercher_fichier/rechercher_contenu)
    // portent deja le chemin complet dans id, mais ceux d'un LISTING de
    // dossier (lister_fichiers - ex. "anissa" resolu en dossier) ne
    // portent que le nom nu, le dossier n'etant connu que via meta.dossier
    // (meme convention que documents/page.tsx::resolveFileTarget). Sans
    // ca, le lien profond atterrissait a la racine au lieu du bon dossier
    // - bug trouve par Chris ("le retour me remet a l'accueil, pas dans
    // Aide Anissa").
    const dossierMeta = typeof item.meta?.dossier === "string" ? item.meta.dossier : null;
    const cheminComplet = dossierMeta ? `${dossierMeta}\\${item.id}` : item.id;

    const params = new URLSearchParams();
    if (item.meta?.type === "dossier") {
      params.set("dossier", cheminComplet);
    } else {
      params.set("fichier", cheminComplet);
      // Sans ce signal, le lien profond tentait toujours une lecture
      // texte - une image renvoyait alors "Format non pris en charge",
      // avant qu'un repli affiche quand même l'aperçu image en dessous
      // (bug remonté par Chris : le message d'erreur clignotait avant
      // que l'image s'affiche).
      if (item.meta?.image) params.set("image", "1");
      const extrait = premierExtrait(item);
      if (extrait?.ligne) params.set("ligne", String(extrait.ligne));
    }
    router.push(`/documents?${params.toString()}`);
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
                    onClick={() => ouvrirDansDocuments(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
                  >
                    <span className="shrink-0">{item.meta?.type === "dossier" ? "📁" : "📄"}</span>
                    <span className="flex-1 truncate text-sm">
                      <span className="block truncate text-foreground">{item.label}</span>
                      {premierExtrait(item) && (
                        <span className="block truncate text-xs text-foreground/50">
                          {premierExtrait(item)?.ligne ? `L${premierExtrait(item)?.ligne} : ` : ""}
                          {premierExtrait(item)?.texte}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-accent">Voir dans Documents ›</span>
                  </button>
                </li>
              ),
            )}
            {block.items.length === 0 && (
              <p className="text-sm text-foreground/60">Aucun résultat.</p>
            )}
          </ul>
        )}

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => changerMode("motcle")}
            className={`rounded-full px-3 py-1 ${mode === "motcle" ? "bg-accent text-white" : "bg-surface text-foreground/60"}`}
          >
            🔍 Mot-clé
          </button>
          <button
            type="button"
            onClick={() => changerMode("texte")}
            className={`rounded-full px-3 py-1 ${mode === "texte" ? "bg-accent text-white" : "bg-surface text-foreground/60"}`}
          >
            💬 Texte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={mode === "motcle" ? "Chercher un mot-clé…" : "Pose une question au Domaine…"}
            className="flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {isLoading && <Spinner />}
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
