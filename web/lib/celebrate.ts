"use client";

export const APP_FEEDBACK_EVENT = "app-feedback";

export interface AppFeedbackDetail {
  emoji: string;
  message: string;
  subtext: string;
}

const CELEBRATE_EMOJIS = ["🎉", "✨", "👏", "🙌", "💪"];

function dispatchFeedback(
  detail: AppFeedbackDetail,
  { vibrate = true, sound = false }: { vibrate?: boolean; sound?: boolean } = {}
) {
  window.dispatchEvent(new CustomEvent(APP_FEEDBACK_EVENT, { detail }));
  if (vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(60);
  }
  if (sound) playSuccessChime();
}

export function celebrateTaskCompletion(taskName: string) {
  const emoji = CELEBRATE_EMOJIS[Math.floor(Math.random() * CELEBRATE_EMOJIS.length)];
  dispatchFeedback({ emoji, message: taskName, subtext: "Bien joué !" }, { sound: true });
}

export function announceUndo(taskName: string) {
  dispatchFeedback({ emoji: "↩️", message: taskName, subtext: "Annulé" });
}

export function announceDateChanged(taskName: string, dayLabel: string) {
  dispatchFeedback({ emoji: "🗓️", message: taskName, subtext: `Faite le ${dayLabel}` });
}

export function announceMove(taskName: string, dayLabel: string) {
  dispatchFeedback({ emoji: "📅", message: taskName, subtext: `Déplacée à ${dayLabel}` });
}

export function announceSnooze(taskName: string, days: number) {
  dispatchFeedback({
    emoji: "⏳",
    message: taskName,
    subtext: `Reportée de ${days} jour${days > 1 ? "s" : ""}`,
  });
}

export function announceAdded(taskName: string, dayLabel: string) {
  dispatchFeedback({ emoji: "📌", message: taskName, subtext: `Ajoutée à ${dayLabel}` });
}

/**
 * Confirme l'ajout d'un "To do" — utile notamment quand il est assigné à
 * quelqu'un d'autre : avec le filtre par personne actif par défaut, il
 * disparaîtrait sinon aussitôt de l'écran sans qu'on sache s'il a bien été
 * enregistré.
 */
export function announceTodoCreated(taskName: string, forLabel: string) {
  dispatchFeedback({ emoji: "📝", message: taskName, subtext: `Ajoutée pour ${forLabel}` });
}

export function announceTodoDated(taskName: string, dayLabel: string) {
  dispatchFeedback({ emoji: "📅", message: taskName, subtext: `Prévue le ${dayLabel}` });
}

export function announceTodoDateCleared(taskName: string) {
  dispatchFeedback({ emoji: "📅", message: taskName, subtext: "Date retirée" });
}

/**
 * Petit son "ding" synthétisé (deux notes montantes), pour ne dépendre
 * d'aucun fichier audio externe. Silencieux si l'API n'est pas disponible
 * ou si le navigateur bloque l'audio (pas d'interaction préalable) — on
 * échoue sans bruit plutôt que de faire planter quoi que ce soit.
 */
function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const notes: [number, number][] = [
      [880, 0],
      [1318.5, 0.09],
    ];

    for (const [frequency, startOffset] of notes) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const start = ctx.currentTime + startOffset;
      const end = start + 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio non disponible : tant pis, ce n'est qu'une petite touche.
  }
}
