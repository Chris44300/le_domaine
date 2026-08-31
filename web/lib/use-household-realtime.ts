"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Se réabonne aux changements de tâches/complétions du foyer et rafraîchit
 * les données de la page (via le routeur Next) dès que Chris ou Mel change
 * quelque chose depuis un autre téléphone. Volontairement simple : on
 * refait confiance au serveur plutôt que de essayer de fusionner l'état à la
 * main, ce qui serait plus fragile pour un foyer de 2-3 personnes.
 */
export function useHouseholdRealtime(householdId: string) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`household-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "completions",
          filter: `household_id=eq.${householdId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `household_id=eq.${householdId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, router]);
}
