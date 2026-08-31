/**
 * Moteur de récurrence des tâches ménagères.
 *
 * Modèle repris de l'organisateur Excel d'origine, simplifié :
 * - une tâche a une fréquence en nombre de jours ("tous les N jours") ;
 * - sa prochaine échéance = date de dernière réalisation + fréquence,
 *   SAUF s'il existe une date "reportée" (snoozedUntil), qui prend le dessus ;
 * - marquer une tâche "Fait" fixe la dernière réalisation à la date choisie
 *   et efface tout report en attente ;
 * - reporter une tâche ne touche jamais la dernière réalisation : elle ne
 *   change que la prochaine échéance, donc ne casse pas le cycle normal.
 *
 * Toutes les fonctions ici sont pures (aucun accès réseau/DB) pour rester
 * faciles à tester et à faire évoluer sans risque.
 *
 * Important : la même formule est implémentée en SQL comme colonne générée
 * `tasks.next_due_date` (voir supabase/schema.sql) pour que le tri/filtre
 * "qu'est-ce qui est dû ?" se fasse efficacement côté base de données. Les
 * deux doivent rester en accord — si vous changez la formule ici, reportez
 * le changement dans supabase/schema.sql.
 */

import { addDays, compareIsoDates, type IsoDate } from "./dates";

export const DEFAULT_SNOOZE_DAYS = 7;

/** Groupe d'affichage dérivé de la fréquence, repris de l'Excel (H/M/T). */
export type FrequencyGroup = "H" | "M" | "T";

export function frequencyGroup(recurrenceDays: number): FrequencyGroup {
  if (recurrenceDays <= 7) return "H";
  if (recurrenceDays <= 35) return "M";
  return "T";
}

/**
 * Libellé humain pour une fréquence. Utilise les mots usuels (mensuelle,
 * trimestrielle...) seulement pour les cycles ronds où ils sont exacts et
 * donc jamais trompeurs ; pour tout le reste (ex. tous les 10 jours), garde
 * le nombre de jours littéral plutôt qu'un seuil fixe qui classerait à tort
 * "10 jours" dans la même case que "28 jours".
 */
export function formatRecurrenceLabel(recurrenceDays: number): string {
  if (recurrenceDays === 1) return "chaque jour";
  if (recurrenceDays === 7) return "chaque semaine";
  if (recurrenceDays === 14) return "toutes les 2 semaines";
  if (recurrenceDays === 21) return "toutes les 3 semaines";
  if (recurrenceDays === 28) return "mensuelle";
  if (recurrenceDays === 84) return "trimestrielle";
  return `tous les ${recurrenceDays} j`;
}

export interface TaskScheduleState {
  /** Fréquence en jours entre deux réalisations (doit être un entier >= 1). */
  recurrenceDays: number;
  /** Dernière date à laquelle la tâche a été marquée "Fait", ou null si jamais faite. */
  lastCompletedOn: IsoDate | null;
  /** Date de report manuel en cours, ou null si aucun report actif. */
  snoozedUntil: IsoDate | null;
  /**
   * Date de repli utilisée si la tâche n'a jamais été faite (typiquement sa
   * date de création). Garantit qu'une tâche toute neuve a toujours une
   * prochaine échéance calculable.
   */
  createdOn: IsoDate;
}

/** Calcule la prochaine échéance d'une tâche à partir de son état. */
export function computeNextDueDate(state: TaskScheduleState): IsoDate {
  if (state.recurrenceDays < 1 || !Number.isInteger(state.recurrenceDays)) {
    throw new Error("recurrenceDays doit être un entier >= 1");
  }
  if (state.snoozedUntil) {
    return state.snoozedUntil;
  }
  const anchor = state.lastCompletedOn ?? state.createdOn;
  return addDays(anchor, state.recurrenceDays);
}

/** Une tâche est due si sa prochaine échéance est aujourd'hui ou déjà passée. */
export function isDue(nextDueDate: IsoDate, onDate: IsoDate): boolean {
  return compareIsoDates(nextDueDate, onDate) <= 0;
}

