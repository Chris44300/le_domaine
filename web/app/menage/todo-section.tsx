"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { announceTodoCreated } from "@/lib/celebrate";
import { createTodo } from "@/lib/todo-actions";
import type { TodoWithRelations } from "@/lib/data";
import type { FilterableMember } from "./person-filter";
import { TodoCard } from "./todo-card";

export function TodoSection({
  todos,
  members,
  householdId,
  currentMemberId,
}: {
  todos: TodoWithRelations[];
  members: FilterableMember[];
  householdId: string;
  currentMemberId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsBusy(true);
    try {
      const trimmedName = name.trim();
      const forLabel = assigneeId
        ? (members.find((m) => m.id === assigneeId)?.display_name ?? "quelqu'un")
        : "tout le monde";
      await createTodo(householdId, trimmedName, assigneeId || null, currentMemberId);
      announceTodoCreated(trimmedName, forLabel);
      setName("");
      setAssigneeId("");
      setShowForm(false);
      setOpen(true);
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-todo"
        >
          <span>To do ({todos.length})</span>
          {todos.length > 0 && <span aria-hidden>{open ? "▲" : "▼"}</span>}
        </button>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-todo-soft text-base font-bold text-todo active:scale-95"
          aria-label="Ajouter une tâche ponctuelle"
        >
          +
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mt-2 space-y-2 rounded-xl border border-dashed border-todo/40 bg-todo-soft/30 p-3"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Quoi faire ?"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
          >
            <option value="">Personne (les deux)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-lg bg-todo py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Ajouter
          </button>
        </form>
      )}

      {open && todos.length > 0 && (
        <div className="mt-2 space-y-3">
          {todos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} currentMemberId={currentMemberId} />
          ))}
        </div>
      )}
    </section>
  );
}
