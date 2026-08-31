"use client";

import { useMemo, useState } from "react";
import { compareIsoDates } from "@/lib/dates";
import { sumEstimatedMinutes } from "@/lib/format";
import { undoTaskCompletion, updateCompletionDate } from "@/lib/task-actions";
import { uncompleteTodo } from "@/lib/todo-actions";
import { useHouseholdRealtime } from "@/lib/use-household-realtime";
import type { TaskWithRelations, TodoWithRelations } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import { CollapsibleSection } from "./collapsible-section";
import { DoneCard, type DoneItem } from "./done-card";
import { matchesMemberFilter, PersonFilter, type FilterableMember } from "./person-filter";
import { ProgressHeader } from "./progress-header";
import { TaskCard } from "./task-card";
import { TodoCard } from "./todo-card";
import { TodoSection } from "./todo-section";

type Completion = Database["public"]["Tables"]["completions"]["Row"];

const URGENT_AFTER_DAYS = 4;

function daysLate(dueDate: string, today: string): number {
  const ms = new Date(today).getTime() - new Date(dueDate).getTime();
  return Math.round(ms / 86_400_000);
}

export function TodayList({
  initialTasks,
  doneToday,
  openTodos,
  todosDoneToday,
  members,
  householdId,
  currentMemberId,
  today,
}: {
  initialTasks: TaskWithRelations[];
  doneToday: Completion[];
  openTodos: TodoWithRelations[];
  todosDoneToday: TodoWithRelations[];
  members: FilterableMember[];
  householdId: string;
  currentMemberId: string;
  today: string;
}) {
  useHouseholdRealtime(householdId);
  // Par défaut, chacun voit ses propres tâches (+ celles partagées, non
  // assignées) plutôt que tout le foyer — "Tous" reste un choix explicite.
  const [selectedMember, setSelectedMember] = useState<string | null>(currentMemberId);

  const tasks = useMemo(
    () => initialTasks.filter((t) => matchesMemberFilter(t.assignee_member_id, selectedMember)),
    [initialTasks, selectedMember]
  );
  const done = useMemo(
    () => doneToday.filter((c) => matchesMemberFilter(c.assigned_to_member_id, selectedMember)),
    [doneToday, selectedMember]
  );
  const todosDone = useMemo(
    () => todosDoneToday.filter((t) => matchesMemberFilter(t.assignee_member_id, selectedMember)),
    [todosDoneToday, selectedMember]
  );
  const openTodosFiltered = useMemo(
    () => openTodos.filter((t) => matchesMemberFilter(t.assignee_member_id, selectedMember)),
    [openTodos, selectedMember]
  );
  // Une To do datée pour aujourd'hui reste dans le menu déroulant ci-dessus
  // (toutes les To do ouvertes, datées ou non) ET apparaît en plus ici,
  // dans les actions du jour — même logique que dans la vue Semaine.
  const todosDueToday = useMemo(
    () => openTodosFiltered.filter((t) => t.due_date === today),
    [openTodosFiltered, today]
  );

  const overdue = tasks.filter((t) => compareIsoDates(t.next_due_date, today) < 0);
  const dueToday = tasks.filter((t) => compareIsoDates(t.next_due_date, today) === 0);
  const pendingMinutes = sumEstimatedMinutes(tasks);

  const doneItems: DoneItem[] = [
    ...done.map(
      (c): DoneItem => ({
        id: c.id,
        taskName: c.task_name_snapshot,
        categoryName: c.category_name_snapshot ?? "Sans catégorie",
        completedByName: c.completed_by_name_snapshot,
        undo: () => undoTaskCompletion(c.task_id!),
        editDate: (newDate) => updateCompletionDate(c.id, newDate),
      })
    ),
    ...todosDone.map(
      (t): DoneItem => ({
        id: t.id,
        taskName: t.name,
        categoryName: t.assignee ? `To do ${t.assignee.display_name}` : "To do",
        isTodo: true,
        completedByName: members.find((m) => m.id === t.completed_by_member_id)?.display_name ?? null,
        undo: () => uncompleteTodo(t.id),
      })
    ),
  ];

  if (initialTasks.length === 0 && doneToday.length === 0 && openTodos.length === 0 && todosDoneToday.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-2 font-medium text-foreground">Rien à faire aujourd&apos;hui</p>
        <p className="mt-1 text-sm text-muted">Profitez-en !</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PersonFilter members={members} selected={selectedMember} onChange={setSelectedMember} />

      <ProgressHeader
        doneCount={done.length}
        pendingCount={tasks.length}
        pendingMinutes={pendingMinutes}
      />

      <TodoSection
        todos={openTodosFiltered}
        members={members}
        householdId={householdId}
        currentMemberId={currentMemberId}
      />

      <CollapsibleSection title="Fait aujourd'hui" count={doneItems.length} colorClass="text-success">
        {doneItems.map((item) => (
          <DoneCard key={item.id} item={item} />
        ))}
      </CollapsibleSection>

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-warning">
            En retard ({overdue.length})
          </h2>
          <div className="space-y-3">
            {overdue.map((task) => {
              const late = daysLate(task.next_due_date, today);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  currentMemberId={currentMemberId}
                  urgent={late >= URGENT_AFTER_DAYS}
                  dueLabel={`En retard depuis ${late} j`}
                />
              );
            })}
          </div>
        </section>
      )}

      {todosDueToday.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-todo">
            To do du jour ({todosDueToday.length})
          </h2>
          <div className="space-y-3">
            {todosDueToday.map((todo) => (
              <TodoCard key={todo.id} todo={todo} currentMemberId={currentMemberId} />
            ))}
          </div>
        </section>
      )}

      {dueToday.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">
            À faire aujourd&apos;hui ({dueToday.length})
          </h2>
          <div className="space-y-3">
            {dueToday.map((task) => (
              <TaskCard key={task.id} task={task} currentMemberId={currentMemberId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
