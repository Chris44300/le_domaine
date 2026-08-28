# Le Domaine — Plan de construction

Document vivant : à mettre à jour au fil de l'avancement (cocher les
étapes, ajouter des notes, corriger ce qui s'avère faux à l'usage). Ce
n'est pas un contrat figé — voir "Comment lire ce document" ci-dessous.

## 0. Contexte — à lire en premier par toute nouvelle session

**Projet.** "Le Domaine" est l'interface maîtresse personnelle de Chris :
un écran d'accueil façon téléphone (grille de "pièces"/applications) avec
une barre de recherche en bas branchée sur un LLM (le "majordome"), capable
d'interroger n'importe quelle pièce. Budget prévu : ~500h, sur plusieurs
années, maintenu en solo avec l'aide de Claude.

**Deux autres projets déjà existants et liés :**
- `C:\Perso\Projet - Assistant IA\Projet - Assistant IA (Nigel)\assistant-ia-personnel`
  — le bot Telegram "Nigel" (Python). Moteur documentaire (NAS, recherche,
  OCR local Tesseract, index SQLite/FTS5) et gestion de tâches déjà
  fonctionnels et testés. C'est LA source du futur cœur métier du Domaine
  — on ne réécrit rien de ce qui marche déjà, on l'expose différemment.
- `C:\Perso\Projet - Assistant IA\Projet - Taches ménage\Application Tâches ménagères`
  — l'application "Ménage" (Next.js + Supabase + Vercel), déjà en
  production, utilisée à deux (Chris + Mel) au quotidien. PWA, temps réel,
  notifications push. Elle devient la première "pièce" du Domaine, sans
  réécriture.

**Décisions d'architecture actées (issues d'une session de confrontation
d'architecture avec Claude — à ne pas rouvrir sans raison nouvelle) :**

1. **Un seul cerveau.** Le cœur métier reste en Python (celui de Nigel),
   exposé via une API HTTP (FastAPI). Telegram, le Web (Le Domaine) et le
   terminal deviennent trois CLIENTS de ce même cerveau — jamais deux
   implémentations séparées de la même logique.
2. **Le Domaine (l'interface web/shell) reste hébergé sur Vercel**, pas sur
   le mini-PC. Seul ce qui touche réellement au NAS/aux documents tourne
   en local. Raison concrète : le mini-PC a déjà eu besoin d'un arrêt forcé
   pendant une indexation OCR — ce n'est pas encore une machine fiable à
   100%, on ne lui confie pas la disponibilité de tout le Domaine.
3. **Un seul framework frontend pour toutes les pièces** (Next.js/React,
   déjà connu via Ménage), quel que soit le backend qui les alimente. La
   modularité se fait au niveau backend (Python pour Documents/Reporting,
   Supabase pour Ménage), pas au niveau de l'interface.
4. **Majordome = routeur, pas cerveau unique.** LLM pour comprendre une
   question et choisir le bon outil ; Python déterministe pour l'exécuter.
   Exactement le principe déjà en place dans `assistant/registry.py` de
   Nigel — on généralise un pattern existant, on n'en invente pas un
   nouveau.
5. **FastAPI extrait progressivement, pas d'un coup.** On ajoute l'API
   capacité par capacité (une capacité = une tranche testée), plutôt que
   d'auditer tout le code d'un coup pour séparer "métier" et
   "Telegram-spécifique" avant de commencer.
6. **Le contrat de réponse de l'API doit être neutre** (ni du texte pensé
   pour un clavier Telegram, ni du HTML) — une forme JSON générique que
   Telegram ET le Web savent chacun afficher à leur façon.
7. **Identité : décidée dès maintenant dans sa forme, pas dans son
   implémentation.** Risque identifié comme le plus sérieux à 2-3 ans : que
   "qui pose la question" finisse par vouloir dire une chose différente
   selon qu'on parle depuis Telegram, le Web ou le terminal. On pose un
   identifiant personne canonique dès la Phase 0, même minimal.
8. **Ordre de construction du premier vrai domaine : Ménage avant
   Documents.** Ménage ne demande aucune nouvelle décision d'infra (déjà
   sur le cloud) — ça permet de valider "le shell + le majordome
   fonctionnent" avant d'ajouter la complexité du tunnel réseau vers le
   NAS.

