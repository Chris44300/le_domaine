import Link from "next/link";
import { aAcces, requireCurrentMember } from "@/lib/current-member";

const tiles = [
  { href: "/tasks", app: "tasks", icon: "✅", label: "Tâches" },
  { href: "/documents", app: "documents", icon: "📁", label: "Documents" },
  { href: "/menage", app: "menage", icon: "🧺", label: "Ménage" },
];

export default async function Home() {
  const member = await requireCurrentMember();
  const tilesVisibles = tiles.filter((tile) => aAcces(member, tile.app));

  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-40 pt-16">
      <div className="flex w-full max-w-xl items-center justify-end">
        <Link
          href="/parametres"
          aria-label="Réglages"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-foreground/50 hover:text-accent"
        >
          ⚙️
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Le Domaine
      </h1>

      <div className="mt-12 grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
        {tilesVisibles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-foreground"
          >
            <span className="text-3xl">{tile.icon}</span>
            <span className="text-sm font-medium">{tile.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
