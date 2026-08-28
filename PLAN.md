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

- [x] 0.1 Nommer le projet techniquement — décidé : `le-domaine` en
      minuscules/tirets pour le futur repo Next.js. Voir `ARCHITECTURE.md`.
- [x] 0.2 Créer ce dossier et l'initialiser en dépôt git (fait).
- [x] 0.3 Modèle d'identité minimal (juste la forme, pas l'implémentation) :
  - [x] 0.3.1 Lister les identités actuelles : whitelist Telegram
        (`chat_id`), compte Supabase de Ménage (email — Chris ET Mel,
        déjà deux personnes réelles).
  - [x] 0.3.2 Décider un identifiant personne canonique — table `people`
        (`id`, `display_name`, `telegram_chat_id` nullable, `email`
        nullable), conçue dès maintenant pour supporter plusieurs
        personnes (Mel incluse), même si une seule ligne est peuplée pour
        l'instant.
  - [x] 0.3.3 Écrite dans `ARCHITECTURE.md` (§0.3), sans encore être codée.
- [x] 0.4 Contrat de réponse générique de l'API (le "langage commun" entre
      le cœur Python et n'importe quel client) :
  - [x] 0.4.1 Formes de réponse actuelles de Nigel recensées dans le code
        réel (16 formes distinctes trouvées, toutes portées aujourd'hui
        par une seule struct texte+boutons+metadata ad hoc) — voir
        `ARCHITECTURE.md` §0.4.1.
  - [x] 0.4.2 Schéma JSON neutre dessiné : enveloppe `{status, blocks[]}`,
        7 types de bloc (`text`, `list`, `actions`, `question`, `file`,
        `image`, `error`). Proposé par Claude, validé par Chris.
  - [x] 0.4.3 Documenté dans `ARCHITECTURE.md` (§0.4.2-0.4.3).
- [ ] 0.5 🎓 Recenser ce qui sera nouveau pour Chris et prévoir un mini
      apprentissage guidé au moment venu (pas maintenant) :
  - FastAPI (routes, modèles Pydantic, lancer un serveur avec `uvicorn`).
  - Tailscale (créer un compte, l'installer sur le mini-PC et sur un
    téléphone, comprendre "réseau privé entre mes appareils").
  - Redéployer un 2ᵉ projet Next.js sur Vercel (le premier a déjà été fait
    pour Ménage, donc surtout de la répétition).
  - Gérer trois dépôts git séparés proprement (savoir dans lequel on
    travaille à un instant donné).
- [x] 0.6 Écrire un `README.md` pour ce dépôt, dans le même esprit que
      celui de Ménage (expliquer le "pourquoi", pas juste le "comment").
      Déjà fait (renvoie vers ce plan pour le détail).

