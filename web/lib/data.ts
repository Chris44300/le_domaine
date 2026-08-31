import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type TaskWithRelations = Database["public"]["Tables"]["tasks"]["Row"] & {
  category: { id: string; name: string } | null;
  assignee: { id: string; display_name: string } | null;
};

const TASK_SELECT = `
  *,
  category:categories ( id, name ),
  assignee:members!tasks_assignee_member_id_fkey ( id, display_name )
`;

export async function getActiveTasks(
  supabase: Client,
  householdId: string
): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("next_due_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as TaskWithRelations[];
}

export async function getMembers(supabase: Client, householdId: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("household_id", householdId)
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCategories(supabase: Client, householdId: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCompletions(
  supabase: Client,
  householdId: string,
  { limit = 50 }: { limit?: number } = {}
) {
  const { data, error } = await supabase
    .from("completions")
    .select("*")
    .eq("household_id", householdId)
    .order("completed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** Complétions dont la date de réalisation tombe entre deux dates (incluses). */
export async function getCompletionsBetween(
  supabase: Client,
  householdId: string,
  startIso: string,
  endIso: string
) {
  const { data, error } = await supabase
    .from("completions")
    .select("*")
    .eq("household_id", householdId)
    .gte("completed_on", startIso)
    .lte("completed_on", endIso)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type TodoWithRelations = Database["public"]["Tables"]["todos"]["Row"] & {
  assignee: { id: string; display_name: string } | null;
};

const TODO_SELECT = `
  *,
  assignee:members!todos_assignee_member_id_fkey ( id, display_name )
`;

/**
 * "To do" pas encore faits — visibles tant qu'ils ne sont pas cochés, sans
 * notion de date. Les communes (pour tout le monde, non assignées)
 * viennent avant les personnelles, pour que chacun voie d'abord ce qui
 * concerne le foyer avant ses propres rappels.
 */
export async function getOpenTodos(
  supabase: Client,
  householdId: string
): Promise<TodoWithRelations[]> {
  const { data, error } = await supabase
    .from("todos")
    .select(TODO_SELECT)
    .eq("household_id", householdId)
    .eq("is_done", false)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const todos = (data ?? []) as unknown as TodoWithRelations[];

  // Array.prototype.sort est stable (garanti depuis ES2019) : l'ordre par
  // date de création à l'intérieur de chaque groupe (commune / personnelle)
  // est donc conservé.
  return [...todos].sort((a, b) => {
    const aIsShared = a.assignee_member_id === null ? 0 : 1;
    const bIsShared = b.assignee_member_id === null ? 0 : 1;
    return aIsShared - bIsShared;
  });
}

/** "To do" cochés dans une période — pour les afficher dans "Fait" (Aujourd'hui et Semaine). */
export async function getTodosCompletedBetween(
  supabase: Client,
  householdId: string,
  startIso: string,
  endIso: string
): Promise<TodoWithRelations[]> {
  const { data, error } = await supabase
    .from("todos")
    .select(TODO_SELECT)
    .eq("household_id", householdId)
    .eq("is_done", true)
    .gte("completed_on", startIso)
    .lte("completed_on", endIso);

  if (error) throw error;
  return (data ?? []) as unknown as TodoWithRelations[];
}

/** "To do" cochés un jour donné — pour les afficher parmi "Fait aujourd'hui" avant qu'ils ne disparaissent. */
export function getTodosCompletedOn(supabase: Client, householdId: string, dateIso: string) {
  return getTodosCompletedBetween(supabase, householdId, dateIso, dateIso);
}

/**
 * Ne garde qu'une complétion par tâche (la plus récente) — évite qu'une
 * tâche apparaisse deux fois "faite" si elle a été cochée en double par
 * accident depuis deux téléphones à quelques secondes d'écart.
 */
export function dedupeCompletionsByTask<T extends { task_id: string | null; id: string }>(
  completions: T[]
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const c of completions) {
    const key = c.task_id ?? c.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
}
