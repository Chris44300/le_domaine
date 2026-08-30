import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "../../lib/supabase/server";

/**
 * Point d'arrivée du lien de connexion reçu par email (magic link) - flux
 * de secours, le flux principal est le code à 6 chiffres (voir
 * app/login/LoginForm.tsx). Gère les deux formes possibles du lien selon
 * la configuration du projet Supabase : `code` (PKCE, via la page de
 * vérification Supabase) ou `token_hash` + `type` (lien direct).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?erreur=lien-invalide");
}
