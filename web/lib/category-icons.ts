/**
 * Icône décorative par catégorie, devinée à partir de mots-clés dans son nom.
 * Purement cosmétique : si rien ne correspond, une icône neutre est utilisée.
 * Pas de configuration nécessaire, ça "marche" avec les catégories de
 * l'Excel d'origine comme avec des catégories futures.
 */
const RULES: [RegExp, string][] = [
  [/cuisine|vaisselle|frigo|four|micro.?onde|placard/i, "🍽️"],
  [/lessiv|linge|serviette|drap/i, "🧺"],
  [/sol|serpill|balai|aspirat/i, "🧹"],
  [/surface|poussi|miroir|vitre/i, "✨"],
  [/eau|douche|toilette|salle de bain|lavabo|paroi|joint/i, "🚿"],
  [/plante|arros|jardin|balcon/i, "🪴"],
  [/d[ée]chet|poubelle|liti[eè]re|compost/i, "🗑️"],
  [/technique|vmc|hotte|entretien/i, "🔧"],
  [/porte|poign|interrupteur|plinthe/i, "🚪"],
];

export function categoryIcon(categoryName: string | null | undefined): string {
  if (!categoryName) return "🏠";
  for (const [pattern, icon] of RULES) {
    if (pattern.test(categoryName)) return icon;
  }
  return "🏠";
}