**Sortie de la Phase 0 :** deux documents (`ARCHITECTURE.md` rempli,
`README.md`), zéro code applicatif. On sait quoi construire avant de
construire. **Fait**, hors 0.5 (recensement d'apprentissage, volontairement
laissé pour le moment venu plutôt que traité à l'avance).

---

## Phase 1 — Extraire le cœur métier, une capacité à la fois

*Tout se passe dans le dépôt Nigel existant (`assistant-ia-personnel`),
pas encore dans "Le Domaine".*

**Objectif :** que Nigel expose ses capacités via une API HTTP locale,
sans rien casser de ce qui marche déjà avec Telegram.

- [x] 1.1 🎓 Poser les bases FastAPI :
  - [x] 1.1.1 `pip install fastapi uvicorn[standard]` dans le venv existant
        (requirements.txt mis à jour).
  - [x] 1.1.2 Nouveau dossier `api/`, fichier `api/main.py` avec une
        application FastAPI + une route `GET /health`.
  - [x] 1.1.3 Lancé en local (`uvicorn api.main:app --reload`), vérifié
        `http://localhost:8000/health` → `{"status":"ok"}`. Premier
        battement de cœur du projet.
- [x] 1.2 Première vraie capacité exposée : **la recherche documentaire
      par nom** (`rechercher_fichier_local`).
  - [x] 1.2.1 Route `POST /documents/search` (corps : `mot_cle`, `dossier`
        optionnel) — `api/documents.py`.
  - [x] 1.2.2 La route appelle `core.fichiers.rechercher_fichier_local_structure`
        (nouvelle fonction, voir 1.3 — aucune logique de recherche
        dupliquée, seul le formatage texte reste séparé de la donnée).
  - [x] 1.2.3 La réponse suit le contrat neutre défini en 0.4
        (`{status, blocks:[{kind:"list", items:[...]}]}`), vérifié en
        conditions réelles contre le vrai dossier documentaire
        (`budget` → 3 résultats structurés, plus de texte préformaté).
  - [x] 1.2.4 Tests d'intégration `TestClient` dans
        `tests/test_api_documents.py` (cas trouvé, vide, erreur dossier).
        Suite complète (344 tests) toujours verte après le refactor.
- [x] 1.3 Couplage rencontré et contourné : `rechercher_fichier_local`
      mélangeait recherche ET formatage texte (`"===== RÉSULTATS...`,
      préfixes emoji) dans la même fonction — pas un couplage Telegram à
      proprement parler (le texte est aussi consommé par le terminal),
      mais le même problème de fond que celui nommé en 0.4.1 : aucune
      forme structurée n'existait en sortie du noyau de recherche.
      Résolu en extrayant `rechercher_fichier_local_structure` (retourne
      des dicts `{path, type, score}`) ; `rechercher_fichier_local`
      devient un simple formatage texte au-dessus, comportement inchangé
      (tests existants verts sans modification). Cette même extraction
      servira probablement pour les capacités suivantes (résultats de
      recherche par contenu, listing de dossier) qui ont le même problème.
- [x] 1.4 Répéter 1.2-1.3 pour 2-3 capacités supplémentaires, dans cet
      ordre suggéré (du plus indépendant au plus couplé) :
  - [x] 1.4.1 Lister un dossier — `POST /documents/list`, même pattern
        d'extraction que 1.2 (`lister_fichiers_dossier_structure` créée
        dans `core/fichiers.py`, `lister_fichiers_dossier` texte inchangé
        par-dessus). Vérifié en conditions réelles contre le vrai dossier
        documentaire. 347 tests verts (3 nouveaux dans
        `tests/test_api_documents.py`).
  - [x] 1.4.2 Lire un fichier / obtenir un résumé.
    - [x] Lecture — `POST /documents/read`, même pattern d'extraction
          (`lire_fichier_texte_local_structure` créée). Vérifié contre un
          vrai PDF (extraction OCR/texte fonctionnelle). 349 tests verts.
    - [x] Résumé — `POST /documents/summarize`. Appel LLM réel (OpenAI) ;
          tests avec LLM mocké (aucun coût dans la suite pytest) + une
          vérification manuelle unique avec un vrai appel, décidée avec
          Chris. 351 tests verts.
  - [x] 1.4.3 Voir/gérer les tâches — `POST /tasks/list`, `/add`,
        `/toggle` (`core/task_service.py`). Même pattern d'extraction
        (`ajouter_tache`, `basculer_tache` structurés). Périmètre limité
        volontairement (pas de suppression/renommage/priorité/archivage
        côté API pour l'instant — pas de besoin identifié avant le
        majordome). Vérifié en lecture seule contre les vraies tâches ;
        écriture testée uniquement en isolation (jamais contre les
        vraies données). 357 tests verts.
