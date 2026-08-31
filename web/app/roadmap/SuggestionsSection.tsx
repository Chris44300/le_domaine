"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Suggestion = {
  id: string;
  texte: string;
  statut: string;
  createdAt: string;
  auteur: string | null;
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

export function SuggestionsSection({
  suggestionsInitiales,
  householdId,
  currentMemberId,
}: {
  suggestionsInitiales: Suggestion[];
  householdId: string;
  currentMemberId: string;
}) {
  const router = useRouter();
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [texte, setTexte] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contenu = texte.trim();
    if (!contenu) return;

    setEnvoiEnCours(true);
    setErreur(null);
    const supabase = createClient();
    const { error } = await supabase.from("suggestions").insert({
      household_id: householdId,
      texte: contenu,
      auteur_member_id: currentMemberId,
    });
    setEnvoiEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }
    setTexte("");
    setAfficherFormulaire(false);
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Boîte à suggestions ({suggestionsInitiales.length})
        </h2>
        <button
          type="button"
          onClick={() => setAfficherFormulaire((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white"
        >
          💡 Proposer une idée
        </button>
      </div>

      {afficherFormulaire && (
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3">
          <textarea
            autoFocus
            value={texte}
            onChange={(event) => setTexte(event.target.value)}
            placeholder="Une idée, une remarque..."
            rows={3}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
          />
          {erreur && <p className="text-xs text-red-600">{erreur}</p>}
          <button
            type="submit"
            disabled={envoiEnCours || !texte.trim()}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {envoiEnCours ? "…" : "Envoyer"}
          </button>
        </form>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {suggestionsInitiales.length === 0 && (
          <p className="text-sm text-foreground/60">Aucune suggestion pour l&apos;instant.</p>
        )}
        {suggestionsInitiales.map((suggestion) => (
          <div key={suggestion.id} className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-sm text-foreground">{suggestion.texte}</p>
            <p className="mt-1 text-xs text-foreground/50">
              {suggestion.auteur ?? "Anonyme"} · {formatDate(suggestion.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
