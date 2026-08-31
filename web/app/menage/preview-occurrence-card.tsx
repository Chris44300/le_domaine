import { categoryIcon } from "@/lib/category-icons";
import { formatRecurrenceLabel, frequencyGroup } from "@/lib/recurrence";
import type { TaskWithRelations } from "@/lib/data";

/**
 * Occurrence future projetée (pas la vraie échéance actuelle) : simple
 * aperçu, sans aucune action, pour montrer qu'une tâche récurrente
 * reviendra bien — volontairement non actionnable pour ne pas laisser
 * croire qu'on peut "pré-valider" ou "avancer" un cycle indépendamment du
 * suivant (voir projectOccurrences). Pour avancer une tâche à cette
 * semaine, voir le bouton dédié sur sa carte réelle (TaskCard).
 */
export function PreviewOccurrenceCard({ task }: { task: TaskWithRelations }) {
  const group = frequencyGroup(task.recurrence_days);
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-3 opacity-70">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
        <span aria-hidden>{categoryIcon(task.category?.name)}</span>
        {task.category?.name ?? "Sans catégorie"} · {formatRecurrenceLabel(task.recurrence_days)}
        <span className="ml-1 rounded-full bg-border px-1.5 py-0.5 text-[10px]">prévision</span>
      </span>
      <p className="mt-1 text-sm text-foreground">{task.name}</p>
      {group === "T" && (
        <p className="mt-0.5 text-[11px] text-muted">
          Cette date se décalera si l&apos;occurrence précédente est faite plus tôt ou plus tard.
        </p>
      )}
    </div>
  );
}