export interface CompleteTaskResult {
  lastCompletedOn: IsoDate;
  snoozedUntil: null;
}

/**
 * Marque une tâche comme faite à la date donnée.
 *
 * Règle : si la tâche avait déjà été marquée faite à une date plus récente
 * que `completedOn` (ex. double-clic depuis deux téléphones, l'un avec une
 * horloge légèrement différente), on ne fait jamais reculer la dernière
 * réalisation — on garde la plus récente des deux. Le report en cours est
 * toujours effacé : une tâche faite n'a plus de raison d'être reportée.
 */
export function completeTask(
  state: Pick<TaskScheduleState, "lastCompletedOn">,
  completedOn: IsoDate
): CompleteTaskResult {
  const lastCompletedOn = state.lastCompletedOn
    ? (compareIsoDates(completedOn, state.lastCompletedOn) > 0
        ? completedOn
        : state.lastCompletedOn)
    : completedOn;
  return { lastCompletedOn, snoozedUntil: null };
}

export interface SnoozeTaskResult {
  snoozedUntil: IsoDate;
}

/**
 * Reporte une tâche de `days` jours à partir de sa prochaine échéance actuelle
 * (et non à partir d'aujourd'hui, pour ne pas perdre de retard déjà accumulé).
 * Ne touche jamais `lastCompletedOn` : le cycle normal de la tâche n'est pas
 * affecté, seule l'échéance en cours est repoussée.
 */
export function snoozeTask(
  state: TaskScheduleState,
  days: number = DEFAULT_SNOOZE_DAYS
): SnoozeTaskResult {
  const currentDue = computeNextDueDate(state);
  return { snoozedUntil: addDays(currentDue, days) };
}

export interface ProjectedOccurrence {
  date: IsoDate;
  /**
   * true seulement pour l'échéance réelle actuelle de la tâche (celle
   * stockée en base, sur laquelle "Fait"/"Reporter"/"Déplacer" agissent
   * vraiment). Les occurrences suivantes sont de simples projections : elles
   * montrent où la tâche retombera SI le rythme actuel se maintient, mais
   * elles se décaleront dès que l'échéance réelle bougera. Jamais
   * actionnables, pour ne pas laisser croire qu'on peut "pré-valider" un
   * cycle futur indépendamment du suivant.
   */
  isReal: boolean;
}

/**
 * Projette les occurrences d'une tâche récurrente dans une période donnée,
 * au-delà de sa seule prochaine échéance réelle — sert uniquement à
 * l'affichage (vue Semaine), pour que parcourir les semaines à venir ne
 * paraisse pas vide alors que la tâche reviendra bien, mécaniquement, encore
 * et encore.
 *
 * Si `nextDueDate` est déjà passée (tâche en retard) et qu'on projette dans
 * une semaine future, aucune occurrence n'est marquée réelle : on ne sait
 * pas encore quand le retard sera rattrapé, donc tout ce qui s'affiche dans
 * ce cas est une simple hypothèse.
 */
export function projectOccurrences(
  nextDueDate: IsoDate,
  recurrenceDays: number,
  rangeStart: IsoDate,
  rangeEnd: IsoDate
): ProjectedOccurrence[] {
  if (recurrenceDays < 1 || !Number.isInteger(recurrenceDays)) {
    throw new Error("recurrenceDays doit être un entier >= 1");
  }

  const results: ProjectedOccurrence[] = [];
  let current = nextDueDate;
  let guard = 0;
  const GUARD_MAX = 2000;

  while (compareIsoDates(current, rangeStart) < 0 && guard < GUARD_MAX) {
    current = addDays(current, recurrenceDays);
    guard++;
  }

  while (compareIsoDates(current, rangeEnd) <= 0 && guard < GUARD_MAX) {
    results.push({ date: current, isReal: current === nextDueDate });
    current = addDays(current, recurrenceDays);
    guard++;
  }

  return results;
}
