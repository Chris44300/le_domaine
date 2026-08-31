"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { announceTodoDateCleared, announceTodoDated, celebrateTaskCompletion } from "@/lib/celebrate";
import { formatFrenchWeekdayDate, todayIso } from "@/lib/dates";
import { completeTodo, deleteTodo, setTodoDate } from "@/lib/todo-actions";
import type { TodoWithRelations } from "@/lib/data";
import { MemberBadge } from "./member-badge";

type Panel = "none" | "date";

export function TodoCard({
  todo,
  currentMemberId,
}: {
  todo: TodoWithRelations;
  currentMemberId: string;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [dateValue, setDateValue] = useState(todo.due_date ?? todayIso());
  const [isBusy, setIsBusy] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  async function handleDone() {
    setIsBusy(true);
    setJustCompleted(true);
    celebrateTaskCompletion(todo.name);
    try {
      await completeTodo(todo.id, currentMemberId);
      setTimeout(() => router.refresh(), 500);
    } catch {
      setJustCompleted(false);
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer "${todo.name}" ?`)) return;
    setIsBusy(true);
    try {
      await deleteTodo(todo.id);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSetDate(e: React.FormEvent) {
    e.preventDefault();
    if (!dateValue) return;
    setPanel("none");
    setIsBusy(true);
    try {
      await setTodoDate(todo.id, dateValue);
      announceTodoDated(todo.name, formatFrenchWeekdayDate(dateValue));
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearDate() {
    setPanel("none");
    setIsBusy(true);
    try {
      await setTodoDate(todo.id, null);
      announceTodoDateCleared(todo.name);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-card transition-all duration-300 ${
        justCompleted ? "scale-[0.97] border-success bg-success-soft opacity-70" : "border-todo/30 bg-todo-soft/40"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-block rounded-full bg-todo-soft px-2 py-0.5 text-[11px] font-medium text-todo">
              To do
            </span>
            {todo.due_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-todo-soft px-2 py-0.5 text-[11px] font-medium text-todo">
                📅 {formatFrenchWeekdayDate(todo.due_date)}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-base font-semibold text-foreground">{todo.name}</h3>
          {todo.assignee && (
            <p className="mt-0.5 text-xs text-muted">
              <MemberBadge memberId={todo.assignee.id} displayName={todo.assignee.display_name} size="xs" />
            </p>
          )}
        </div>
        {justCompleted && (
          <span className="text-2xl" aria-hidden>
            ✅
          </span>
        )}
      </div>

      {justCompleted ? null : panel === "date" ? (
        <form onSubmit={handleSetDate} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={isBusy || !dateValue}
            className="rounded-xl bg-todo px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            OK
          </button>
          {todo.due_date && (
            <button
              type="button"
              onClick={handleClearDate}
              disabled={isBusy}
              className="text-xs font-medium text-muted underline decoration-dotted disabled:opacity-60"
            >
              Retirer la date
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel("none")}
            className="rounded-xl px-2 text-sm text-muted"
            aria-label="Annuler"
          >
            ✕
          </button>
        </form>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleDone}
            disabled={isBusy}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            ✓ Fait
          </button>
          <button
            onClick={() => {
              setDateValue(todo.due_date ?? todayIso());
              setPanel("date");
            }}
            disabled={isBusy}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground active:scale-[0.98] disabled:opacity-60"
            aria-label={todo.due_date ? "Changer la date" : "Associer une date"}
            title={todo.due_date ? "Changer la date" : "Associer une date"}
          >
            📅
          </button>
          <button
            onClick={handleDelete}
            disabled={isBusy}
            className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-muted active:scale-[0.98] disabled:opacity-60"
            aria-label="Supprimer"
            title="Supprimer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
