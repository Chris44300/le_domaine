# Gabarit : intégrer une nouvelle pièce dans Le Domaine

Ce document répond à une question précise : **on a construit une nouvelle
application ailleurs (son propre dépôt Git, potentiellement sa propre
stack), comment la brancher dans Le Domaine ?**

C'est le document à lire en premier si Chris arrive avec quelque chose du
genre *"voici le lien du Domaine, voici le lien de la nouvelle tuile,
intègre-la"*. Il complète `PLAN.md` (section 0, contexte général et
décisions d'architecture) sans le remplacer — lis aussi `PLAN.md` §0 si
tu n'as aucun contexte sur le projet.

Ce gabarit a été écrit a posteriori (voir `PLAN.md`, Phase 8.1) après
avoir réellement intégré une pièce (Ménage) et en avoir créé deux depuis
zéro (Documents, Road Map). Ce n'est pas une théorie : chaque étape
ci-dessous cite l'exemple concret correspondant côté Ménage.

## 1. Avant de commencer : qu'est-ce qu'on intègre ?

Une nouvelle pièce peut être de deux natures très différentes — identifie
laquelle avant de suivre la checklist, ça change ce qui s'applique :

- **Pièce avec sa propre base de données** (ex. Ménage : Next.js +
  Supabase indépendant). L'intégration porte le code Next.js dans ce
  dépôt (`Le Domaine`) et branche son Supabase existant — pas de
  duplication de données, pas de réécriture du moteur.
- **Pièce adossée au cœur métier Python** (ex. Documents, Tâches, et le
  futur Reporting côté "veille automatique lourde") — passe par l'API
  Nigel (FastAPI), jamais d'accès direct à un fichier ou une base depuis
  ce dépôt.

Dans les deux cas, **Next.js/React reste le seul framework d'interface**
(décision actée, `PLAN.md` §0.3) — la modularité se fait côté backend,
jamais côté frontend.

## 2. Le contrat minimal d'une pièce intégrée

Une pièce est "vraiment intégrée" (par opposition à un simple lien externe
depuis l'accueil) quand elle remplit ces points :

1. Elle vit sous une route dédiée de ce dépôt (`app/<piece>/...`).
2. Elle respecte l'authentification Supabase Auth déjà en place — pas de
   système de connexion parallèle.
3. Elle est gérée par le système de permissions par personne
   (`apps_autorises`) — pas d'accès "tout ou rien" codé en dur.
4. Elle apparaît comme tuile sur l'accueil, filtrée par les mêmes
   permissions.
5. Elle utilise les tokens de thème existants (`globals.css`), jamais de
   couleurs en dur — pour que clair/sombre marchent automatiquement.
6. Le build de production (`npm run build`) passe, pas seulement `npm run
   dev`.

L'intégration au chat/à la barre de recherche (§7 ci-dessous) est
**souhaitable mais pas obligatoire au premier passage** — Ménage a été
intégré visuellement d'abord (Étape 3), la lecture par le chat ensuite
(Étape 1, en fait faite avant côté connecteur Nigel), l'écriture depuis
le chat reste à faire à ce jour. Découper est normal et recommandé :
valider en conditions réelles à chaque étape plutôt que tout livrer d'un
coup (c'est explicitement ce que Chris a demandé et validé pour Ménage :
*"Le découpage B1 et B2 me convient, go"*).

## 3. Authentification et identité

- Si la nouvelle pièce a déjà son propre compte utilisateur/sa propre
  table de personnes : **ne pas dupliquer**. Vérifier si elle peut migrer
  vers le Supabase Auth déjà utilisé par Domaine et Ménage (même projet
  Supabase, tables `members`/`households`, RLS via `auth_household_ids()`
  côté SQL). C'est exactement ce qui a été fait pour Ménage — les comptes
  de Chris et Mel existaient déjà, rien recréé.
- Connexion par **code à 6 chiffres reçu par email**, jamais de lien
  cliquable — deux bugs iOS connus et déjà rencontrés : pré-visite des
  liens par Apple Mail (grille le code), stockage PWA séparé de Safari.
  Voir `web/app/login/LoginForm.tsx` et `web/app/auth/confirm/route.ts`
  pour l'implémentation de référence.
- Si la pièce a un backend totalement différent (ex. futur Reporting) et
  qu'il n'y a pas de notion d'utilisateur pertinente côté données, elle
  peut rester "protégée par la session Domaine" sans toucher à Supabase
  Auth elle-même — l'important est qu'il n'existe qu'un seul point
  d'entrée/de session pour l'utilisateur final.

## 4. Permissions par personne (`apps_autorises`)

- Choisir un **nom d'application court et stable** (ex. `"menage"`,
  `"roadmap"`) — utilisé tel quel à trois endroits différents, donc à
  fixer dès le début et ne plus renommer ensuite.
