"use client";

import { useMemo, useState } from "react";
import { addDays, compareIsoDates, formatFrenchWeekdayDate, startOfIsoWeek } from "@/lib/dates";
import { formatMinutes, sumEstimatedMinutes } from "@/lib/format";
import { undoTaskCompletion, updateCompletionDate } from "@/lib/task-actions";
import { uncompleteTodo } from "@/lib/todo-actions";
import { useHouseholdRealtime } from "@/lib/use-household-realtime";
import type { TaskWithRelations, TodoWithRelations } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import { CollapsibleSection } from "../collapsible-section";
import { DoneCard, type DoneItem } from "../done-card";
import { matchesMemberFilter, PersonFilter, type FilterableMember } from "../person-filter";
import { PreviewOccurrenceCard } from "../preview-occurrence-card";
import { WeekProgressHeader } from "../progress-header";
import { TaskCard } from "../task-card";
import { TodoCard } from "../todo-card";
import { TodoSection } from "../todo-section";

type Completion = Database["public"]["Tables"]["completions"]["Row"];
type Occurrence = { task: TaskWithRelations; isReal: boolean };

function todoDoneLabel(todo: TodoWithRelations): string {
  return todo.assignee ? `To do ${todo.assignee.display_name}` : "To do";
}

export function WeekList({
  days,
  occurrencesByDay,
  doneByDay,
  todosDoneByDay,
  todosDueByDay,
  todos,
  moveTargets,
  members,
  householdId,
  currentMemberId,
  today,
}: {
  days: string[];
  occurrencesByDay: Record<string, Occurrence[]>;
  doneByDay: Record<string, Completion[]>;
  todosDoneByDay: Record<string, TodoWithRelations[]>;
  todosDueByDay: Record<string, TodoWithRelations[]>;
  todos: TodoWithRelations[];
  moveTargets: { iso: string; label: string }[];
  members: FilterableMember[];
  householdId: string;
  currentMemberId: string;
  today: string;
}) {
  useHouseholdRealtime(householdId);
  // Par défaut, chacun voit ses propres tâches (+ celles partagées, non
  // assignées) plutôt que tout le foyer — "Tous" reste un choix explicite.
  const [selectedMember, setSelectedMember] = useState<string | null>(currentMemberId);

  // Fin de la semaine calendaire EN COURS (celle d'aujourd'hui), indépendante
  // de la semaine actuellement parcourue — sert à savoir si une tâche
  // affichée est "au-delà de cette semaine" et peut donc être avancée.
  const currentWeekEnd = useMemo(() => addDays(startOfIsoWeek(today), 6), [today]);

  const filteredOccurrencesByDay = useMemo(() => {
    const result: Record<string, Occurrence[]> = {};
    for (const day of days) {
      result[day] = (occurrencesByDay[day] ?? []).filter((o) =>
        matchesMemberFilter(o.task.assignee_member_id, selectedMember)
      );
    }
    return result;
  }, [occurrencesByDay, days, selectedMember]);

  const filteredDoneByDay = useMemo(() => {
    const result: Record<string, Completion[]> = {};
    for (const day of days) {
      result[day] = (doneByDay[day] ?? []).filter((c) =>
        matchesMemberFilter(c.assigned_to_member_id, selectedMember)
      );
    }
    return result;
  }, [doneByDay, days, selectedMember]);

  const filteredTodosDoneByDay = useMemo(() => {
    const result: Record<string, TodoWithRelations[]> = {};
    for (const day of days) {
      result[day] = (todosDoneByDay[day] ?? []).filter((t) =>
        matchesMemberFilter(t.assignee_member_id, selectedMember)
      );
    }
    return result;
  }, [todosDoneByDay, days, selectedMember]);

  const filteredTodosDueByDay = useMemo(() => {
    const result: Record<string, TodoWithRelations[]> = {};
    for (const day of days) {
      result[day] = (todosDueByDay[day] ?? []).filter((t) =>
        matchesMemberFilter(t.assignee_member_id, selectedMember)
      );
    }
    return result;
  }, [todosDueByDay, days, selectedMember]);

  const openTodos = useMemo(
    () => todos.filter((t) => !t.is_done && matchesMemberFilter(t.assignee_member_id, selectedMember)),
    [todos, selectedMember]
  );

  // Agrégat sur toute la semaine affichée (tâches récurrentes uniquement),
  // pour le bandeau de progression en haut de l'écran.
  const weekStats = useMemo(() => {
    let doneCount = 0;
    let pendingCount = 0;
    let pendingMinutes = 0;
    for (const day of days) {
      doneCount += (filteredDoneByDay[day] ?? []).length;
      const realTasks = (filteredOccurrencesByDay[day] ?? [])
        .filter((o) => o.isReal)
        .map((o) => o.task);
      pendingCount += realTasks.length;
      pendingMinutes += sumEstimatedMinutes(realTasks);
    }
    return { doneCount, pendingCount, pendingMinutes };
  }, [days, filteredDoneByDay, filteredOccurrencesByDay]);

  return (
    <div>
      <PersonFilter members={members} selected={selectedMember} onChange={setSelectedMember} />

      <WeekProgressHeader
        doneCount={weekStats.doneCount}
        pendingCount={weekStats.pendingCount}
        pendingMinutes={weekStats.pendingMinutes}
      />

      <div className="mb-5">
        <TodoSection
          todos={openTodos}
          members={members}
          householdId={householdId}
          currentMemberId={currentMemberId}
        />
      </div>

      <div className="space-y-5">
        {days.map((day) => {
          const dayOccurrences = filteredOccurrencesByDay[day] ?? [];
          const dayDone = filteredDoneByDay[day] ?? [];
          const dayTodosDone = filteredTodosDoneByDay[day] ?? [];
          const dayTodosDue = filteredTodosDueByDay[day] ?? [];
          const isToday = day === today;
          const dayLabel = formatFrenchWeekdayDate(day);
          const realTasks = dayOccurrences.filter((o) => o.isReal).map((o) => o.task);
          const previewTasks = dayOccurrences.filter((o) => !o.isReal).map((o) => o.task);
          const minutes = sumEstimatedMinutes(realTasks);
          const targetsExcludingThisDay = moveTargets.filter((t) => t.iso !== day);

          const doneItems: DoneItem[] = [
            ...dayDone.map(
              (c): DoneItem => ({
                id: c.id,
                taskName: c.task_name_snapshot,
                categoryName: c.category_name_snapshot ?? "Sans catégorie",
                completedByName: c.completed_by_name_snapshot,
                undo: day === today ? () => undoTaskCompletion(c.task_id!) : undefined,
                editDate: day === today ? (newDate) => updateCompletionDate(c.id, newDate) : undefined,
              })
            ),
            ...dayTodosDone.map(
              (t): DoneItem => ({
                id: t.id,
                taskName: t.name,
                categoryName: todoDoneLabel(t),
                isTodo: true,
                completedByName:
                  members.find((m) => m.id === t.completed_by_member_id)?.display_name ?? null,
                undo: day === today ? () => uncompleteTodo(t.id) : undefined,
              })
            ),
          ];

          return (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2
                  className={`text-sm font-semibold ${isToday ? "text-primary" : "text-muted"}`}
                >
                  {dayLabel}
                  {isToday && " · aujourd'hui"}
                </h2>
                {minutes > 0 && (
                  <span className="text-xs text-muted">≈ {formatMinutes(minutes)}</span>
                )}
              </div>
              {realTasks.length === 0 &&
              previewTasks.length === 0 &&
              doneItems.length === 0 &&
              dayTodosDue.length === 0 ? (
                <p className="text-sm text-muted/70">Rien de prévu</p>
              ) : (
                <div className="space-y-3">
                  {realTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentMemberId={currentMemberId}
                      moveTargets={targetsExcludingThisDay}
                      showPullToCurrentWeek={compareIsoDates(task.next_due_date, currentWeekEnd) > 0}
                    />
                  ))}

                  {dayTodosDue.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} currentMemberId={currentMemberId} />
                  ))}

                  <CollapsibleSection
                    title="Faites"
                    count={doneItems.length}
                    colorClass="text-success"
                  >
                    {doneItems.map((item) => (
                      <DoneCard key={item.id} item={item} />
                    ))}
                  </CollapsibleSection>

                  {previewTasks.map((task) => (
                    <PreviewOccurrenceCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