**Ce qu'on évite consciemment** (risques nommés explicitement par Chris,
à surveiller à chaque nouvelle étape) : sur-architecture, empilement
d'outils/technologies, dépendances cloud superflues, complexité réseau
inutile, microservices prématurés, monolithe Python à l'inverse, un
chatbot qui deviendrait le cerveau unique (au lieu d'un simple routeur),
duplication Python/JavaScript de la même logique, abstractions construites
avant d'en avoir besoin, une architecture élégante sur le papier mais
pénible à maintenir seul.

## Comment lire ce document

- Chaque phase a un objectif, des étapes, et parfois des sous-étapes.
- 🎓 signale ce qui demande un apprentissage nouveau pour Chris — Claude
  guide pas à pas le moment venu, pas besoin de tout apprendre à l'avance.
- ✅ = fait. 🔄 = en cours. Rien = pas commencé.
- Les phases sont dans un ordre voulu (chaque phase s'appuie sur la
  précédente), mais le détail d'une phase peut être révisé une fois qu'on
  y arrive, à la lumière de ce qu'on aura appris entre-temps.
- Ce plan est volontairement incrémental : chaque étape doit se terminer
  par quelque chose qui marche et qui se teste, jamais par un gros
  chantier ouvert pendant des semaines sans rien de vérifiable.

---

## Phase 0 — Fondations (avant la première ligne de code du Domaine)

**Objectif :** poser les décisions qui coûtent cher à changer plus tard,
sans encore construire.

- [ ] 0.1 Nommer le projet techniquement (proposition : `le-domaine` en
      minuscules/tirets pour le futur repo Next.js).
- [x] 0.2 Créer ce dossier et l'initialiser en dépôt git (fait).
- [ ] 0.3 Modèle d'identité minimal (juste la forme, pas l'implémentation) :
  - [ ] 0.3.1 Lister les identités actuelles : whitelist Telegram
        (`chat_id`), compte Supabase de Ménage (email).
  - [ ] 0.3.2 Décider un identifiant personne canonique (ex. table
        `people` avec `id`, `telegram_chat_id` nullable, `email` nullable)
        — même si une seule ligne existe pour l'instant (toi).
  - [ ] 0.3.3 Écrire cette décision dans `ARCHITECTURE.md` (nouveau
        fichier, à créer) sans encore la coder.
- [ ] 0.4 Contrat de réponse générique de l'API (le "langage commun" entre
      le cœur Python et n'importe quel client) :
  - [ ] 0.4.1 Lister les formes de réponse actuelles de Nigel (texte
        simple, liste avec actions, fichier à télécharger, question en
        attente de réponse, photo/aperçu).
  - [ ] 0.4.2 Dessiner un schéma JSON neutre couvrant ces formes (ex. un
        objet `{ "type": "text" | "list" | "file" | "question", ... }`).
        Claude propose une première version, Chris challenge.
  - [ ] 0.4.3 Documenter ce contrat dans `ARCHITECTURE.md`.
- [ ] 0.5 🎓 Recenser ce qui sera nouveau pour Chris et prévoir un mini
      apprentissage guidé au moment venu (pas maintenant) :
  - FastAPI (routes, modèles Pydantic, lancer un serveur avec `uvicorn`).
  - Tailscale (créer un compte, l'installer sur le mini-PC et sur un
    téléphone, comprendre "réseau privé entre mes appareils").
  - Redéployer un 2ᵉ projet Next.js sur Vercel (le premier a déjà été fait
    pour Ménage, donc surtout de la répétition).
  - Gérer trois dépôts git séparés proprement (savoir dans lequel on
    travaille à un instant donné).
- [ ] 0.6 Écrire un `README.md` pour ce dépôt, dans le même esprit que
      celui de Ménage (expliquer le "pourquoi", pas juste le "comment").

**Sortie de la Phase 0 :** deux documents (`ARCHITECTURE.md` rempli,
`README.md`), zéro code applicatif. On sait quoi construire avant de
construire.

---

## Phase 1 — Extraire le cœur métier, une capacité à la fois

*Tout se passe dans le dépôt Nigel existant (`assistant-ia-personnel`),
pas encore dans "Le Domaine".*

