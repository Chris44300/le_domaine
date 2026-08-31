import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "./lib/supabase/database.types";

const PUBLIC_PATHS = ["/login", "/auth"];

// Chantier "Ménage réellement intégré", étape C (permissions par personne,
// voir PLAN.md) - une personne a accès à une page seulement si le nom de
// l'application correspondante figure dans members.apps_autorises (NULL =
// accès complet, ex. Chris). "/" n'a pas besoin d'entrée : la page
// d'accueil elle-même masque les tuiles non autorisées, pas besoin de la
// bloquer entièrement.
const ROUTE_APP: { prefix: string; app: string }[] = [
  { prefix: "/tasks", app: "tasks" },
  { prefix: "/documents", app: "documents" },
  { prefix: "/menage", app: "menage" },
  { prefix: "/roadmap", app: "roadmap" },
];

/**
 * S'exécute avant chaque page : rafraîchit la session Supabase, redirige
 * vers /login si personne n'est authentifié, et vérifie l'accès par
 * application une fois connecté (voir ROUTE_APP ci-dessus).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const routeApp = ROUTE_APP.find((r) => pathname.startsWith(r.prefix));
  if (routeApp) {
    const { data: member } = await supabase
      .from("members")
      .select("apps_autorises")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // Pas de ligne "members" du tout, ou liste explicite qui ne contient
    // pas cette application : accès refusé par défaut (NULL = accès
    // complet est le seul cas qui passe sans figurer dans une liste).
    const autorise = member && (member.apps_autorises === null || member.apps_autorises.includes(routeApp.app));
    if (!autorise) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
