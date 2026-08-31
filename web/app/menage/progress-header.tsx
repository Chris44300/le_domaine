import { formatMinutes } from "@/lib/format";

/**
 * Bandeau agrégé pour la vue Semaine (toute la semaine affichée, pas un
 * jour en particulier) — ne compte que les tâches récurrentes, comme
 * `ProgressHeader` sur "Aujourd'hui" (les "To do" ponctuelles n'ont pas
 * d'estimation de temps et ne sont pas comptées ici).
 */
export function WeekProgressHeader({
  doneCount,
  pendingCount,
  pendingMinutes,
}: {
  doneCount: number;
  pendingCount: number;
  pendingMinutes: number;
}) {
  const total = doneCount + pendingCount;
  if (total === 0) return null;

  const percent = Math.round((doneCount / total) * 100);

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {doneCount}/{total} tâches effectuées
        </p>
        <p className="text-sm font-semibold text-success">{percent}% d&apos;effectué !</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-success transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {pendingMinutes > 0 && (
        <p className="mt-2 text-xs text-muted">
          ⏱ Temps restant estimé : {formatMinutes(pendingMinutes)}
        </p>
      )}
    </div>
  );
}

export function ProgressHeader({
  doneCount,
  pendingCount,
  pendingMinutes,
}: {
  doneCount: number;
  pendingCount: number;
  pendingMinutes: number;
}) {
  const total = doneCount + pendingCount;
  if (total === 0) return null;

  const percent = Math.round((doneCount / total) * 100);

  let message: string;
  if (pendingCount === 0) {
    message = "Toutes les tâches sont faites aujourd'hui 🎉";
  } else if (pendingCount === 1) {
    message = "Une dernière tâche !";
  } else {
    message = `${doneCount}/${total} tâches faites`;
  }

  return (
    <div className="mb-5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{message}</p>
        {pendingMinutes > 0 && (
          <p className="text-xs text-muted">≈ {formatMinutes(pendingMinutes)} restantes</p>
        )}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-success transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
