"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";
import { callApi, firstErrorMessage, type Block, type ListItem } from "../lib/api";
import { createClient } from "@/lib/supabase/client";

function isTaskItem(item: ListItem) {
  return item.done !== undefined;
}

function premierExtrait(item: ListItem): { texte: string; ligne: number | null } | undefined {
  const extraits = item.meta?.extraits;
  return Array.isArray(extraits) ? (extraits[0] as { texte: string; ligne: number | null }) : undefined;
}

function toutesLesOccurrences(item: ListItem): { texte: string; ligne: number | null }[] {
  const extraits = item.meta?.extraits;
  return Array.isArray(extraits) ? (extraits as { texte: string; ligne: number | null }[]) : [];
}

// Lundi de la semaine calendaire contenant une date "YYYY-MM-DD" - meme
// convention que Ménage lui-même (web/lib/dates.ts::startOfIsoWeek), pour
// que le lien profond vers /menage/semaine tombe sur la bonne semaine (pas
// toujours la semaine EN COURS - bug trouvé en testant, ex. "Entretien
// aspirateur" dû la semaine prochaine renvoyait quand même vers celle-ci).
function lundiDeLaSemaine(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const jour = date.getUTCDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
  const decalage = jour === 0 ? -6 : 1 - jour;
  date.setUTCDate(date.getUTCDate() + decalage);
  return date.toISOString().slice(0, 10);
}

