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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
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
