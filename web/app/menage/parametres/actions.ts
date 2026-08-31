"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentMember } from "@/lib/current-member";
import { createClient } from "@/lib/supabase/server";

function revalidateAppPages() {
  revalidatePath("/menage/parametres");
  revalidatePath("/menage");
  revalidatePath("/menage/semaine");
}

// ----------------------------- Personnes -----------------------------

export async function addMember(formData: FormData) {
  const member = await requireCurrentMember();
  const supabase = await createClient();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!displayName) throw new Error("Le nom est obligatoire.");

  const { error } = await supabase.from("members").insert({
    household_id: member.householdId,
    display_name: displayName,
    email: email || null,
  });
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

export async function setMemberActive(memberId: string, isActive: boolean) {
  await requireCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ is_active: isActive })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

// ----------------------------- Catégories -----------------------------

export async function addCategory(formData: FormData) {
  const member = await requireCurrentMember();
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Le nom est obligatoire.");

  const { error } = await supabase.from("categories").insert({
    household_id: member.householdId,
    name,
  });
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

export async function setCategoryActive(categoryId: string, isActive: boolean) {
  await requireCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", categoryId);
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

// ----------------------------- Tâches -----------------------------

export async function addTask(formData: FormData) {
  const member = await requireCurrentMember();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const assigneeId = String(formData.get("assignee_member_id") ?? "") || null;
  const recurrenceDays = Number(formData.get("recurrence_days"));
  const estimatedMinutes = parseEstimatedMinutes(formData.get("estimated_minutes"));

  if (!name) throw new Error("Le nom est obligatoire.");
  if (!Number.isInteger(recurrenceDays) || recurrenceDays < 1) {
    throw new Error("La fréquence doit être un nombre entier de jours >= 1.");
  }

  const { error } = await supabase.from("tasks").insert({
    household_id: member.householdId,
    name,
    category_id: categoryId,
    assignee_member_id: assigneeId,
    recurrence_days: recurrenceDays,
    estimated_minutes: estimatedMinutes,
  });
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

function parseEstimatedMinutes(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("Le temps estimé doit être un nombre entier de minutes >= 1.");
  }
  return n;
}

export async function updateTask(taskId: string, formData: FormData) {
  await requireCurrentMember();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const assigneeId = String(formData.get("assignee_member_id") ?? "") || null;
  const recurrenceDays = Number(formData.get("recurrence_days"));
  const notes = String(formData.get("notes") ?? "").trim();
  const forcedNextDate = String(formData.get("forced_next_date") ?? "") || null;
  const estimatedMinutes = parseEstimatedMinutes(formData.get("estimated_minutes"));

  if (!name) throw new Error("Le nom est obligatoire.");
  if (!Number.isInteger(recurrenceDays) || recurrenceDays < 1) {
    throw new Error("La fréquence doit être un nombre entier de jours >= 1.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      name,
      category_id: categoryId,
      assignee_member_id: assigneeId,
      recurrence_days: recurrenceDays,
      notes: notes || null,
      snoozed_until: forcedNextDate,
      estimated_minutes: estimatedMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

export async function setTaskActive(taskId: string, isActive: boolean) {
  await requireCurrentMember();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_active: isActive })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

export async function deleteTaskPermanently(taskId: string) {
  await requireCurrentMember();
  const supabase = await createClient();
  // L'historique (completions) garde ses propres copies figées du nom, donc
  // supprimer la tâche ne perd aucune donnée d'historique déjà écrite
  // (completions.task_id passe simplement à NULL, voir schema.sql).
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidateAppPages();
}

// Notifications push volontairement absentes ici (voir page.tsx) - pas de
// savePushSubscription/removePushSubscription tant que Domaine n'a pas son
// propre service worker.
