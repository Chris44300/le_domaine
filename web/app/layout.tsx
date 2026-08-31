import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SearchBar from "./components/SearchBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Le Domaine",
  description: "Interface maîtresse personnelle de Chris",
};

// Applique le thème choisi AVANT le premier rendu (script bloquant, pas un
// useEffect) - sinon la page flashe brièvement dans le mauvais thème le
// temps qu'un composant client se monte. "Système" (pas de choix explicite)
// ne pose aucun attribut : le CSS suit alors prefers-color-scheme seul.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("domaine-theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // data-theme est posé par THEME_INIT_SCRIPT avant l'hydratation React
      // (voir plus bas) - un décalage entre le rendu serveur (sans
      // l'attribut, qui ne connaît pas encore localStorage) et le client
      // est donc normal et volontaire ici, pas une vraie erreur.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        {/* Rendu ici (pas sur la page d'accueil seule) pour rester
            disponible partout - Documents, Tâches, Ménage - demande de
            Chris : "un ambassadeur qui ne me quitte jamais quand je me
            balade", pour poser une question tout en naviguant sans
            perdre le fil de la conversation. */}
        <SearchBar />
      </body>
    </html>
  );
}
