import Link from "next/link";
import { requireCurrentMember } from "@/lib/current-member";
import { getCompletions, getCompletionsBetween, getMembers } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatFrenchWeekdayDate, todayIso } from "@/lib/dates";
import type { TaskWithRelations } from "@/lib/data";
import { Statistiques } from "./statistiques";

const PERIODS = [7, 30, 90] as const;

export default async function HistoriquePage({
  searchParams,
}: PageProps<"/menage/historique">) {
  const params = await searchParams;
  const member = await requireCurrentMember();

  const vue = params.vue === "statistiques" ? "statistiques" : "journal";
  const periode = PERIODS.includes(Number(params.periode) as (typeof PERIODS)[number])
    ? Number(params.periode)
    : 30;

  return (
    <div className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Historique</h1>
      </header>

      <div className="mb-5 flex gap-2">
        <Link
          href="/menage/historique?vue=journal"
          className={`flex-1 rounded-xl border py-2.5 text-center text-sm font-medium active:scale-[0.98] ${
            vue === "journal"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground"
          }`}
        >
          Journal
        </Link>
        <Link
          href="/menage/historique?vue=statistiques"
          className={`flex-1 rounded-xl border py-2.5 text-center text-sm font-medium active:scale-[0.98] ${
            vue === "statistiques"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground"
          }`}
        >
          Statistiques
        </Link>
      </div>

      {vue === "journal" ? (
        <Journal householdId={member.householdId} />
      ) : (
        <StatistiquesSection householdId={member.householdId} periode={periode} />
      )}
    </div>
  );
}

async function Journal({ householdId }: { householdId: string }) {
  const supabase = await createClient();
  const completions = await getCompletions(supabase, householdId, { limit: 100 });

  const byDate = new Map<string, typeof completions>();
  for (const c of completions) {
    const list = byDate.get(c.completed_on) ?? [];
    list.push(c);
    byDate.set(c.completed_on, list);
  }

  if (completions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">Rien n&apos;a encore été marqué comme fait.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Les 100 dernières tâches réalisées</p>
      {[...byDate.entries()].map(([date, items]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold text-muted">
            {formatFrenchWeekdayDate(date)}
          </h2>
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{c.task_name_snapshot}</p>
                  <span className="shrink-0 text-xs text-success">✓ Fait</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {c.category_name_snapshot ?? "Sans catégorie"}
                  {c.completed_by_name_snapshot && ` · par ${c.completed_by_name_snapshot}`}
                  {c.due_date && c.due_date !== c.completed_on && (
                    <> · prévu le {formatFrenchWeekdayDate(c.due_date)}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

async function StatistiquesSection({
  householdId,
  periode,
}: {
  householdId: string;
  periode: number;
}) {
  const supabase = await createClient();
  const today = todayIso();
  const start = addDays(today, -(periode - 1));

  const [completions, members, { data: tasks }] = await Promise.all([
    getCompletionsBetween(supabase, householdId, start, today),
    getMembers(supabase, householdId),
    supabase
      .from("tasks")
      .select(
        "*, category:categories ( id, name ), assignee:members!tasks_assignee_member_id_fkey ( id, display_name )"
      )
      .eq("household_id", householdId)
      .order("name"),
  ]);

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/menage/historique?vue=statistiques&periode=${p}`}
            className={`flex-1 rounded-xl border py-2 text-center text-xs font-medium active:scale-[0.98] ${
              p === periode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted"
            }`}
          >
            {p} jours
          </Link>
        ))}
      </div>

      <Statistiques
        completions={completions}
        tasks={(tasks ?? []) as unknown as TaskWithRelations[]}
        members={members}
        periodDays={periode}
      />
    </div>
  );
}
