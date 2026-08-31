import { requireCurrentMember } from "@/lib/current-member";
import { BottomNav } from "./bottom-nav";
import { CelebrationOverlay } from "./celebration-overlay";

export default async function MenageLayout({ children }: LayoutProps<"/menage">) {
  // Vérifie qu'on a bien une personne authentifiée ET rattachée à un foyer
  // Ménage (le proxy racine vérifie déjà l'authentification Domaine, ceci
  // vérifie le rattachement au foyer).
  await requireCurrentMember();

  return (
    // Ménage garde ses propres couleurs/police (voir la classe .menage-shell
    // dans globals.css) - même apparence qu'en déploiement autonome, juste
    // hébergé dans Domaine désormais (pas de nouvel onglet à l'ouverture).
    <div className="menage-shell flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-lg flex-1 pb-4">{children}</div>
      <BottomNav />
      <CelebrationOverlay />
    </div>
  );
}
