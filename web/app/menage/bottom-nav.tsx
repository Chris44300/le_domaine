"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/menage", label: "Aujourd'hui", icon: "☀️" },
  { href: "/menage/semaine", label: "Semaine", icon: "📅" },
  { href: "/menage/historique", label: "Historique", icon: "🕓" },
  { href: "/menage/parametres", label: "Réglages", icon: "⚙️" },
] as const;

function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute top-1 right-1/2 h-1.5 w-1.5 translate-x-3 rounded-full bg-primary transition-opacity duration-150 ${
        pending ? "animate-soft-pulse opacity-100" : "opacity-0"
      }`}
    />
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-border bg-surface/95 shadow-nav backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => {
          const isActive = item.href === "/menage" ? pathname === "/menage" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 py-2.5 transition active:scale-95"
              >
                <PendingDot />
                <span
                  className={`flex h-8 w-11 items-center justify-center rounded-full text-xl leading-none transition-colors ${
                    isActive ? "bg-primary/12" : ""
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
