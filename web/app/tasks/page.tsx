"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { callApi, firstErrorMessage, type ListItem } from "../lib/api";

export default function TasksPage() {
  const [items, setItems] = useState<ListItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [priority, setPriority] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    const reponse = await callApi("/tasks/list", { inclure_faites: true });
    const message = firstErrorMessage(reponse);
    if (message) {
      setError(message);
    } else {
      setError(null);
      const bloc = reponse.blocks[0];
      setItems(bloc && bloc.kind === "list" ? bloc.items : []);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    // Chargement initial au montage - cas de fetch-in-effect explicitement
    // valide selon https://react.dev/learn/you-might-not-need-an-effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function handleToggle(id: string) {
    await callApi("/tasks/toggle", { reference_id: id });
    refresh();
  }

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texte = newTask.trim();
    if (!texte) return;
    await callApi("/tasks/add", { texte, priorite: priority });
    setNewTask("");
    refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 pb-40 pt-16">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm text-accent">
          ← Accueil
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Tâches</h1>
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-foreground/60">Chargement…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleToggle(item.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    item.done
                      ? "border-accent bg-accent text-white"
                      : "border-border text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`flex-1 text-sm ${item.done ? "text-foreground/40 line-through" : "text-foreground"}`}
                >
                  {item.label}
                </span>
                <span className="text-xs text-foreground/40">
                  P{typeof item.meta?.priorite === "number" ? item.meta.priorite : "?"}
                </span>
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-foreground/60">Aucune tâche.</p>
          )}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          placeholder="Nouvelle tâche…"
          className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <select
          value={priority}
          onChange={(event) => setPriority(Number(event.target.value))}
          className="rounded-full border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
        >
          <option value={1}>P1</option>
          <option value={2}>P2</option>
          <option value={3}>P3</option>
        </select>
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
