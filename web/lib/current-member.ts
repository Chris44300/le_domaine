import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CurrentMember {
  id: string;
  householdId: string;
  displayName: string;
  email: string | null;
  /** Applications du Domaine visibles par cette personne. null = accès complet. */
  appsAutorises: string[] | null;
}

/** true si cette personne a le droit de voir cette application (null = accès complet). */
export function aAcces(member: Pick<CurrentMember, "appsAutorises">, app: string): boolean {
  return member.appsAutorises === null || member.appsAutorises.includes(app);
}

/**
 * Récupère la personne connectée (son compte auth + sa ligne "members" côté
 * Ménage). Redirige vers /login si personne n'est authentifié (le proxy
 * global le fait déjà, ceci est une deuxième garde propre à /menage), et
 * vers /login avec un message si le compte existe mais n'a pas encore été
 * rattaché à un foyer (cas d'un email connecté avant d'avoir été ajouté par
 * un autre membre dans les Réglages de Ménage).
 */
export async function requireCurrentMember(): Promise<CurrentMember> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("members")
    .select("id, household_id, display_name, email, apps_autorises")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!member) {
    redirect("/login?erreur=compte-non-rattache");
  }

  return {
    id: member.id,
    householdId: member.household_id,
    displayName: member.display_name,
    email: member.email,
    appsAutorises: member.apps_autorises,
  };
}
