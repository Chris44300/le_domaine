import Link from "next/link";
import { requireCurrentMember } from "@/lib/current-member";
import { BottomNav } from "./bottom-nav";
import { CelebrationOverlay } from "./celebration-overlay";

export default async function MenageLayout({ children }: LayoutProps<"/menage">) {
  // Vérifie qu'on a bien une personne authentifiée ET rattachée à un foyer
  // Ménage (le proxy racine vérifie déjà l'authentification Domaine, ceci
  // vérifie le rattachement au foyer).
  await requireCurrentMember();

  return (
    // Ménage garde la même palette que le reste de Domaine depuis le
    // 2026-08-31 (demande de Chris) - .menage-shell ne fait plus que fixer
    // la police, plus les couleurs (voir globals.css).
    <div className="menage-shell flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-lg flex-1 pb-4">
        <div className="flex justify-end px-4 pt-4">
          <Link href="/" className="flex items-center gap-1 text-xs text-foreground/60 hover:text-accent">
            🏰 Retour au Domaine
          </Link>
        </div>
        {children}
      </div>
      <BottomNav />
      <CelebrationOverlay />
    </div>
  );
}
