import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Client Supabase pour le navigateur (composants "use client").
 * Même projet Supabase que Ménage (comptes déjà existants, pas de
 * recréation) - à appeler une fois par composant qui en a besoin.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
