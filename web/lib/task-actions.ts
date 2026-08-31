import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/dates";

export async function markTaskDone(taskId: string, completedByMemberId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("complete_task", {
    p_task_id: taskId,
    p_completed_on: todayIso(),
    p_completed_by_member_id: completedByMemberId,
  });
  if (error) throw error;
}

export async function snoozeTaskBy(taskId: string, days: number) {
  const supabase = createClient();
  const { error } = await supabase.rpc("snooze_task", {
    p_task_id: taskId,
    p_days: days,
  });
  if (error) throw error;
}

export async function moveTaskTo(taskId: string, date: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("move_task_to", {
    p_task_id: taskId,
    p_date: date,
  });
  if (error) throw error;
}

/** N'annule que la complétion du jour même (voir garde-fou côté RPC). */
export async function undoTaskCompletion(taskId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("undo_last_completion", {
    p_task_id: taskId,
    p_today: todayIso(),
  });
  if (error) throw error;
}

/**
 * Corrige la date réelle d'une complétion déjà enregistrée (ex. cochée
 * aujourd'hui par erreur alors qu'elle a été faite hier). Ne fonctionne que
 * sur la complétion la plus récente d'une tâche (voir garde-fou côté RPC),
 * pour ne jamais dérégler une chaîne d'historique déjà consolidée.
 */
export async function updateCompletionDate(completionId: string, newDate: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_completion_date", {
    p_completion_id: completionId,
    p_new_date: newDate,
    p_today: todayIso(),
  });
  if (error) throw error;
}

export async function resetHouseholdHistory(householdId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_household_history", {
    p_household_id: householdId,
  });
  if (error) throw error;
}