type TourTexte =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources?: ListItem[]; items?: ListItem[] };

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"motcle" | "texte">("motcle");
  const [message, setMessage] = useState("");
  const [block, setBlock] = useState<Block | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Recherche mot-clé en deux temps (titres d'abord, contenu seulement
  // sur demande) - retour de Chris : la fusion automatique des deux
  // noyait des mots courants comme "budget" (beaucoup de résultats dans
  // le contenu) alors qu'il pensait pouvoir approfondir seulement s'il
  // le souhaitait, comme dans la salle Documents.
  const [dernierMotCle, setDernierMotCle] = useState("");
  const [contenuDejaCherche, setContenuDejaCherche] = useState(false);
  const [contenuEnCours, setContenuEnCours] = useState(false);
  // Historique du mode "Texte" - demande de Chris après avoir constaté
  // que chaque question repartait de zéro ("donne moi l'accès" ne
  // voulait rien dire sans savoir qu'on venait de parler du dossier
  // anissa). Entièrement côté client : jamais stocké côté serveur (voir
  // /agent/ask), conservé tant que l'utilisateur ne clique pas sur
  // "Réinitialiser" - un rechargement de page l'efface aussi, ce qui
  // est le comportement attendu d'un état non persisté. sources/items
  // restent attachés à LEUR tour (pas un bloc flottant partagé) - sinon
  // l'accès aux documents "disparaissait" visuellement au tour suivant
  // (retour de Chris).
  const [historiqueTexte, setHistoriqueTexte] = useState<TourTexte[]>([]);
  // Replié par défaut dès qu'il y a de quoi lire - une conversation qui
  // grandit masquait les icônes du Domaine en dessous (retour de
  // Chris : "je perds la vision sur le domaine").
  const [chatReduit, setChatReduit] = useState(false);
  // Les documents associés à un tour ne s'affichent que sur demande
  // (bouton "Voir les documents associés") - retour de Chris : les
  // proposer par défaut à chaque tour prenait de la place pour rien.
  const [toursDocumentsOuverts, setToursDocumentsOuverts] = useState<Set<number>>(new Set());
  // Repliée en petit bouton flottant par défaut, partout - retour de
  // Chris : la barre pleine largeur, toujours affichée, se superposait à
  // la nav du bas de Ménage (et masquait le contenu ailleurs). Reste un
  // "ambassadeur toujours dispo" (persiste entre les pages, le composant
  // ne se démonte pas), juste replié tant qu'on n'a pas cliqué dessus.
  const [ouvert, setOuvert] = useState(false);
  // Groupes repliables (To do / Tâches récurrentes) ouverts par l'utilisateur
  // - clé composite "listeCle:nomDuGroupe" (voir ListeItems plus bas), levé
  // ici plutôt que dans ListeItems pour ne pas perdre l'état à chaque frappe.
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  // Chantier "Ménage réellement intégré", étape C2 (voir PLAN.md) : quels
  // outils le chat peut exposer au LLM pour LA PERSONNE CONNECTÉE (Mel ne
  // doit pas voir les Tâches perso de Chris via le chat, même si elle
  // devine le nom de l'outil). Tableau vide par défaut (accès restreint
  // aux utilitaires génériques seulement) tant que non chargé - jamais
  // `null` en état initial, qui côté serveur (api/agent.py) signifie
  // "accès complet" : on préfère un flash de SOUS-accès le temps du
  // premier chargement à un flash de SUR-accès.
  const [appsAutorisees, setAppsAutorisees] = useState<string[] | null>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || annule) return;
      const { data: membre } = await supabase
        .from("members")
        .select("apps_autorises")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!annule && membre) setAppsAutorisees(membre.apps_autorises);
    })();
    return () => {
      annule = true;
    };
  }, []);

  function toggleDocumentsAssocies(index: number) {
    setToursDocumentsOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(index)) suivant.delete(index);
      else suivant.add(index);
      return suivant;
    });
  }
  // Une recherche lancee pendant qu'une precedente est encore en vol ne
  // doit jamais se faire ecraser par la reponse tardive de celle-ci -
  // bug trouve par Chris ("je tape budget je retombe sur le texte
  // d'anissa"), meme mecanisme que documents/page.tsx.
  const requestTokenRef = useRef(0);

  function changerMode(nouveauMode: "motcle" | "texte") {
    // Une recherche Mot-clé en cours d'affichage bascule dans l'historique
    // Texte au lieu de simplement disparaître - demande de Chris : "on a
    // parfois envie de commencer par un mot-clé puis de poser une question
    // dans la continuité". Sans ça, la question suivante en mode Texte ne
    // savait rien de ce qui venait d'être cherché (le serveur ne connaît
    // que historiqueTexte, jamais dernierMotCle/block).
    if (nouveauMode === "texte" && mode === "motcle" && dernierMotCle && block?.kind === "list") {
      const resume =
        block.items.length > 0
          ? `${block.items.length} résultat(s) : ${block.items.map((i) => i.label).join(", ")}`
          : "Aucun résultat.";
      setHistoriqueTexte((h) => [
        ...h,
        { role: "user", content: `Recherche « ${dernierMotCle} »` },
        { role: "assistant", content: resume, items: block.items.length > 0 ? block.items : undefined },
      ]);
    }
    setMode(nouveauMode);
    setBlock(null);
    setIsError(false);
    setDernierMotCle("");
    setContenuDejaCherche(false);
  }

  function reinitialiserConversationTexte() {
    setHistoriqueTexte([]);
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

    // Mode "Mot-clé" : appelle directement /documents/search (+ recherche
    // dans le contenu, voir plus bas), sans passer par le routeur LLM -
    // une recherche par mot-clé doit toujours chercher, jamais deviner
    // s'il faut chercher ou discuter. Corrige le "gros bug" remonté par
    // Chris via les logs : "AON" ou "Seenovate" (des noms de fichiers
    // réels) atterrissaient en mode conversation libre côté LLM ("AON est
    // une société de courtage d'assurances...") au lieu de chercher dans
    // les documents - le LLM ne pouvait pas deviner qu'un mot correspondait
    // à un fichier local sans que l'utilisateur le lui dise explicitement.
    // Même principe que le choix "🔍 Mot-clé" / "💬 Question" déjà validé
    // dans la salle Documents (documents/page.tsx).
    if (mode === "motcle") {
      // Cherche d'abord par NOM seulement, jamais par le routeur LLM.
      // La recherche dans le CONTENU est un second temps, sur demande
      // explicite (bouton "Chercher aussi dans le contenu" plus bas) -
      // pas automatique : un mot courant comme "budget" ressort dans
      // beaucoup de documents, noyant les résultats si les deux se
      // mélangent d'office (retour de Chris). Même logique en deux temps
      // que la salle Documents.
      setDernierMotCle(texte);
      setContenuDejaCherche(false);

      // Documents ET Ménage cherchés en parallèle et fusionnés dans une
      // seule liste - demande de Chris (2026-08-31) : "gamelle" ou "ledger"
      // en Mot-clé ne remontait que les documents, jamais les tâches
      // ménagères. Une erreur Ménage seule (ex. pas configuré) n'empêche
      // pas d'afficher les résultats documents.
      const [reponseDocs, reponseMenage] = await Promise.all([
        callApi("/documents/search", { mot_cle: texte, dossier: null }),
        callApi("/menage/search", { mot_cle: texte }),
      ]);
      if (requestTokenRef.current !== token) return;

      const erreurDocs = firstErrorMessage(reponseDocs);
      const itemsDocs = !erreurDocs && reponseDocs.blocks[0]?.kind === "list" ? reponseDocs.blocks[0].items : [];
      const itemsMenage = reponseMenage.status === "ok" && reponseMenage.blocks[0]?.kind === "list" ? reponseMenage.blocks[0].items : [];

      if (erreurDocs && itemsMenage.length === 0) {
        setIsError(true);
        setBlock({ kind: "text", body: erreurDocs });
      } else {
        setIsError(false);
        setBlock({ kind: "list", items: [...itemsDocs, ...itemsMenage] });
      }
      setIsLoading(false);
      return;
    }

    // Mode "Texte" : passe par la boucle agentique (/agent/ask), pas par
    // /ask (routeur historique à décision unique, gardé pour
    // Telegram/terminal - voir Le Domaine/PLAN.md, "Architecture cible
    // pour le mode Texte"). Contrairement à /ask, /agent/ask ne mémorise
    // rien côté serveur (pas de session_id) - la suite de conversation
    // demandée par Chris est portée par historiqueTexte, ici, côté
    // client, et renvoyée explicitement à chaque appel. Chaque
    // utilisateur garde donc sa propre conversation, sans risque de
    // pollution entre deux visiteurs comme celle trouvée sur /ask.
    const historiqueEnvoye = historiqueTexte.map(({ role, content }) => ({ role, content }));
    setHistoriqueTexte((h) => [...h, { role: "user", content: texte }]);
    setChatReduit(false);

    const reponse = await callApi("/agent/ask", {
      message: texte,
      historique: historiqueEnvoye,
      apps_autorises: appsAutorisees,
    });
    if (requestTokenRef.current !== token) return;

    const erreur = firstErrorMessage(reponse);
    setIsError(erreur !== null);
    if (erreur) {
      setHistoriqueTexte((h) => [...h, { role: "assistant", content: erreur }]);
    } else {
      const texteReponse = reponse.blocks[0]?.kind === "text" ? reponse.blocks[0].body : "Pas de réponse.";
      // "sources" (fichiers lus pour répondre) et "list" (accès complet à
      // un dossier/une recherche) sont deux blocs distincts renvoyés par
      // /agent/ask (voir api/agent.py) - rattachés à CE tour précis de la
      // conversation, pas à un état flottant partagé qui "disparaissait"
      // au tour suivant (retour de Chris).
      const blocSources = reponse.blocks.find((b) => b.kind === "sources");
      const blocListe = reponse.blocks.find((b) => b.kind === "list");
      setHistoriqueTexte((h) => [
        ...h,
        {
          role: "assistant",
          content: texteReponse,
          sources: blocSources?.kind === "sources" ? blocSources.items : undefined,
          items: blocListe?.kind === "list" ? blocListe.items : undefined,
        },
      ]);
    }
    setIsLoading(false);
  }

  async function chercherAussiDansLeContenu() {
    if (!dernierMotCle || contenuEnCours) return;
    const token = ++requestTokenRef.current;
    setContenuEnCours(true);

    const reponse = await callApi("/documents/search-content", { mot_cle: dernierMotCle, dossier: null });
    if (requestTokenRef.current !== token) return;

    setContenuEnCours(false);
    setContenuDejaCherche(true);

    const erreur = firstErrorMessage(reponse);
    if (erreur) return; // le titre a déjà répondu ; une erreur ici n'efface pas ces résultats

    const blocContenu = reponse.blocks[0];
    // Un même fichier garde toutes ses occurrences groupées dans une
    // seule carte (meta.extraits) - affichées comme sous-lignes
    // cliquables, pas éclatées en cartes séparées répétant le même nom
    // de fichier (retour de Chris sur "BFR" : "ça pourrait être bien de
    // regrouper cela en une source avec deux occurrences").
    const itemsContenu = blocContenu?.kind === "list" ? blocContenu.items : [];

    setBlock((precedent) => {
      const itemsActuels = precedent?.kind === "list" ? precedent.items : [];
      return { kind: "list", items: [...itemsActuels, ...itemsContenu] };
    });
  }

  async function handleToggleTask(id: string) {
    await callApi("/tasks/toggle", { reference_id: id });
    const reponse = await callApi("/tasks/list", { inclure_faites: true });
    const bloc = reponse.blocks[0];
    if (bloc) setBlock(bloc);
  }

  function ouvrirDansDocuments(item: ListItem, ligneChoisie?: number | null) {
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
      // ligneChoisie : l'utilisateur a cliqué sur UNE occurrence précise
      // parmi plusieurs regroupées sous ce fichier - sinon, la première
      // (premierExtrait) comme avant.
      const ligne = ligneChoisie !== undefined ? ligneChoisie : premierExtrait(item)?.ligne;
      if (ligne) params.set("ligne", String(ligne));
      // Transmet le mot-clé cherché (mode Mot-clé uniquement, seul
      // endroit où il est connu au niveau du composant) - permet à la
      // salle Documents d'afficher précédent/suivant entre occurrences
      // dès l'ouverture, comme Telegram le fait déjà (demande de Chris).
      if (mode === "motcle" && ligne && dernierMotCle) params.set("q", dernierMotCle);
    }
    router.push(`/documents?${params.toString()}`);
  }

  function ouvrirDansMenage(item: ListItem) {
    // Pas de lien vers une carte precise (pas d'id stable cote UI Menage
    // aujourd'hui, voir api/menage.py) - amene au bon ECRAN : Semaine pour
    // une tache recurrente, Aujourd'hui (ou vivent les to-do) sinon.
    if (item.meta?.categorie !== "recurrente") {
      router.push("/menage");
      return;
    }
    // meta.date (l'echeance de CETTE tache) determine la semaine ciblee -
    // sans ca, on atterrissait toujours sur la semaine EN COURS, meme pour
    // une tache due plus tard (retour de Chris sur "Entretien aspirateur").
    const date = typeof item.meta?.date === "string" ? item.meta.date : null;
    const semaine = date ? lundiDeLaSemaine(date) : null;
    router.push(semaine ? `/menage/semaine?semaine=${semaine}` : "/menage/semaine");
  }

  // Regroupe les items par categorie (meta.categorie: "todo" | "recurrente"
  // pour Menage, undefined -> "Documents") - demande de Chris : des
  // boutons "To do" / "Tâches récurrentes" repliables plutôt qu'une liste
  // plate, quand une réponse mélange plusieurs catégories. Une seule
  // catégorie détectée -> liste plate comme avant, pas de repli inutile.
  // listeCle : identifiant unique de CETTE liste (le bloc principal, ou un
  // tour de conversation precis) - l'etat plie/deplie vit dans SearchBar
  // (voir groupesOuverts plus haut), pas ici : ListeItems est redefinie a
  // chaque rendu de SearchBar (comme CarteItem), donc un useState local
  // ici perdrait son etat a chaque frappe dans le champ de recherche.
  function ListeItems({ items, listeCle }: { items: ListItem[]; listeCle: string }) {
    const groupes = new Map<string, ListItem[]>();
    for (const item of items) {
      const categorie = item.meta?.categorie;
      const cle = categorie === "todo" ? "To do" : categorie === "recurrente" ? "Tâches récurrentes" : "Documents";
      groupes.set(cle, [...(groupes.get(cle) ?? []), item]);
    }

    if (items.length === 0) return <p className="text-sm text-foreground/60">Aucun résultat.</p>;
    if (groupes.size <= 1) {
      return (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <CarteItem key={`${item.id}-${index}`} item={item} index={index} />
          ))}
        </ul>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {[...groupes.entries()].map(([nom, itemsGroupe]) => {
          const cleGroupe = `${listeCle}:${nom}`;
          const estOuvert = groupesOuverts.has(cleGroupe);
          return (
            <div key={nom}>
              <button
                type="button"
                onClick={() =>
                  setGroupesOuverts((precedent) => {
                    const suivant = new Set(precedent);
                    if (suivant.has(cleGroupe)) suivant.delete(cleGroupe);
                    else suivant.add(cleGroupe);
                    return suivant;
                  })
                }
                className="flex w-full items-center justify-between text-xs font-medium text-foreground/70 hover:text-accent"
              >
                <span>
                  {nom} ({itemsGroupe.length})
                </span>
                <span aria-hidden>{estOuvert ? "▲" : "▼"}</span>
              </button>
              {estOuvert && (
                <ul className="mt-2 flex flex-col gap-2">
                  {itemsGroupe.map((item, index) => (
                    <CarteItem key={`${item.id}-${index}`} item={item} index={index} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function CarteItem({ item, index }: { item: ListItem; index: number }) {
    if (item.meta?.type === "menage") {
      const categorie = item.meta?.categorie;
      return (
        <li key={`${item.id}-${index}`}>
          <button
            onClick={() => ouvrirDansMenage(item)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
          >
            <span className="shrink-0">{categorie === "todo" ? "📝" : "🔁"}</span>
            <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
            <span className="shrink-0 text-xs text-accent">Voir dans Ménage ›</span>
          </button>
        </li>
      );
    }
    if (isTaskItem(item)) {
      return (
        <li key={item.id}>
          <button
            onClick={() => handleToggleTask(item.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                item.done ? "border-accent bg-accent text-white" : "border-border text-transparent"
              }`}
            >
              ✓
            </span>
            <span className={`flex-1 text-sm ${item.done ? "text-foreground/40 line-through" : "text-foreground"}`}>
              {item.label}
            </span>
          </button>
        </li>
      );
    }

    // Toutes les occurrences d'un même fichier restent groupées sous UNE
    // carte (pas une carte par occurrence, qui répétait le nom du
    // fichier autant de fois - retour de Chris sur "BFR" trouvé deux
    // fois dans "Cours JFM"). "index" dans la clef : deux items
    // différents peuvent partager le même id (dossiers différents, même
    // nom de fichier).
    return (
      <li key={`${item.id}-${index}`} className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3">
        <button onClick={() => ouvrirDansDocuments(item)} className="flex w-full items-center gap-3 text-left">
          <span className="shrink-0">{item.meta?.type === "dossier" ? "📁" : "📄"}</span>
          <span className="flex-1 truncate text-sm text-foreground">{item.label}</span>
          <span className="shrink-0 text-xs text-accent">Voir dans Documents ›</span>
        </button>
        {toutesLesOccurrences(item).length > 1 ? (
          <div className="flex flex-col gap-0.5 pl-8">
            {toutesLesOccurrences(item).map((occurrence, i) => (
              <button
                key={i}
                onClick={() => ouvrirDansDocuments(item, occurrence.ligne)}
                className="truncate text-left text-xs text-foreground/50 hover:text-accent"
              >
                {occurrence.ligne ? `L${occurrence.ligne} : ` : ""}
                {occurrence.texte}
              </button>
            ))}
          </div>
        ) : (
          premierExtrait(item) && (
            <button
              onClick={() => ouvrirDansDocuments(item, premierExtrait(item)?.ligne)}
              className="truncate pl-8 text-left text-xs text-foreground/50 hover:text-accent"
            >
              {premierExtrait(item)?.ligne ? `L${premierExtrait(item)?.ligne} : ` : ""}
              {premierExtrait(item)?.texte}
            </button>
          )
        )}
      </li>
    );
  }

  // Rendu dans le layout racine (toutes les pages), sauf l'écran de
  // connexion - après tous les hooks, jamais avant, pour ne pas en
  // sauter certains d'un rendu à l'autre (règle des hooks React).
  if (pathname === "/login") return null;

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir l'assistant du Domaine"
        // bottom-20 (pas bottom-4) : reste au-dessus de la nav du bas de
        // Ménage (~72px) même sur les pages qui n'en ont pas - un peu de
        // marge constante partout plutôt qu'une logique par page à tenir
        // à jour à chaque nouvelle nav ajoutée ailleurs dans Domaine.
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-lg transition active:scale-95"
      >
        💬
        {historiqueTexte.length > 0 && (
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-medium text-foreground/60">Le Domaine</span>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Replier l'assistant du Domaine"
          className="text-foreground/50 hover:text-accent"
        >
          ✕
        </button>
      </div>
      <div className="flex max-h-[75vh] w-full flex-col gap-3 overflow-y-auto p-4">
        {mode === "texte" && historiqueTexte.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setChatReduit((r) => !r)}
                className="flex items-center gap-1 text-foreground/60 hover:text-accent"
              >
                {chatReduit ? "▲ Afficher la conversation" : "▼ Réduire la conversation"}
              </button>
              <button type="button" onClick={reinitialiserConversationTexte} className="text-foreground/50 hover:text-accent hover:underline">
                🔄 Réinitialiser
              </button>
            </div>
            {!chatReduit && (
              <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-surface/50 p-3">
                {historiqueTexte.map((tour, index) =>
                  tour.role === "user" ? (
                    <div key={index} className="max-w-[85%] self-end rounded-lg bg-accent px-3 py-2 text-sm text-white">
                      {tour.content}
                    </div>
                  ) : (
                    <div key={index} className="flex max-w-[90%] flex-col gap-1.5 self-start">
                      <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
                        {tour.content}
                      </div>
                      {tour.sources && tour.sources.length > 0 && (
                        <p className="pl-1 text-xs italic text-foreground/50">
                          Sources :{" "}
                          {tour.sources.map((source, i) => (
                            <span key={source.id}>
                              {i > 0 && ", "}
                              <button onClick={() => ouvrirDansDocuments(source)} className="underline hover:text-accent">
                                {source.label}
                              </button>
                            </span>
                          ))}
                        </p>
                      )}
                      {tour.items && tour.items.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => toggleDocumentsAssocies(index)}
                            className="self-start text-xs text-accent hover:underline"
                          >
                            {toursDocumentsOuverts.has(index) ? "▲ Masquer" : "▼ Voir les documents associés"} ({tour.items.length})
                          </button>
                          {toursDocumentsOuverts.has(index) && (
                            <ListeItems items={tour.items} listeCle={`tour-${index}`} />
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}

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
          <div className="max-h-64 overflow-y-auto">
            <ListeItems items={block.items} listeCle="principal" />
          </div>
        )}

        {mode === "motcle" && dernierMotCle && !contenuDejaCherche && (
          <button
            type="button"
            onClick={chercherAussiDansLeContenu}
            disabled={contenuEnCours}
            className="flex items-center justify-center gap-1.5 self-start text-xs text-accent hover:underline disabled:opacity-50"
          >
            {contenuEnCours && <Spinner />}
            🔍 Chercher aussi dans le contenu des documents
          </button>
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