- Ajouter ce nom aux listes `apps_autorises` pertinentes en base
  (`members.apps_autorises`, `text[]` nullable — `NULL` = accès complet,
  utilisé pour Chris ; liste explicite pour un accès restreint, ex. Mel).
  Voir la migration `migration_008_domaine_permissions.sql` (dépôt
  Ménage/Supabase) pour le pattern.
- Déclarer la route dans `web/proxy.ts`, tableau `ROUTE_APP` :
  `{ prefix: "/<piece>", app: "<nom>" }`. C'est ce qui bloque l'accès à
  la page elle-même pour quelqu'un qui n'a pas la permission.
- Si la pièce doit être consultable depuis le chat/la recherche, ajouter
  côté Nigel (`assistant/llm_router.py`) le nom d'application à
  `OUTILS_PAR_APPLICATION` avec la liste des noms d'outils qu'elle
  expose. C'est `outils_pour_permissions()` qui traduit
  `apps_autorises` reçu du Domaine en liste d'outils réellement montrés
  au LLM — sans ça, une personne restreinte le resterait pour la page
  mais pas pour le chat.

## 5. Tuile d'accueil

- Ajouter une entrée dans le tableau `tiles` de `web/app/page.tsx` :
  `{ href, app, icon, label }`. Le filtrage par `aAcces(member,
  tile.app)` (voir `web/lib/current-member.ts`) est automatique une fois
  que `app` correspond au nom déclaré à l'étape précédente.
- Choisir une icône simple, cohérente avec les tuiles existantes
  (Tâches, Documents, Ménage, Road Map) — pas de dépendance à un pack
  d'icônes externe si ce n'est pas déjà en place.

## 6. Thème et design

- Toutes les couleurs viennent des variables CSS de `web/app/
  globals.css` (`--surface`, `--border`, `--accent`, `--foreground`,
  etc.), jamais de couleurs codées en dur dans le JSX/CSS de la pièce —
  c'est ce qui permet au thème clair (palette Ménage, préférence
  explicite de Chris) et sombre (palette ambre de Domaine) de s'appliquer
  automatiquement sans code spécifique par pièce.
- Si la pièce vient d'un dépôt externe avec sa propre feuille de style
  (cas Ménage), il faut réécrire ses couleurs en dur vers ces tokens au
  moment du portage — ne pas importer sa CSS telle quelle.