- [x] 1.5 Point d'entrée "majordome" — `POST /ask` (texte libre),
      `api/ask.py`. Route vers `assistant.app.AssistantApp.process_message`
      (le même chemin que Telegram/terminal) sans aucune logique de
      routage réécrite : `channel="api"` fait naturellement sauter les
      branches spécifiques Telegram, déjà gardées par des checks de
      canal existants dans le code. Le texte renvoyé n'est pas encore
      restructuré selon le contrat neutre complet — un simple bloc
      `text`, comme prévu ("pas encore branché à un LLM de présentation
      côté client"). Vérifié en conditions réelles : routage réussi vers
      2 domaines différents (tâches, commandes générales) sans appel LLM
      pour ces cas déterministes ; le chemin LLM-routé n'est pas neuf
      (déjà exercé quotidiennement par Telegram) donc pas re-testé pour
      éviter un appel payant inutile. 360 tests verts.
- [x] 1.6 Commit + push du dépôt Nigel à chaque capacité ajoutée (petites
      tranches, comme tout le reste du projet jusqu'ici) — fait à chaque
      étape de la Phase 1.

**Sortie de la Phase 1 :** une API locale (`localhost:8000`) qui expose
Nigel sans dépendre de Telegram, testée, committée. Telegram n'y touche
pas encore. **Phase 1 complète.**

---

## Phase 2 — Coquille "Le Domaine" (V0 minimal)

*Nouveau dépôt `le-domaine` (celui-ci).*

**Objectif :** un écran d'accueil qui existe pour de vrai, même vide,
plutôt que cinq pièces jamais terminées.

- [x] 2.1 🎓 Créer le projet Next.js :
  - [x] 2.1.1 `npx create-next-app@latest web --yes` dans ce dossier
        (sous-dossier `web/`, même convention que Ménage) — mêmes choix
        que Ménage : TypeScript, Tailwind, ESLint, App Router.
  - [x] 2.1.2 Template par défaut remplacé (page.tsx, layout.tsx,
        globals.css réécrits).
- [x] 2.2 Écran d'accueil minimal :
  - [x] 2.2.1 Une grille avec UNE tuile ("Ménage", pas encore cliquable —
        le lien réel vient en Phase 4).
  - [x] 2.2.2 Une barre de recherche fixée en bas d'écran.
- [x] 2.3 Identité visuelle (courte, pas un chantier en soi) :
  - [x] 2.3.1 Palette chaleureuse (fond sombre/gold + variante claire via
        `prefers-color-scheme`) posée en variables CSS ; typographie =
        Geist (déjà fournie par le scaffold, pas de nouvelle police).
  - [x] 2.3.2 Appliquées à la grille + la barre de recherche.
- [x] 2.4 Barre de recherche branchée sur l'API de la Phase 1, EN LOCAL
      (`http://localhost:8000`, via `NEXT_PUBLIC_API_URL` + CORS ajouté
      côté API pour autoriser `localhost:3000`). Vérifié en conditions
      réelles : desktop, mobile, clair, sombre, routage réel vers le
      domaine "tâches" via `/ask` → orchestrateur. Aucune erreur console,
      lint propre.
- [x] 2.5 Auth V0 : jeton partagé (`DOMAIN_ACCESS_TOKEN` en variable
      d'environnement). `proxy.ts` (le nouveau nom du Middleware Next.js
      16) protège toutes les routes, cookie httpOnly posé par
      `/api/login` si le jeton soumis correspond. Pas de vrai système de
      comptes — modèle d'identité de la Phase 0.3 toujours pas implémenté,
      pas encore nécessaire. Vérifié en conditions réelles (redirection,
      mauvais jeton rejeté, bon jeton accepté et persistant). Build de
      production + lint propres.
- [x] 2.6 🎓 Déployé sur Vercel par Chris (import du repo GitHub,
      Root Directory = `web`, `DOMAIN_ACCESS_TOKEN` en variable
      d'environnement) : https://le-domaine-tau.vercel.app — vérifié en
      conditions réelles (auth, cookie, écran d'accueil, desktop et
      mobile). L'API n'est pas encore joignable depuis internet à ce
      stade (normal, ça vient en Phase 5) — seule la coquille est
      vérifiable pour l'instant, comme prévu.

**Sortie de la Phase 2 :** une page web déployée, avec une tuile et une
barre de recherche qui répond (en local pour l'instant). **Phase 2
complète.**

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
- 2026-08-28 : Phase 0 quasi close — 0.1 (nom `le-domaine`), 0.3 (modèle
  `people`) et 0.4 (contrat JSON `{status, blocks[]}`) rédigés dans
  `ARCHITECTURE.md` après recensement du code Nigel réel, validés par
  Chris. 0.6 (README) déjà fait. Reste seulement 0.5 (recensement
  apprentissage, volontairement différé) avant de passer en Phase 1.
- 2026-08-28 : Phase 1 complète — 4 capacités Nigel exposées en API
  (recherche, listing, lecture, résumé de fichiers ; voir/ajouter/cocher
  des tâches) puis généralisées via `POST /ask` (majordome, routage vers
  `assistant.app.AssistantApp` sans code de routage dupliqué). 360 tests
  verts. Chris a signalé se sentir "spectateur" sans interface cliquable
  pendant cette phase (voir mémoire `feedback_le_domaine_visibility` côté
  Claude) — a choisi de garder l'ordre du plan plutôt que d'avancer la
  Phase 2 en urgence ; à surveiller si la frustration revient.
- 2026-08-28 : Phase 2 complète — coquille Next.js (`web/`), écran
  d'accueil (tuile Ménage + barre de recherche branchée sur `/ask` en
  local), identité visuelle, auth V0 par jeton partagé (`proxy.ts`),
  déployée sur Vercel par Chris : https://le-domaine-tau.vercel.app. Le
  premier vrai écran cliquable du Domaine existe.
