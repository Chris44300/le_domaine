/**
 * Couleur déterministe par personne, pour repérer "qui fait quoi" d'un coup
 * d'œil sans avoir à configurer quoi que ce soit : la même personne a
 * toujours la même couleur, dérivée de son identifiant.
 */
const PALETTE = [
  { bg: "#d6f0ea", fg: "#0f766e" }, // sarcelle pastel
  { bg: "#dbeafe", fg: "#1d4ed8" }, // bleu
  { bg: "#dcfce7", fg: "#15803d" }, // vert
  { bg: "#fce7f3", fg: "#a21caf" }, // rose
  { bg: "#fef9c3", fg: "#a16207" }, // jaune
  { bg: "#e0e7ff", fg: "#4338ca" }, // indigo
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function memberColor(memberId: string): { bg: string; fg: string } {
  return PALETTE[hashString(memberId) % PALETTE.length];
}

export function memberInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}
