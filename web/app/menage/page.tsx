import { requireCurrentMember } from "@/lib/current-member";
import {
  dedupeCompletionsByTask,
  getActiveTasks,
  getCompletionsBetween,
  getMembers,
  getOpenTodos,
  getTodosCompletedOn,
} from "@/lib/data";
import { todayIso } from "@/lib/dates";
import { isDue } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/server";
import { TodayList } from "./today-list";

export default async function MenagePage() {
  const member = await requireCurrentMember();
  const supabase = await createClient();
  const today = todayIso();

  const [tasks, completionsToday, members, openTodos, todosDoneToday] = await Promise.all([
    getActiveTasks(supabase, member.householdId),
    getCompletionsBetween(supabase, member.householdId, today, today),
    getMembers(supabase, member.householdId),
    getOpenTodos(supabase, member.householdId),
    getTodosCompletedOn(supabase, member.householdId, today),
  ]);

  const dueTasks = tasks.filter((t) => isDue(t.next_due_date, today));
  const doneToday = dedupeCompletionsByTask(completionsToday);
  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Aujourd&apos;hui</h1>
        <p className="text-sm text-muted">Bonjour {member.displayName} 👋</p>
      </header>

      <TodayList
        initialTasks={dueTasks}
        doneToday={doneToday}
        openTodos={openTodos}
        todosDoneToday={todosDoneToday}
        members={activeMembers}
        householdId={member.householdId}
        currentMemberId={member.id}
        today={today}
      />
    </div>
  );
}
