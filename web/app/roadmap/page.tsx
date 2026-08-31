import Link from "next/link";
import { requireCurrentMember } from "@/lib/current-member";
import { createClient } from "@/lib/supabase/server";
import { SuggestionsSection } from "./SuggestionsSection";

// Vision tenue à jour à la main (pas en base) - c'est la même chose que la
// "Feuille de route actuelle" de PLAN.md, juste réécrite pour se lire
// d'un coup d'œil plutôt qu'en langage de suivi de chantier technique. À
// mettre à jour ici quand PLAN.md change, pas de mécanisme automatique.
const VISION: { titre: string; statut: "fait" | "en_cours" | "a_venir"; detail: string }[] = [
  {
    titre: "Documentation à jour",
    statut: "en_cours",
    detail: "Garder les README et PLAN.md exacts au fil du travail, pas en une passe unique.",
  },
  {
    titre: "Ménage vraiment intégré à Domaine",
    statut: "en_cours",
    detail:
      "Écrans, chat, recherche par mot-clé, et permissions du chat par personne faits. Reste : cocher/reporter une tâche directement depuis le chat (écriture, pas encore construite).",
  },
  {
    titre: "Mini PC + NAS dédiés",
    statut: "en_cours",
    detail:
      "Matériel choisi (Geekom A6, Synology DS225+, switch 2,5 GbE, un disque WD Red Plus 4 To pour commencer). Reste la migration : brancher, transférer les documents, reconnecter Tailscale.",
  },
  {
    titre: "Réseau multi-utilisateurs + « Programmation »",
    statut: "a_venir",
    detail:
      "Inviter d'autres personnes avec des permissions par application, et un futur chat admin capable de modifier le code (avec sauvegardes/retour en arrière).",
  },
  {
    titre: "Pièce Reporting",
    statut: "a_venir",
    detail: "Un premier domaine entièrement nouveau (veille programmée automatique).",
  },
  {
    titre: "Confidentialité par tag sur les documents",
    statut: "a_venir",
    detail: "Marquer certains documents comme sensibles, filtrés avant même d'atteindre le chat.",
  },
  {
    titre: "Alerte si le serveur tombe complètement",
    statut: "a_venir",
    detail: "Aujourd'hui : alerte seulement si le balayage nocturne échoue, pas si l'API entière est injoignable.",
  },
];

const STATUT_STYLE: Record<string, string> = {
  fait: "bg-success-soft text-success",
  en_cours: "bg-todo-soft text-todo",
  a_venir: "bg-surface-muted text-foreground/60",
};

const STATUT_LABEL: Record<string, string> = {
  fait: "Fait",
  en_cours: "En cours",
  a_venir: "À venir",
};

export default async function RoadmapPage() {
  const member = await requireCurrentMember();
  const supabase = await createClient();

  // Deux requetes separees plutot qu'une jointure embarquee
  // (auteur:members(...)) : cette derniere compilait bien en dev mais
  // faisait echouer le build de production (`next build`, type-check
  // strict) - database.types.ts n'a pas de metadonnees "Relationships"
  // decrivant la cle etrangere suggestions.auteur_member_id -> members.id,
  // donc le type genere pour la jointure est un SelectQueryError. Plus
  // simple et plus sur d'assembler les deux cote serveur ici.
  const [{ data: suggestions }, { data: membres }] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id, texte, statut, created_at, auteur_member_id")
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, display_name"),
  ]);
  const nomParMembre = new Map((membres ?? []).map((m) => [m.id, m.display_name]));

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 pb-40 pt-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Accueil
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Road Map</h1>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Où on en est</h2>
        <div className="flex flex-col gap-3">
          {VISION.map((item) => (
            <div key={item.titre} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.titre}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUT_STYLE[item.statut]}`}>
                  {STATUT_LABEL[item.statut]}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground/60">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <SuggestionsSection
        suggestionsInitiales={(suggestions ?? []).map((s) => ({
          id: s.id,
          texte: s.texte,
          statut: s.statut,
          createdAt: s.created_at,
          auteur: s.auteur_member_id ? (nomParMembre.get(s.auteur_member_id) ?? null) : null,
        }))}
        householdId={member.householdId}
        currentMemberId={member.id}
      />
    </div>
  );
}
