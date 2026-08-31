/**
 * Utilitaires de dates "pures" (jour calendaire, sans heure ni fuseau).
 *
 * Toutes les dates métier de l'application (échéances, dates de réalisation...)
 * sont des jours calendaires, pas des instants précis. On les représente donc
 * en chaîne "YYYY-MM-DD" et on calcule toujours en UTC pour éviter qu'un
 * changement d'heure d'été ou le fuseau du téléphone ne décale une date d'un jour.
 */

export type IsoDate = string; // format "YYYY-MM-DD"

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fuseau horaire du foyer, figé volontairement plutôt que déduit de
 * l'appareil ou du serveur : le serveur (Vercel) tourne en UTC, donc utiliser
 * l'heure "locale" du serveur ferait dériver la notion de "aujourd'hui"
 * jusqu'à 2h après minuit en France. Hypothèse documentée : foyer basé en
 * France métropolitaine. À généraliser si l'appli devait un jour servir des
 * foyers dans d'autres fuseaux.
 */
const HOUSEHOLD_TIME_ZONE = "Europe/Paris";

export function assertIsoDate(value: string): asserts value is IsoDate {
  if (!ISO_DATE_RE.test(value)) {
    throw new Error(`Date invalide (attendu YYYY-MM-DD) : "${value}"`);
  }
}

/** Jour calendaire "aujourd'hui" pour le foyer (fuseau Europe/Paris), au format "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): IsoDate {
  // Le format en-CA rend directement "YYYY-MM-DD".
  return new Intl.DateTimeFormat("en-CA", { timeZone: HOUSEHOLD_TIME_ZONE }).format(now);
}

/**
 * Heure locale (0-23) au foyer (fuseau Europe/Paris). Le décalage
 * Paris/UTC change avec l'heure d'été (+1 en hiver, +2 en été) : un cron
 * Vercel (toujours en UTC, sans notion de fuseau) ne peut donc pas viser
 * "8h à Paris" toute l'année avec un seul horaire fixe. La stratégie
 * retenue est de déclencher le cron à deux horaires UTC candidats (un par
 * décalage possible) et de ne laisser passer que celui qui tombe
 * effectivement sur 8h heure de Paris — voir `send-daily/route.ts`.
 */
export function parisHour(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: HOUSEHOLD_TIME_ZONE, hour: "2-digit", hour12: false }).format(now)
  );
}

/** Convertit un instant UTC en date calendaire "YYYY-MM-DD" (sans conversion de fuseau). */
export function dateToIso(date: Date): IsoDate {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Libellé "mercredi 22/07" pour une date calendaire, en français. */
export function formatFrenchWeekdayDate(iso: IsoDate): string {
  assertIsoDate(iso);
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Libellé court "lun. 20/07" pour une date calendaire, en français. */
export function formatFrenchWeekdayShort(iso: IsoDate): string {
  assertIsoDate(iso);
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isoToUtcMillis(iso: IsoDate): number {
  assertIsoDate(iso);
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Ajoute (ou retranche si négatif) un nombre de jours à une date calendaire. */
export function addDays(iso: IsoDate, days: number): IsoDate {
  const millis = isoToUtcMillis(iso) + days * 86_400_000;
  return dateToIso(new Date(millis));
}

/** Compare deux dates calendaires : négatif si a<b, 0 si égales, positif si a>b. */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return isoToUtcMillis(a) - isoToUtcMillis(b);
}

export function isoDateMax(a: IsoDate, b: IsoDate): IsoDate {
  return compareIsoDates(a, b) >= 0 ? a : b;
}

/** Lundi de la semaine (ISO, semaine commence le lundi) contenant la date donnée. */
export function startOfIsoWeek(iso: IsoDate): IsoDate {
  assertIsoDate(iso);
  const millis = isoToUtcMillis(iso);
  const date = new Date(millis);
  const weekday = date.getUTCDay(); // 0=dimanche, 1=lundi, ..., 6=samedi
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(iso, diffToMonday);
}