**Objectif :** que Nigel expose ses capacités via une API HTTP locale,
sans rien casser de ce qui marche déjà avec Telegram.

- [ ] 1.1 🎓 Poser les bases FastAPI :
  - [ ] 1.1.1 `pip install fastapi uvicorn[standard]` dans le venv existant.
  - [ ] 1.1.2 Nouveau dossier `api/`, fichier `api/main.py` avec une
        application FastAPI vide + une route `GET /health` (vérifie juste
        que ça répond).
  - [ ] 1.1.3 Lancer en local (`uvicorn api.main:app --reload`), vérifier
        `http://localhost:8000/health` dans un navigateur. Prembattement
        de cœur du projet.
- [ ] 1.2 Choisir la première vraie capacité à exposer — recommandé :
      **la recherche documentaire par nom** (`rechercher_fichier_local`,
      déjà la fonction la plus indépendante de Telegram du projet).
  - [ ] 1.2.1 Nouvelle route `POST /documents/search` (corps : mot-clé,
        dossier optionnel).
  - [ ] 1.2.2 La route appelle directement `core.fichiers.rechercher_fichier_local`
        (aucune duplication : on appelle le code existant, on ne le
        réécrit pas).
  - [ ] 1.2.3 La réponse suit le contrat neutre défini en 0.4 (une liste
        de résultats structurée, pas le texte brut `"===== RÉSULTATS..."`
        déjà utilisé pour Telegram/terminal).
  - [ ] 1.2.4 Test d'intégration avec `TestClient` (FastAPI fournit un
        client de test) : vérifie le contrat JSON, pas juste "ça répond".
- [ ] 1.3 Noter, pour cette première capacité, tout ce qui a dû être
      contourné ou adapté à cause d'un couplage Telegram implicite —
      matière réelle pour la suite plutôt qu'un audit théorique.
- [ ] 1.4 Répéter 1.2-1.3 pour 2-3 capacités supplémentaires, dans cet
      ordre suggéré (du plus indépendant au plus couplé) :
  - [ ] 1.4.1 Lister un dossier (`list_browser_listing` ou équivalent).
  - [ ] 1.4.2 Lire un fichier / obtenir un résumé.
  - [ ] 1.4.3 Voir/gérer les tâches (`core/task_service.py`).
- [ ] 1.5 Une fois 3-4 capacités stables et testées, généraliser vers UN
      point d'entrée "majordome" (`POST /ask`, texte libre) qui route en
      interne vers `assistant/orchestrator.py` — c'est le vrai début du
      majordome, pas encore branché à un LLM de "présentation" côté client.
