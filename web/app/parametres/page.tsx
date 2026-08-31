"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "systeme" | "light" | "dark";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "systeme", label: "Système", icon: "🖥️" },
  { value: "light", label: "Clair", icon: "☀️" },
  { value: "dark", label: "Sombre", icon: "🌙" },
];

function appliquerTheme(theme: Theme) {
  if (theme === "systeme") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem("domaine-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("domaine-theme", theme);
  }
}

export default function ParametresPage() {
  // "systeme" par défaut tant qu'on n'a pas encore lu localStorage (rendu
  // serveur identique pour tout le monde) - ajusté juste après montage.
  const [theme, setTheme] = useState<Theme>("systeme");

  useEffect(() => {
    const stored = localStorage.getItem("domaine-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function handleChange(nouveau: Theme) {
    setTheme(nouveau);
    appliquerTheme(nouveau);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 pb-40 pt-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Accueil
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Réglages</h1>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Apparence</h2>
        <div className="flex gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition ${
                theme === option.value
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <span className="text-xl">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-foreground/50">
          Même palette partout, y compris dans Ménage.
        </p>
      </section>
    </div>
  );
}
