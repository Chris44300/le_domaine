# Architecture — Le Domaine

Décisions de forme actées en Phase 0 (voir `PLAN.md`), avant la première
ligne de code. Document vivant, à corriger quand l'usage contredit une
hypothèse posée ici.

---

## 0.1 — Nom technique du projet

**Décision : `le-domaine`** (minuscules, tiret) pour le futur repo/projet
Next.js. Cohérent avec le nom déjà utilisé partout ailleurs (dossier,
README, PLAN.md).

---

## 0.3 — Modèle d'identité minimal

### Constat sur l'existant (avant de décider quoi que ce soit)

- **Nigel / Telegram** : whitelist par `chat_id` (a priori un seul
  utilisateur autorisé aujourd'hui — Chris).
- **Ménage / Supabase** : compte par **email**, et il y a déjà **deux
  personnes** (Chris + Mel). C'est le premier endroit du Domaine où le
  modèle d'identité doit gérer plusieurs personnes dès le départ, même si
  l'auth V0 du Domaine (Phase 2.5) reste un jeton unique côté shell.

Ces deux identités actuelles ne se recoupent pas (rien ne dit aujourd'hui
que le `chat_id` Telegram de Chris et son email Supabase désignent "la
même personne" pour une machine) — c'est exactement le risque nommé dans
le PLAN (§0, point 7) : "qui pose la question" ne doit pas dépendre du
canal.

### Décision proposée

Une table `people`, canonique pour tout le Domaine (vivra probablement
dans la base du cœur Python à terme, pas dans Supabase — le cœur métier
est la source de vérité identité, pas une pièce particulière) :

```
people
  id                  identifiant interne stable (ex. UUID)
  display_name        nom d'affichage ("Chris", "Mel")
  telegram_chat_id     nullable, unique si non-null
  email                nullable, unique si non-null
  created_at
```

Règles :
- Une ligne = une personne réelle, indépendamment du nombre de canaux
  qu'elle utilise.
- Un canal (Telegram, Ménage/Supabase, futur Web du Domaine) **résout**
  vers un `people.id` au moment de l'authentification côté client ; le
  cœur Python ne connaît que `people.id` en interne, jamais un `chat_id`
  brut une fois la résolution faite.
- Aujourd'hui : une seule ligne peuplée (Chris), avec `telegram_chat_id`
  rempli et `email` rempli si on veut déjà relier son compte Ménage.
  Ajouter Mel (déjà utilisatrice de Ménage) est une **deuxième ligne**,
  pas un cas particulier à gérer plus tard — le schéma le supporte déjà.
- Pas d'implémentation maintenant (Phase 2.5 reste un jeton partagé) :
  cette table n'a besoin d'exister en vrai que quand un deuxième canal
  authentifié apparaît réellement (Mel sur le Domaine, ou accès extérieur).

À trancher plus tard, pas maintenant : mot de passe/OAuth pour le Web,
rôles/permissions (ex. Mel voit Ménage mais pas Documents ?). Pas de
décision prématurée là-dessus.

---

## 0.4 — Contrat de réponse générique de l'API

### 0.4.1 — Formes de réponse actuelles chez Nigel (recensement factuel)

Toutes passent aujourd'hui par une seule struct `AssistantResponse{text,
ui_actions, metadata, should_exit}` (`models/assistant_response.py`),
traduite en appels Telegram par `run_telegram.py`. La variété vient du
contenu de `text` (string pré-formatée, préfixes `"===== TITRE ====="`),
de `ui_actions` (boutons), et de clés `metadata["telegram_*"]` ad hoc.

Formes distinctes identifiées dans le code :

1. Texte simple
2. Texte + clavier inline (menu contextuel)
3. Liste de tâches (rendu texte, jamais structuré en interne)
4. Liste paginée avec sélection par bouton
5. Fiche fichier ("carte" document + aperçu)
6. Résultats de recherche par contenu (avec occurrences)
7. Lecture de fichier paginée (reader, y compris navigation par bloc/feuille)
8. Question en attente de réponse (état serveur `pending`, champ `expected`
   — existe en interne dans `ExecutionResult` mais **perdu** avant la
   sortie actuelle)
9. Photo/aperçu image
10. Fichier à télécharger (document Telegram)
11. Archive zip (potentiellement scindée en plusieurs parties)
12. Fermeture d'un média actif (réponse "sans contenu", effet de bord pur)
13. Panneau de relance (followup) — un **second message** indépendant
14. Message "action longue en cours" (placeholder transitoire)
15. Message d'erreur/accès refusé (court-circuite tout le contrat actuel)
16. Confirmation binaire oui/non (cas particulier de la forme 2)

Points structurants pour la suite :
- Les listes (tâches, résultats) ne sont **jamais** des données
  structurées côté noyau — toujours du texte pré-formaté à reparser.
- Le statut sémantique (`success/pending/error`, `expected`) existe déjà
  dans `ExecutionResult` mais se perd avant `AssistantResponse` — le
  récupérer se fera en remontant la chaîne interne (`orchestrator.py`),
  pas en le déduisant du texte affiché.
- Les pièces jointes (photo, document, zip) sont des chemins serveur +
  métadonnées d'affichage, jamais le contenu binaire dans la réponse.
- Certaines réponses sont **doubles** (message principal + panneau
  followup, ou zip multi-parties) : un schéma "une réponse = un message"
  ne suffit pas.
- Les boutons (`ui_actions: {label, message_text}`) sont déjà un format
  assez neutre, mais `message_text` mélange souvent commande + paramètre
  en texte libre (ex. `"doc content search {query}"`) — à séparer en
  verbe + paramètres explicites dans le nouveau contrat.

### 0.4.2 — Schéma JSON neutre (proposition)

Enveloppe commune, une réponse peut contenir plusieurs blocs (pour couvrir
le cas "double message") :

```json
{
  "status": "ok | pending | error",
  "blocks": [ /* Block[], voir ci-dessous */ ]
}
```

Types de bloc (`kind` discriminant) :

- **`text`** — `{ kind: "text", title?: string, body: string }`
  Texte simple, sans mise en forme spécifique à un canal.

- **`list`** — `{ kind: "list", title?: string, items: [{ id, label,
  secondary?: string, done?: boolean, meta?: object }] }`
  Remplace les formes 3, 4, 6 : données structurées, chaque client
  (Telegram, Web) décide comment les afficher (boutons vs liste HTML).

- **`actions`** — `{ kind: "actions", choices: [{ id, label, verb:
  string, params?: object }] }`
  Remplace `ui_actions`. `verb` + `params` explicites au lieu de texte
  libre à reparser (ex. `{ verb: "doc.search_content", params: { query }
  }` au lieu de `"doc content search {query}"`).

- **`question`** — `{ kind: "question", prompt: string, expected: {
  type: "text" | "choice" | "number", choices?: [...] }, flow_ref:
  string }`
  Remplace la forme 8. Porte enfin le `expected` aujourd'hui perdu.
  `flow_ref` = identifiant opaque de l'état serveur en cours (remplace le
  couplage actuel par pattern-matching sur texte + état global).

- **`file`** — `{ kind: "file", name: string, mime?: string, size?:
  number, ref: string, parts?: number }`
  Remplace 5 (pièce jointe de la fiche), 10, 11. `ref` = identifiant
  opaque que le client échange contre un flux via un endpoint de
  téléchargement dédié — jamais le binaire inline dans la réponse. `parts`
  gère nativement le zip scindé (plus besoin d'une forme séparée).

- **`image`** — `{ kind: "image", name: string, ref: string }`
  Remplace 9.

- **`error`** — `{ kind: "error", message: string, code?: string }`
  Remplace 15, et le cas `status: "error"` en général.

Formes couvertes sans bloc dédié :
- 12 (fermeture média) et 14 (placeholder transitoire) sont des
  **effets de canal**, pas du contenu métier — chaque client (Telegram)
  les gère localement, ils n'ont pas besoin d'exister dans le contrat.
- 13 (followup panel) devient simplement un deuxième élément dans
  `blocks` (ex. `[{kind:"text"...}, {kind:"actions"...}]`) plutôt qu'un
  second message ad hoc.
- 16 (confirmation oui/non) est un `actions` à deux choix — pas de forme
  spécifique nécessaire.

**Non couvert volontairement pour l'instant** : formatage riche (gras,
emoji sémantiques) — laissé à la responsabilité de chaque client, pas au
contrat. Si un besoin réel apparaît, on l'ajoutera à ce moment-là plutôt
que par anticipation.

### 0.4.3 — Statut de cette section

Validé par l'usage : ce schéma porte toutes les routes API construites
depuis (Phase 1 à 6bis) sans avoir eu besoin d'être révisé dans sa forme.

---

## 0.5 — Comment construire une nouvelle "salle" (acté le 2026-08-29)

Question posée par Chris : faut-il coder toute nouvelle "salle"
directement dans le repo `le-domaine`, pour faciliter son intégration et
son administration via la barre de recherche — ou continuer à construire
des projets autonomes à côté (comme Ménage l'a été), et les intégrer
seulement une fois aboutis ?

**Décision : projets autonomes d'abord, intégration seulement quand
méritée.** C'est déjà comme ça que ce projet a démarré (Ménage avant
Documents, précisément parce que Ménage était déjà un projet fini et
autonome — voir §0 point 8) ; cette question généralise cette décision
initiale plutôt que de la remettre en cause.

**Pourquoi :**
- Ça correspond à la façon dont Chris aime réellement travailler — coder
  un projet qui lui plaît, en autonomie, sans les contraintes du Domaine
  (auth, design system, déploiement) tant qu'il n'est pas sûr de vouloir
  le garder. Tâches (`core/task_service.py` côté Nigel) a été construite
  ainsi, pour apprendre à coder, sans lien avec Le Domaine à l'origine.
- Ça évite exactement les risques nommés dès la Phase 0 (§ "Ce qu'on
  évite consciemment") : sur-architecture, abstractions construites
  avant d'en avoir besoin. Imposer les conventions du Domaine à chaque
  nouvelle idée dès sa naissance alourdit l'expérimentation libre.
- L'intégration a un coût borné et connu quand elle est faite une fois
  le projet mûr : Documents (Phase 1) et Ménage (Phase 4) sont entrés
  dans le Domaine à coût quasi nul, précisément parce qu'on ne les a
  intégrés qu'une fois qu'ils tenaient debout tout seuls.

**Ce que "intégrer" veut dire concrètement**, pour un projet déjà fait
maison par Chris (donc pas un vrai tiers) :
1. Une tuile sur l'écran d'accueil du Domaine — toujours possible,
   même juste un lien (V0), coût quasi nul.
2. (Optionnel) Une petite API exposée par le projet lui-même, pour que
   le majordome (`/ask`) puisse l'utiliser comme un outil — même
   principe que Documents/Tâches côté Nigel. Ménage n'a pas encore ça.
3. (Optionnel, plus tard) Un "reskin" visuel pour matcher l'habillage du
   Domaine — recréer les écrans avec le design system du Domaine, sans
   toucher à la logique/aux données existantes (jamais une réécriture).

Aucune de ces 3 étapes n'est obligatoire ni immédiate — chacune se
décide séparément, projet par projet, quand l'usage le justifie.

**Applications non développées maison (vrais tiers), pour plus tard :**
le niveau 1 (tuile/lien) fonctionne toujours, quel que soit le service.
Les niveaux 2/3 dépendent entièrement de ce que le service tiers expose
— faisable seulement s'il a une API utilisable, à évaluer cas par cas
quand le besoin se présente.

---

## 0.6 — Confidentialité et choix du LLM (acté le 2026-08-29)

Constat de Chris : certains documents futurs pourraient être confidentiels
au point de ne pas vouloir les envoyer à un LLM externe (OpenAI ou tout
autre prestataire).

**État réel aujourd'hui, à ne pas perdre de vue :**
- Comprendre une question ("cherche le rapport de mars") : seul le texte
  tapé par Chris part vers le LLM, jamais le contenu d'un fichier.
- Résumer un fichier (`resumer_fichier_avec_llm`, `services/api.py`) :
  le contenu ENTIER du fichier part aujourd'hui vers OpenAI. C'est le
  point sensible concret, pas hypothétique — déjà vrai en production.

**Décision :** pas de changement de code maintenant, mais le pattern
"LLM pour comprendre, Python pour exécuter" (§0 point 4) reste
volontairement agnostique du fournisseur — remplacer OpenAI par un LLM
local (Ollama ou équivalent) pour le routage ne demande pas de
restructurer l'architecture. Le jour où un vrai dossier confidentiel
existe, deux options à trancher à ce moment-là (pas avant) : désactiver
le résumé LLM pour ce dossier, ou le faire passer par un modèle local.

---

## Journal des révisions

- 2026-08-28 : première version — 0.1, 0.3, 0.4 rédigés après recensement
  factuel du code Nigel existant (voir PLAN.md pour le suivi des cases).
- 2026-08-29 : 0.5 (construction des salles : projets autonomes d'abord,
  intégration seulement quand méritée) et 0.6 (confidentialité/LLM local
  possible plus tard) ajoutées après discussion d'architecture avec
  Chris. 0.4.3 mis à jour (schéma validé par l'usage sur 6 phases).
