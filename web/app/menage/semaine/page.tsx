import Link from "next/link";
import { requireCurrentMember } from "@/lib/current-member";
import {
  dedupeCompletionsByTask,
  getActiveTasks,
  getCompletionsBetween,
  getMembers,
  getOpenTodos,
  getTodosCompletedBetween,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatFrenchWeekdayDate, formatFrenchWeekdayShort, startOfIsoWeek, todayIso } from "@/lib/dates";
import { projectOccurrences } from "@/lib/recurrence";
import type { TaskWithRelations } from "@/lib/data";
import { WeekList } from "./week-list";

export default async function SemainePage({ searchParams }: PageProps<"/menage/semaine">) {
  const params = await searchParams;
  const member = await requireCurrentMember();
  const supabase = await createClient();

  const requested = typeof params.semaine === "string" ? params.semaine : todayIso();
  const weekStart = startOfIsoWeek(requested);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const [tasks, doneInPeriod, members, todos, todosDoneInPeriod] = await Promise.all([
    getActiveTasks(supabase, member.householdId),
    // Classé par date RÉELLE de réalisation (pas la date prévue) : une tâche
    // validée aujourd'hui doit apparaître aujourd'hui, jamais à son échéance
    // d'origine si elle a été faite en avance ou en retard.
    getCompletionsBetween(supabase, member.householdId, weekStart, weekEnd),
    getMembers(supabase, member.householdId),
    getOpenTodos(supabase, member.householdId),
    getTodosCompletedBetween(supabase, member.householdId, weekStart, weekEnd),
  ]);

  // Occurrence réelle (actionnable) + projections en aperçu pour les
  // rendez-vous suivants qui tombent dans la semaine affichée.
  const occurrencesByDay: Record<string, { task: TaskWithRelations; isReal: boolean }[]> = {};
  for (const d of days) occurrencesByDay[d] = [];

  for (const task of tasks) {
    const occurrences = projectOccurrences(task.next_due_date, task.recurrence_days, weekStart, weekEnd);
    for (const occ of occurrences) {
      occurrencesByDay[occ.date]?.push({ task, isReal: occ.isReal });
    }
  }

  const doneByDay: Record<string, typeof doneInPeriod> = {};
  const todosDoneByDay: Record<string, typeof todosDoneInPeriod> = {};
  const todosDueByDay: Record<string, typeof todos> = {};
  for (const d of days) {
    doneByDay[d] = dedupeCompletionsByTask(doneInPeriod.filter((c) => c.completed_on === d));
    todosDoneByDay[d] = todosDoneInPeriod.filter((t) => t.completed_on === d);
    todosDueByDay[d] = todos.filter((t) => t.due_date === d);
  }

  const moveTargets = days.map((d) => ({ iso: d, label: formatFrenchWeekdayShort(d) }));

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const currentWeekStart = startOfIsoWeek(todayIso());

  return (
    <div className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Semaine</h1>
        <p className="text-sm text-muted">
          {formatFrenchWeekdayDate(weekStart)} → {formatFrenchWeekdayDate(days[6])}
        </p>
      </header>

      <div className="mb-5 flex gap-2">
        <Link
          href={`/menage/semaine?semaine=${prevWeek}`}
          className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-center text-sm font-medium text-foreground active:scale-[0.98]"
        >
          ← Précédente
        </Link>
        <Link
          href={`/menage/semaine?semaine=${currentWeekStart}`}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center text-sm font-medium text-foreground active:scale-[0.98]"
        >
          Aujourd&apos;hui
        </Link>
        <Link
          href={`/menage/semaine?semaine=${nextWeek}`}
          className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-center text-sm font-medium text-foreground active:scale-[0.98]"
        >
          Suivante →
        </Link>
      </div>

      <WeekList
        days={days}
        occurrencesByDay={occurrencesByDay}
        doneByDay={doneByDay}
        todosDoneByDay={todosDoneByDay}
        todosDueByDay={todosDueByDay}
        todos={todos}
        moveTargets={moveTargets}
        members={members.filter((m) => m.is_active)}
        householdId={member.householdId}
        currentMemberId={member.id}
        today={todayIso()}
      />
    </div>
  );
}
