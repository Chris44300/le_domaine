"use client";

import { useRouter } from "next/navigation";
import { resetHouseholdHistory } from "@/lib/task-actions";
import { ConfirmingButton } from "./confirming-action";

export function DangerZone({ householdId }: { householdId: string }) {
  const router = useRouter();

  async function handleReset() {
    await resetHouseholdHistory(householdId);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-urgent/30 bg-urgent-soft/40 p-4">
      <p className="text-sm font-medium text-foreground">Réinitialiser l&apos;historique</p>
      <p className="mt-1 text-xs text-muted">
        Efface définitivement tout l&apos;historique des tâches faites et remet chaque tâche
        récurrente à &laquo;&nbsp;jamais faite&nbsp;&raquo;. Les tâches, catégories et personnes ne sont pas touchées.
        Utile pour repartir sur une base propre après des essais.
      </p>
      <ConfirmingButton
        action={handleReset}
        confirmMessage="Effacer tout l'historique et remettre les tâches à zéro ? Cette action est irréversible."
        className="mt-3 w-full rounded-lg border border-urgent/40 bg-surface py-2.5 text-sm font-semibold text-urgent"
      >
        Réinitialiser l&apos;historique
      </ConfirmingButton>
    </div>
  );
}
