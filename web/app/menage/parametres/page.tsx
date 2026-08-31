import { requireCurrentMember } from "@/lib/current-member";
import { formatRecurrenceLabel } from "@/lib/recurrence";
import { createClient } from "@/lib/supabase/server";
import type { TaskWithRelations } from "@/lib/data";
import { MemberBadge } from "../member-badge";
import {
  addCategory,
  addMember,
  addTask,
  deleteTaskPermanently,
  setCategoryActive,
  setMemberActive,
  setTaskActive,
  updateTask,
} from "./actions";
import { ConfirmingButton, ConfirmingForm } from "./confirming-action";
import { DangerZone } from "./danger-zone";

export default async function ParametresPage() {
  const member = await requireCurrentMember();
  const supabase = await createClient();

  const [{ data: members }, { data: categories }, { data: tasks }] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("household_id", member.householdId)
      .order("display_name"),
    supabase
      .from("categories")
      .select("*")
      .eq("household_id", member.householdId)
      .order("name"),
    supabase
      .from("tasks")
      .select(
        "*, category:categories ( id, name ), assignee:members!tasks_assignee_member_id_fkey ( id, display_name )"
      )
      .eq("household_id", member.householdId)
      .order("name"),
  ]);

  const allMembers = members ?? [];
  const allCategories = categories ?? [];
  const allTasks = (tasks ?? []) as unknown as TaskWithRelations[];

  return (
    <div className="px-4 pt-6 pb-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Réglages</h1>
        <p className="text-sm text-muted">Personnes, catégories et tâches du foyer</p>
      </header>

      {/* Notifications push volontairement absentes ici : elles dependent
          d'un service worker propre a l'origine du site (celui de Menage,
          pas encore celui de Domaine) - a construire separement si besoin. */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Notifications</h2>
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">
          Pas encore disponibles ici (dépend d&apos;une configuration propre à
          Domaine, pas encore faite) — toujours actives sur l&apos;app Ménage
          d&apos;origine en attendant.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Personnes</h2>
        <div className="space-y-2">
          {allMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="font-medium text-foreground">
                  <MemberBadge memberId={m.id} displayName={m.display_name} />
                </p>
                <p className="text-xs text-muted">{m.email ?? "sans email"}</p>
              </div>
              <ConfirmingButton
                action={setMemberActive.bind(null, m.id, !m.is_active)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  m.is_active ? "bg-success-soft text-success" : "bg-border text-muted"
                }`}
              >
                {m.is_active ? "Actif" : "Inactif"}
              </ConfirmingButton>
            </div>
          ))}
        </div>

        <details className="mt-3 rounded-xl border border-dashed border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            + Ajouter une personne
          </summary>
          <ConfirmingForm action={addMember} className="mt-3 space-y-2">
            <input
              name="display_name"
              placeholder="Prénom"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <input
              name="email"
              type="email"
              placeholder="Email (pour la connexion)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ajouter
            </button>
          </ConfirmingForm>
        </details>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Catégories</h2>
        <div className="flex flex-wrap gap-2">
          {allCategories.map((c) => (
            <ConfirmingButton
              key={c.id}
              action={setCategoryActive.bind(null, c.id, !c.is_active)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                c.is_active ? "bg-info-soft text-foreground" : "bg-border text-muted line-through"
              }`}
            >
              {c.name}
            </ConfirmingButton>
          ))}
        </div>

        <details className="mt-3 rounded-xl border border-dashed border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            + Ajouter une catégorie
          </summary>
          <ConfirmingForm action={addCategory} className="mt-3 flex gap-2">
            <input
              name="name"
              placeholder="Nom de la catégorie"
              required
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ajouter
            </button>
          </ConfirmingForm>
        </details>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tâches</h2>
        <div className="space-y-2">
          {allTasks.map((task) => (
            <details
              key={task.id}
              className={`rounded-xl border border-border bg-surface px-4 py-3 ${
                task.is_active ? "" : "opacity-60"
              }`}
            >
              <summary className="cursor-pointer">
                <span className="font-medium text-foreground">{task.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {task.category?.name ?? "Sans catégorie"} · {formatRecurrenceLabel(task.recurrence_days)}
                  {task.estimated_minutes ? ` · ${task.estimated_minutes} min` : ""}
                  {task.assignee && ` · ${task.assignee.display_name}`}
                  {!task.is_active && " · archivée"}
                </span>
              </summary>

              <ConfirmingForm
                action={updateTask.bind(null, task.id)}
                className="mt-3 space-y-2 border-t border-border pt-3"
                resetOnSuccess={false}
              >
                <label className="block text-xs font-medium text-muted">Nom</label>
                <input
                  name="name"
                  defaultValue={task.name}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <label className="block text-xs font-medium text-muted">Catégorie</label>
                <select
                  name="category_id"
                  defaultValue={task.category_id ?? ""}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sans catégorie</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label className="block text-xs font-medium text-muted">
                  Fréquence (tous les combien de jours)
                </label>
                <input
                  name="recurrence_days"
                  type="number"
                  min={1}
                  defaultValue={task.recurrence_days}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <label className="block text-xs font-medium text-muted">
                  Assigné à (facultatif)
                </label>
                <select
                  name="assignee_member_id"
                  defaultValue={task.assignee_member_id ?? ""}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Personne</option>
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>

                <label className="block text-xs font-medium text-muted">
                  Temps estimé en minutes (facultatif)
                </label>
                <input
                  name="estimated_minutes"
                  type="number"
                  min={1}
                  defaultValue={task.estimated_minutes ?? ""}
                  placeholder="Ex. 15"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <label className="block text-xs font-medium text-muted">
                  Forcer la prochaine date (facultatif)
                </label>
                <input
                  name="forced_next_date"
                  type="date"
                  defaultValue={task.snoozed_until ?? ""}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <label className="block text-xs font-medium text-muted">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={task.notes ?? ""}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <button
                  type="submit"
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Enregistrer
                </button>
              </ConfirmingForm>

              <div className="mt-2 flex gap-2">
                <ConfirmingButton
                  action={setTaskActive.bind(null, task.id, !task.is_active)}
                  className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-foreground"
                >
                  {task.is_active ? "Archiver" : "Réactiver"}
                </ConfirmingButton>
                <ConfirmingButton
                  action={deleteTaskPermanently.bind(null, task.id)}
                  confirmMessage={`Supprimer définitivement "${task.name}" ? L'historique déjà enregistré sera conservé.`}
                  className="flex-1 rounded-lg border border-warning/40 py-2 text-xs font-medium text-warning"
                >
                  Supprimer
                </ConfirmingButton>
              </div>
            </details>
          ))}
        </div>

        <details className="mt-3 rounded-xl border border-dashed border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            + Ajouter une tâche
          </summary>
          <ConfirmingForm action={addTask} className="mt-3 space-y-2">
            <input
              name="name"
              placeholder="Nom de la tâche"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <select
              name="category_id"
              defaultValue=""
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Sans catégorie</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="recurrence_days"
              type="number"
              min={1}
              placeholder="Fréquence en jours (ex. 7)"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <select
              name="assignee_member_id"
              defaultValue=""
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="">Personne</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                </option>
              ))}
            </select>
            <input
              name="estimated_minutes"
              type="number"
              min={1}
              placeholder="Temps estimé en minutes (facultatif)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ajouter
            </button>
          </ConfirmingForm>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Zone dangereuse</h2>
        <DangerZone householdId={member.householdId} />
      </section>
    </div>
  );
}
