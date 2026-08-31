"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryIcon } from "@/lib/category-icons";
import { announceAdded, announceMove, announceSnooze, celebrateTaskCompletion } from "@/lib/celebrate";
import { todayIso } from "@/lib/dates";
import { formatRecurrenceLabel, frequencyGroup } from "@/lib/recurrence";
import { markTaskDone, moveTaskTo, snoozeTaskBy } from "@/lib/task-actions";
import type { TaskWithRelations } from "@/lib/data";
import { MemberBadge } from "./member-badge";

const GROUP_CLASS: Record<string, string> = {
  H: "bg-info-soft text-[#2563a8]",
  M: "bg-[#eaf7f2] text-[#2f8f74]",
  T: "bg-[#f2eefb] text-[#7c5cbf]",
};

type Panel = "none" | "snooze" | "move";

export function TaskCard({
  task,
  currentMemberId,
  dueLabel,
  urgent = false,
  moveTargets,
  showPullToCurrentWeek = false,
}: {
  task: TaskWithRelations;
  currentMemberId: string;
  /** Ex. "En retard depuis 3 jours" — laissé au composant parent pour rester contextuel. */
  dueLabel?: string;
  /** Mise en avant renforcée pour une tâche oubliée depuis longtemps. */
  urgent?: boolean;
  /** Si fourni (vue Semaine), propose de déplacer la tâche vers un de ces jours. */
  moveTargets?: { iso: string; label: string }[];
  /**
   * Propose une 4e action "Avancer à cette semaine" — pour une tâche prévue
   * plus tard (ex. dans 2 semaines) qu'on veut faire dès maintenant plutôt
   * que d'attendre son cycle normal, en construisant sa semaine à l'avance.
   */
  showPullToCurrentWeek?: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [customDays, setCustomDays] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const group = frequencyGroup(task.recurrence_days);

  function refreshSoon(delay = 500) {
    setTimeout(() => router.refresh(), delay);
  }

  async function handleDone() {
    setIsBusy(true);
    setJustCompleted(true);
    celebrateTaskCompletion(task.name);
    try {
      await markTaskDone(task.id, currentMemberId);
      refreshSoon();
    } catch {
      setJustCompleted(false);
      setIsBusy(false);
    }
  }

  async function handleSnooze(days: number) {
    if (!Number.isInteger(days) || days < 1) return;
    setPanel("none");
    setIsBusy(true);
    try {
      await snoozeTaskBy(task.id, days);
      announceSnooze(task.name, days);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMove(dateIso: string, dayLabel: string) {
    setPanel("none");
    setIsBusy(true);
    try {
      await moveTaskTo(task.id, dateIso);
      announceMove(task.name, dayLabel);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePullToCurrentWeek() {
    setIsBusy(true);
    try {
      await moveTaskTo(task.id, todayIso());
      announceAdded(task.name, "aujourd'hui");
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-card transition-all duration-300 ${
        justCompleted
          ? "scale-[0.97] border-success bg-success-soft opacity-70"
          : urgent
            ? "border-urgent/40 bg-urgent-soft/40"
            : "border-border bg-surface"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${GROUP_CLASS[group]}`}
          >
            <span aria-hidden>{categoryIcon(task.category?.name)}</span>
            {task.category?.name ?? "Sans catégorie"} · {formatRecurrenceLabel(task.recurrence_days)}
            {task.estimated_minutes ? ` · ⏱ ${task.estimated_minutes} min` : ""}
          </span>
          <h3 className="mt-1.5 text-base font-semibold text-foreground">{task.name}</h3>
          {task.assignee && (
            <p className="mt-0.5 text-xs text-muted">
              <MemberBadge
                memberId={task.assignee.id}
                displayName={task.assignee.display_name}
                size="xs"
              />
            </p>
          )}
          {dueLabel && (
            <p
              className={`mt-0.5 text-xs font-medium ${urgent ? "text-urgent" : "text-warning"}`}
            >
              {urgent ? "⚠️ " : ""}
              {dueLabel}
            </p>
          )}
        </div>
        {justCompleted && (
          <span className="text-2xl" aria-hidden>
            ✅
          </span>
        )}
      </div>

      {justCompleted ? null : panel === "snooze" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                onClick={() => handleSnooze(days)}
                disabled={isBusy}
                className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground active:scale-[0.98]"
              >
                +{days}j
              </button>
            ))}
            <button
              onClick={() => setPanel("none")}
              className="rounded-xl px-3 text-sm text-muted"
              aria-label="Annuler"
            >
              ✕
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSnooze(Number(customDays));
            }}
            className="flex gap-2"
          >
            <input
              type="number"
              min={1}
              placeholder="Autre nombre de jours"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={isBusy || !customDays}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              OK
            </button>
          </form>
        </div>
      ) : panel === "move" && moveTargets ? (
        <div className="flex flex-wrap gap-2">
          {moveTargets.map((t) => (
            <button
              key={t.iso}
              onClick={() => handleMove(t.iso, t.label)}
              disabled={isBusy}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground active:scale-[0.98]"
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setPanel("none")}
            className="rounded-xl px-3 text-sm text-muted"
            aria-label="Annuler"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDone}
            disabled={isBusy}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            ✓ Fait
          </button>
          <button
            onClick={() => setPanel("snooze")}
            disabled={isBusy}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:scale-[0.98] disabled:opacity-60"
          >
            Reporter
          </button>
          {moveTargets && moveTargets.length > 0 && (
            <button
              onClick={() => setPanel("move")}
              disabled={isBusy}
              className="rounded-xl border border-border bg-background px-3 py-3 text-sm font-medium text-foreground active:scale-[0.98] disabled:opacity-60"
              aria-label="Déplacer à un autre jour"
              title="Déplacer à un autre jour"
            >
              📅
            </button>
          )}
          {showPullToCurrentWeek && (
            <button
              onClick={handlePullToCurrentWeek}
              disabled={isBusy}
              className="w-full rounded-xl border border-dashed border-primary/50 bg-primary/5 py-2.5 text-xs font-medium text-primary active:scale-[0.98] disabled:opacity-60"
            >
              📌 Avancer à cette semaine
            </button>
          )}
        </div>
      )}
    </div>
  );
}