- [ ] 1.6 Commit + push du dépôt Nigel à chaque capacité ajoutée (petites
      tranches, comme tout le reste du projet jusqu'ici).

**Sortie de la Phase 1 :** une API locale (`localhost:8000`) qui expose
Nigel sans dépendre de Telegram, testée, committée. Telegram n'y touche
pas encore.

---

## Phase 2 — Coquille "Le Domaine" (V0 minimal)

*Nouveau dépôt `le-domaine` (celui-ci).*

**Objectif :** un écran d'accueil qui existe pour de vrai, même vide,
plutôt que cinq pièces jamais terminées.

- [ ] 2.1 🎓 Créer le projet Next.js :
  - [ ] 2.1.1 `npx create-next-app@latest` dans ce dossier (mêmes choix
        que Ménage : TypeScript, App Router — cohérence entre les deux
        projets Next.js).
  - [ ] 2.1.2 Nettoyer le template par défaut.
- [ ] 2.2 Écran d'accueil minimal :
  - [ ] 2.2.1 Une grille avec UNE tuile ("Test" ou "Ménage" directement).
  - [ ] 2.2.2 Une barre de recherche fixée en bas d'écran.
- [ ] 2.3 Identité visuelle (courte, pas un chantier en soi) :
  - [ ] 2.3.1 Palette + typographie choisies une fois, posées comme
        variables CSS (comme déjà fait pour les documents d'audit).
  - [ ] 2.3.2 Appliquées à la grille + la barre de recherche.
- [ ] 2.4 Brancher la barre de recherche sur l'API de la Phase 1, EN LOCAL
      d'abord (`http://localhost:8000`, les deux projets tournent sur la
      même machine pendant le développement — pas de problème réseau à ce
      stade, ça viendra en Phase 5).
- [ ] 2.5 Auth V0 : un simple jeton partagé (variable d'environnement),
      pas de vrai système de comptes — suffisant tant qu'il n'y a qu'un
      utilisateur. Le modèle d'identité de la Phase 0.3 n'a pas besoin
      d'être implémenté avant que ça devienne nécessaire (Mel, ou un accès
      extérieur).
- [ ] 2.6 🎓 Déployer sur Vercel (répétition de ce qui a déjà été fait pour
      Ménage) — même si l'API n'est pas encore joignable depuis internet à
      ce stade (ça vient en Phase 5), le déploiement du SHELL peut déjà
      être vérifié.

**Sortie de la Phase 2 :** une page web déployée, avec une tuile et une
barre de recherche qui répond (en local pour l'instant).

---

## Phase 3 — Brancher Telegram sur le nouveau cœur

*Retour dans le dépôt Nigel.*

**Objectif :** prouver "un cerveau, plusieurs clients" en conditions
réelles, sur ce qui existe déjà.

- [ ] 3.1 Modifier `run_telegram.py` pour que les capacités déjà migrées
      (Phase 1) appellent l'API locale au lieu du code Python en direct.
- [ ] 3.2 Les capacités PAS ENCORE migrées continuent d'appeler l'ancien
      chemin — transition progressive, jamais un big-bang qui casse tout
      d'un coup.
- [ ] 3.3 Suite de tests existante (pytest) : aucune régression tolérée.
- [ ] 3.4 Test manuel réel sur Telegram, sur les fonctionnalités migrées.
- [ ] 3.5 Commit, push.

**Sortie de la Phase 3 :** Telegram et Le Domaine tapent tous les deux sur
la même API. La promesse "un seul cerveau" devient vraie, pas juste
déclarée.

---

## Phase 4 — Intégrer la pièce Ménage

**Objectif :** la première vraie pièce, à coût quasi nul.

- [ ] 4.1 Ajouter une tuile "Ménage" sur l'écran d'accueil du Domaine.
- [ ] 4.2 V0 : la tuile ouvre l'application Ménage existante (son propre
      déploiement Vercel) — aucune réécriture, juste un lien.
- [ ] 4.3 V1 (optionnel, seulement si le confort le justifie plus tard) :
      ramener les écrans Ménage sous l'habillage visuel du Domaine.
      Décision à reprendre après usage réel du V0, pas avant.

**Sortie de la Phase 4 :** le Domaine donne accès aux tâches ménagères
sans avoir touché à une ligne du code Ménage existant.

---

## Phase 5 — Pièce Documents/NAS (le tunnel réseau)

**Objectif :** rendre le NAS/l'index documentaire de Nigel accessible
depuis le Domaine, où que Chris se trouve.

- [ ] 5.1 🎓 Tailscale :
  - [ ] 5.1.1 Créer un compte, installer sur le mini-PC.
  - [ ] 5.1.2 Installer sur le téléphone (et tout autre appareil
        personnel).
  - [ ] 5.1.3 Vérifier qu'un appareil peut "voir" le mini-PC par son
        adresse Tailscale.
- [ ] 5.2 Exposer l'API FastAPI du mini-PC UNIQUEMENT sur le réseau
      Tailscale (jamais sur l'internet public directement).
- [ ] 5.3 Sur Vercel, mettre à jour la variable d'environnement de l'URL
      de l'API pour pointer vers l'adresse Tailscale du mini-PC.
- [ ] 5.4 Construire la pièce Documents dans le Domaine :
  - [ ] 5.4.1 Liste de dossiers/fichiers (réutilise l'API de la Phase 1).
  - [ ] 5.4.2 Recherche.
  - [ ] 5.4.3 Lecture d'un fichier.
  - [ ] 5.4.4 Téléchargement (zip inclus, réutilise directement la
        logique déjà construite et déjà solide côté Telegram).
- [ ] 5.5 Gérer proprement le cas "le mini-PC est éteint/injoignable" côté
      Web (message clair, pas une erreur technique brute).
- [ ] 5.6 Test réel depuis un téléphone en 4G, hors réseau local — le
      scénario "vacances sans le PC" qui a motivé toute cette réflexion.

**Sortie de la Phase 5 :** le scénario "je suis en vacances, je veux un
fichier de mon NAS depuis mon téléphone" fonctionne pour de vrai.

---

## Phase 6 — Le Majordome complet

**Objectif :** que la barre de recherche du Domaine sache vraiment router
entre les pièces déjà branchées, pas seulement interroger les documents.

- [ ] 6.1 Généraliser `POST /ask` pour router entre tous les domaines déjà
      exposés (documents, tâches, bientôt Ménage si sa donnée passe par
      l'API plutôt que par lien direct).
- [ ] 6.2 Reprendre et étendre le pattern déjà en place (`registry.py`) :
      LLM pour comprendre/choisir l'outil, Python pour l'exécuter, LLM
      pour reformuler le résultat.
- [ ] 6.3 Revisiter seulement maintenant (pas avant) la question du
      routage à 2 étages (classer le domaine avant d'exposer ses outils au
      LLM) — à ne faire que si le nombre d'outils cause un vrai problème
      mesuré, pas par anticipation.

**Sortie de la Phase 6 :** un seul champ de recherche, plusieurs domaines
compris derrière.

---

## Phase 7 — Pièce Reporting (nouveau domaine, pas une extraction)

**Objectif :** le premier domaine entièrement nouveau (rien à réutiliser
de Nigel ici, contrairement aux phases précédentes).

- [ ] 7.1 Définir le contrat d'un "reporting programmé" : source(s),
      fréquence, critères, format de sortie.
- [ ] 7.2 🎓 Scheduler : réutiliser le pattern Vercel Cron déjà utilisé par
      Ménage (notifications du matin) si le reporting ne dépend que de
      services externes ; sinon, un scheduler côté mini-PC si des données
      locales sont impliquées.
- [ ] 7.3 Premier reporting concret — recommandé : le plus simple des
      exemples cités (veille marché data ou crypto), volontairement choisi
      parce qu'il ne dépend PAS de Gmail (une dépendance externe en moins
      pour le premier essai).
- [ ] 7.4 Interface de gestion des reportings dans le Domaine (créer,
      modifier, consulter l'historique).
- [ ] 7.5 Reporting recherche d'emploi (nécessite l'intégration Gmail —
      volontairement après le premier, pour isoler la complexité Gmail
      d'OAuth de la complexité "reporting" elle-même).

**Sortie de la Phase 7 :** un domaine entièrement nouveau construit avec
la même méthode que les précédents — preuve que le gabarit tient au-delà
de ce qui existait déjà chez Nigel.

---

## Phase 8 — Futures pièces (gabarit réutilisable)

**Objectif :** ne pas repartir de zéro à chaque nouvelle pièce.

- [ ] 8.1 Une fois 2-3 pièces réelles construites, documenter a posteriori
      le "gabarit d'une nouvelle pièce" (checklist : contrat API, tuile
      d'accueil, gestion des erreurs, où vit la donnée).
- [ ] 8.2 Budget/patrimoine, cave à vin, réservation restaurant, etc. — à
      la demande, une fois ce gabarit stable. Pas de plan détaillé pour
      elles avant que leur tour arrive réellement.

---

## Phase 9 — Opérations continues (ne s'arrête jamais)

**Objectif :** que "Le Domaine" reste vivant et fiable sur plusieurs
années sans devenir un fardeau.

- [ ] 9.1 Sauvegardes : Supabase gère déjà les siennes ; définir un plan
      pour l'index SQLite/les données du mini-PC (ex. copie régulière vers
      le NAS ou un stockage froid) — risque identifié explicitement comme
      sous-estimé dans la réflexion initiale.
- [ ] 9.2 Sécurité : rotation des jetons d'API, whitelist Telegram
      maintenue, accès Tailscale limité aux appareils du foyer.
- [ ] 9.3 Monitoring léger : un moyen simple de savoir si l'API/le mini-PC
      est down (ex. vérification programmée + alerte Telegram).
- [ ] 9.4 Documentation à jour dans chaque dépôt, écrite pour "moi dans 2
      ans qui a tout oublié" (même esprit que le README de Ménage).

---

## Journal des révisions de ce plan

- 2026-08-27 : première version, à l'issue de la session de confrontation
  d'architecture avec Claude.
