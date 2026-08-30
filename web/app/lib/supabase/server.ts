import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase pour le serveur (composants serveur, actions serveur,
 * route handlers). À recréer à chaque requête - ne jamais le mettre en
 * cache ni le partager entre requêtes.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll appelé depuis un composant serveur (pas une action /
            // route) : sans effet, la session est de toute façon rafraîchie
            // par proxy.ts.
          }
        },
      },
    }
  );
}
