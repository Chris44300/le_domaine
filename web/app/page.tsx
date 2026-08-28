import Link from "next/link";
import SearchBar from "./components/SearchBar";

const MENAGE_URL = "https://application-taches-menageres.vercel.app/";

const tiles = [
  { href: "/tasks", icon: "✅", label: "Tâches" },
  { href: "/documents", icon: "📁", label: "Documents" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-40 pt-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Le Domaine
      </h1>

      <div className="mt-12 grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-foreground"
          >
            <span className="text-3xl">{tile.icon}</span>
            <span className="text-sm font-medium">{tile.label}</span>
          </Link>
        ))}
        <a
          href={MENAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-foreground"
        >
          <span className="text-3xl">🧺</span>
          <span className="text-sm font-medium">Ménage</span>
        </a>
      </div>

      <SearchBar />
    </div>
  );
}
