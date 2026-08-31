import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/dates";

export async function createTodo(
  householdId: string,
  name: string,
  assigneeMemberId: string | null,
  createdByMemberId: string
) {
  const supabase = createClient();
  const { error } = await supabase.from("todos").insert({
    household_id: householdId,
    name,
    assignee_member_id: assigneeMemberId,
    created_by_member_id: createdByMemberId,
  });
  if (error) throw error;
}

export async function completeTodo(todoId: string, completedByMemberId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("todos")
    .update({
      is_done: true,
      completed_by_member_id: completedByMemberId,
      completed_on: todayIso(),
    })
    .eq("id", todoId);
  if (error) throw error;
}

export async function uncompleteTodo(todoId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("todos")
    .update({ is_done: false, completed_by_member_id: null, completed_on: null })
    .eq("id", todoId);
  if (error) throw error;
}

/** Associe (ou retire, avec `date = null`) une date précise à une To do, après coup. */
export async function setTodoDate(todoId: string, date: string | null) {
  const supabase = createClient();
  const { error } = await supabase.from("todos").update({ due_date: date }).eq("id", todoId);
  if (error) throw error;
}

export async function deleteTodo(todoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("todos").delete().eq("id", todoId);
  if (error) throw error;
}