- Respecter la structure visuelle commune : barre de navigation du
  Domaine en haut/latérale, contenu de la pièce en dessous, barre de
  recherche persistante en bas (rendue globalement dans
  `app/layout.tsx`, rien à faire côté pièce pour l'avoir).

## 7. Intégration au chat / à la barre de recherche (optionnelle au départ)

Si on va jusque-là, le contrat est le suivant (voir `SearchBar.tsx` et
`api/menage.py` côté Nigel comme référence complète) :

- **Bloc navigable commun** : toute donnée listable renvoyée à
  l'interface suit la forme `{ kind: "list", items: [{ id, label, meta }]
  }`. C'est ce que `SearchBar.tsx` sait afficher (regroupé par
  `meta.categorie` si plusieurs catégories sont présentes) sans code
  spécifique par pièce.
- Côté Nigel : un connecteur (`connectors/<piece>.py`) avec, pour chaque
  fonction de lecture, une variante `_structure()` qui renvoie des dicts
  bruts (réutilisable par l'API et par le LLM) séparée de la mise en
  forme texte pour le chat — pattern déjà en place pour Ménage et
  Documents, à ne pas casser.
- Un fichier `api/<piece>.py` avec les routes REST et les "constructeurs
  de bloc navigable", enregistrés dans
  `_CONSTRUCTEURS_BLOC_NAVIGABLE` (`api/agent.py`) pour que le chat
  produise automatiquement un bloc cliquable après un appel d'outil
  pertinent.
- Si un item doit ouvrir un endroit précis de la pièce (ex. une semaine
  particulière), inclure l'information nécessaire dans `meta` dès le
  serveur (ex. `meta.date`) — ne pas essayer de la deviner côté client.
  Bug réel rencontré et corrigé : un lien "Entretien aspirateur" ouvrait
  toujours la semaine courante faute de cette information.
- Ajouter les nouveaux noms d'outils à `OUTILS_LLM_AUTORISES`
  (`assistant/llm_router.py`) ET à `OUTILS_PAR_APPLICATION[<nom>]` (voir
  §4) — les deux listes existent pour des raisons différentes (la
  première = "l'outil existe et est activable", la seconde = "qui peut
  l'activer").

## 8. Vérifier avant de dire "c'est prêt"

- **`npm run build` dans `web/`, pas seulement `npm run dev`.** Le mode
  dev (Turbopack) est plus tolérant sur le typage que `next build`
  (type-check strict complet) — un vrai bug est déjà passé entre les
  mailles de `next dev` et a fait échouer un déploiement Vercel (voir
  `PLAN.md`, journal du 2026-08-31). Règle non négociable depuis.
- Piège spécifique déjà rencontré : `web/lib/supabase/database.types.ts`
  est **écrit à la main**, sans métadonnées `Relationships` réelles
  (limite documentée en tête du fichier). Toute jointure Supabase
  embarquée (`select("*, relation:table(colonne)")`) compile en dev mais
  échoue au build (`SelectQueryError`). Solution systématique : deux
  requêtes séparées, assemblées en JS (voir `app/roadmap/page.tsx` pour
  l'exemple exact).
- Tester en conditions réelles dans le navigateur (voir la préview
  intégrée), pas seulement via les tests unitaires — plusieurs bugs de
  cette intégration n'ont été trouvés qu'en testant avec de vraies
  données (confusion de recherche floue, lien profond vers la mauvaise
  semaine, perte de contexte de conversation).
- Si la pièce touche à des permissions par personne : tester le cas
  "accès complet" en conditions réelles, et le cas "accès restreint" au
  minimum par un test automatisé si tester en vrai n'est pas possible
  (ex. impossible de se connecter comme Mel directement).
- Après tout changement côté Python (Nigel), relancer l'API
  manuellement — elle tourne sans `--reload`.

## 9. Documentation

- Mettre à jour `README.md` (liste des dépôts liés) et `PLAN.md`
  (cocher/ajouter la phase correspondante) au fil du travail, pas en une
  passe à la fin — voir la mémoire *tenue à jour de la doc*.
- Si le gabarit ci-dessus s'avère faux ou incomplet à l'usage sur une
  nouvelle pièce, corriger ce document en même temps plutôt que de le
  laisser dériver.

## 10. Exemple de référence complet : l'intégration de Ménage

Portage réalisé en plusieurs étapes validées une à une (voir `PLAN.md`,
Phase "Ménage réellement intégré" pour le détail complet et le journal
des bugs trouvés/corrigés à chaque round de test) :

- **A — Fondation auth** : `web/lib/supabase/`, `web/proxy.ts`,
  `web/app/login/LoginForm.tsx`, `web/app/auth/confirm/route.ts`.
- **B — Écrans portés** un par un (`/menage`, `/menage/semaine`, etc.),
  forme visuelle gardée à l'identique, juste rebranchée sur les tokens de
  thème du Domaine.
- **C1 — Permissions de page** : `members.apps_autorises`, `proxy.ts`.
- **C2 — Permissions du chat** : `outils_pour_permissions()` côté Nigel,
  `apps_autorises` transmis par `SearchBar.tsx` à `/agent/ask`.
- **Intégration chat/recherche** : `connectors/menage.py` (variantes
  `_structure()`), `api/menage.py` (routes + constructeurs de bloc),
  rendu cliquable dans `SearchBar.tsx`.

Chaque étape a été déployée et testée en conditions réelles par Chris
avant de passer à la suivante — c'est le rythme à reproduire, pas
"tout construire puis tout tester à la fin".
