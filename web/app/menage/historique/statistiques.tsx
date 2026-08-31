import { formatMinutes } from "@/lib/format";
import { formatRecurrenceLabel } from "@/lib/recurrence";
import type { Database } from "@/lib/supabase/database.types";
import { MemberBadge } from "../member-badge";

type Completion = Database["public"]["Tables"]["completions"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  category: { id: string; name: string } | null;
  assignee: { id: string; display_name: string } | null;
};
type Member = Database["public"]["Tables"]["members"]["Row"];

function groupCount<T>(items: T[], keyOf: (item: T) => string | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item) ?? "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function Statistiques({
  completions,
  tasks,
  members,
  periodDays,
}: {
  completions: Completion[];
  tasks: Task[];
  members: Member[];
  periodDays: number;
}) {
  const totalCompletions = completions.length;
  const totalMinutes = completions.reduce(
    (sum, c) => sum + (c.estimated_minutes_snapshot ?? 0),
    0
  );

  const byPerson = groupCount(completions, (c) => c.completed_by_name_snapshot);
  const minutesByPerson = new Map<string, number>();
  for (const c of completions) {
    const key = c.completed_by_name_snapshot ?? "—";
    minutesByPerson.set(key, (minutesByPerson.get(key) ?? 0) + (c.estimated_minutes_snapshot ?? 0));
  }

  const byCategory = groupCount(completions, (c) => c.category_name_snapshot);
  const sortedCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const sortedPeople = [...byPerson.entries()].sort((a, b) => b[1] - a[1]);

  const mostSnoozed = [...tasks]
    .filter((t) => t.snooze_count > 0)
    .sort((a, b) => b.snooze_count - a.snooze_count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCompletions}</p>
          <p className="text-xs text-muted">tâches faites ({periodDays} j)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{formatMinutes(totalMinutes)}</p>
          <p className="text-xs text-muted">temps estimé passé</p>
        </div>
      </section>

      {sortedPeople.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Qui fait quoi</h2>
          <div className="space-y-2">
            {sortedPeople.map(([name, count]) => {
              const member = members.find((m) => m.display_name === name);
              const minutes = minutesByPerson.get(name) ?? 0;
              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
                >
                  {member ? (
                    <MemberBadge memberId={member.id} displayName={member.display_name} />
                  ) : (
                    <span className="text-sm text-foreground">{name}</span>
                  )}
                  <span className="text-sm text-muted">
                    {count} tâche{count > 1 ? "s" : ""}
                    {minutes > 0 && ` · ${formatMinutes(minutes)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sortedCategories.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Par catégorie</h2>
          <div className="flex flex-wrap gap-2">
            {sortedCategories.map(([name, count]) => (
              <span
                key={name}
                className="rounded-full bg-info-soft px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {name} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {mostSnoozed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Tâches les plus reportées (total cumulé)
          </h2>
          <div className="space-y-2">
            {mostSnoozed.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="text-sm text-foreground">{t.name}</span>
                <span className="text-sm text-warning">
                  reportée {t.snooze_count} fois
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Toutes les tâches</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Tâche</th>
                <th className="px-3 py-2 font-medium">Fréquence</th>
                <th className="px-3 py-2 font-medium">Temps</th>
                <th className="px-3 py-2 font-medium">Assignée</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={`border-t border-border ${t.is_active ? "" : "opacity-50"}`}>
                  <td className="px-3 py-2 text-foreground">{t.name}</td>
                  <td className="px-3 py-2 text-muted">{formatRecurrenceLabel(t.recurrence_days)}</td>
                  <td className="px-3 py-2 text-muted">
                    {t.estimated_minutes ? formatMinutes(t.estimated_minutes) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">{t.assignee?.display_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
