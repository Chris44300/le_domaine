"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { announceDateChanged, announceUndo } from "@/lib/celebrate";
import { formatFrenchWeekdayDate, todayIso } from "@/lib/dates";

export interface DoneItem {
  id: string;
  taskName: string;
  categoryName: string;
  completedByName: string | null;
  /** true pour une tâche ponctuelle ("To do") plutôt qu'une tâche récurrente. */
  isTodo?: boolean;
  /** Fourni uniquement pour la complétion du jour même. */
  undo?: () => Promise<void>;
  /**
   * Fourni uniquement pour la complétion du jour même d'une tâche
   * récurrente (pas pour les "To do") : corrige la date réelle, ex. cochée
   * aujourd'hui par erreur alors qu'elle avait été faite hier.
   */
  editDate?: (newDate: string) => Promise<void>;
}

type Mode = "view" | "edit-date";

export function DoneCard({ item }: { item: DoneItem }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("view");
  const [newDate, setNewDate] = useState(todayIso());
  const [isBusy, setIsBusy] = useState(false);

  async function handleUndo() {
    if (!item.undo) return;
    if (!window.confirm(`Annuler "${item.taskName}" ? Elle redeviendra à faire.`)) return;
    setIsBusy(true);
    try {
      await item.undo();
      announceUndo(item.taskName);
      router.refresh();
    } catch {
      setIsBusy(false);
    }
  }

  async function handleEditDate(e: React.FormEvent) {
    e.preventDefault();
    if (!item.editDate) return;
    setIsBusy(true);
    try {
      await item.editDate(newDate);
      announceDateChanged(item.taskName, formatFrenchWeekdayDate(newDate));
      setMode("view");
      router.refresh();
    } catch {
      setIsBusy(false);
    }
  }

  const badgeClass = item.isTodo ? "bg-todo-soft text-todo" : "bg-success/15 text-success";

  return (
    <div className="rounded-2xl border border-success/30 bg-success-soft p-4 opacity-90">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
            {item.categoryName}
          </span>
          <h3 className="mt-1.5 text-base font-semibold text-foreground line-through decoration-success/60">
            {item.taskName}
          </h3>
          {item.completedByName && (
            <p className="mt-0.5 text-xs text-success">Fait par {item.completedByName}</p>
          )}
        </div>
        <span className="text-2xl" aria-hidden>
          ✅
        </span>
      </div>

      {mode === "edit-date" ? (
        <form onSubmit={handleEditDate} className="mt-2 flex gap-2">
          <input
            type="date"
            max={todayIso()}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isBusy}
            className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className="rounded-lg px-2 text-xs text-muted"
            aria-label="Annuler"
          >
            ✕
          </button>
        </form>
      ) : (
        (item.undo || item.editDate) && (
          <div className="mt-2 flex gap-3">
            {item.undo && (
              <button
                onClick={handleUndo}
                disabled={isBusy}
                className="text-xs font-medium text-muted underline decoration-dotted disabled:opacity-60"
              >
                ↩ Annuler
              </button>
            )}
            {item.editDate && (
              <button
                onClick={() => {
                  setNewDate(todayIso());
                  setMode("edit-date");
                }}
                disabled={isBusy}
                className="text-xs font-medium text-muted underline decoration-dotted disabled:opacity-60"
              >
                🗓️ Changer la date
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
