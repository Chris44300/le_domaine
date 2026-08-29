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

## Phase 3 — Brancher Telegram sur le nouveau cœur (REPORTÉE, voir note)

> **Révision du 2026-08-28** : discussion avec Chris sur la direction long
> terme — il envisage que Le Domaine devienne à terme l'interface
> principale, avec ses propres menus cliquables (inspirés de l'UX
> Telegram), au point que Telegram devienne un client secondaire/optionnel
> plutôt qu'indispensable. Décision : pas de coupure ni de dépréciation
> décidée aujourd'hui (Telegram continue de tourner normalement, sur son
> chemin actuel, sans coût à le laisser vivre) — mais ça change la
> priorité immédiate. Plutôt que de brancher Telegram sur l'API tout de
> suite (ce qui le rendrait dépendant du serveur API sans bénéfice visible
> pour Chris), on construit d'abord le menu cliquable côté Domaine
> (documents + tâches), qui s'appuie sur les mêmes routes structurées déjà
> testées en Phase 1. Cette phase reste valable et sera reprise plus tard,
> une fois qu'il y aura un vrai bénéfice à migrer Telegram (ex. cohérence
> de comportement entre les deux clients), pas avant.

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

## Phase 3bis — Menu cliquable côté Domaine (nouvelle, insérée le 2026-08-28)

**Objectif :** donner au Domaine une vraie expérience de navigation par
menus/boutons (documents, tâches), équivalente à ce que Telegram sait
déjà faire — en s'appuyant sur les routes structurées de la Phase 1, sans
toucher à l'orchestrateur ni à Telegram.

- [x] 3bis.1 Widget Tâches dans Le Domaine (`app/tasks`) : liste
      (`POST /tasks/list`), cocher une tâche (`POST /tasks/toggle`),
      ajouter une tâche (`POST /tasks/add`) — rendu en boutons/lignes
      cliquables, pas en texte brut.
- [x] 3bis.2 Widget Documents (`app/documents`) : recherche
      (`POST /documents/search`), résultats cliquables → lecture
      (`POST /documents/read`) ou résumé (`POST /documents/summarize`)
      affichés inline.
  - [x] 3bis.2bis (ajouté le 2026-08-29, après discussion d'architecture
        avec Chris) : Documents devient un vrai navigateur — dossiers
        cliquables, fil d'Ariane, recherche restreinte au dossier
        courant, téléchargement de fichier (`GET /documents/download`,
        anti-traversal testé). Décision actée : Documents est la "salle"
        où investir (menu inline complet façon Telegram), la barre de
        recherche reste un routeur léger qui renverra plus tard des liens
        profonds vers Documents plutôt que de dupliquer la navigation.
        Vérifié en conditions réelles (navigation 2 niveaux, lecture en
        profondeur, téléchargement d'un vrai PDF). 368 tests verts.
  - [x] 3bis.2ter (ajouté le 2026-08-29, retours de Chris après test
        réel) : quatre capacités de plus, toutes déjà solides côté
        Telegram, jamais exposées côté API jusqu'ici :
    - Aperçu image (`GET /documents/preview`, inline) — fichiers image
      détectés (`meta.image`), bouton "Aperçu" au lieu de Lire/Résumer.
    - Recherche dans le contenu/OCR (`POST /documents/search-content`,
      `assistant.document_content_search`) — bouton "Rechercher aussi
      dans le contenu des documents" en plus de la recherche par nom
      (design volontaire de Chris, gardé par défaut).
    - Recherche dans un document ouvert (`POST /documents/search-in-file`)
      — cherche dans le contenu COMPLET, pas le texte tronqué affiché à
      l'écran (bug trouvé et corrigé en testant : `/read` tronque à
      MAX_CARACTERES_LECTURE_FICHIER, un mot plus loin dans un long
      document était invisible).
    - Chat "poser une question sur ce document" (`POST /documents/question`)
      — groundé dans le contenu réel (même garde-fou anti-hallucination
      que Telegram, `FILE_QA_SYSTEM_PROMPT` interdit d'inventer), pas un
      chat libre.
    Vérifié en conditions réelles sur les vraies données : aperçu d'une
    image 2000px, recherche contenu remontant des correspondances OCR
    profondes, recherche in-document trouvant un mot à la ligne 1169,
    question groundée vérifiée exacte dans le texte source. 379 tests
    verts côté Nigel.
  - [x] 3bis.2quater (ajouté le 2026-08-29, retours de Chris après un
        deuxième passage de test sur le même document réel) :
    - Lecture contextuelle (`POST /documents/read-around`) — un clic sur
      un résultat de recherche (contenu ou in-document) ouvre une fenêtre
      de 5 lignes avant / 15 après autour de la ligne visée, marqueur
      "▶", navigation "Contexte précédent/suivant". Première tentative
      via le regroupement "bloc sémantique" de Telegram
      (`prepare_document_reader_semantic_block`) écartée : dégénère sur
      les documents mal OCRisés sans lignes vides fiables (le même
      règlement de copropriété scanné), fusionnant des centaines de
      lignes en un seul bloc et noyant le marqueur. Retenu à la place
      `prepare_document_reader_window`, borné par lignes explicites —
      immunisé contre ce problème.
    - Disclaimer "document difficilement lisible" (`evaluer_lisibilite`,
      `api/document_intelligence.py`) sur `/read`, `/summarize`,
      `/question` — évite de laisser croire à un bug de l'app face à un
      vieux scan de mauvaise qualité. Heuristique calibrée en 3 essais
      sur le document réel de Chris (ratio de lettres isolées, seuil
      0.08 ; les deux premières heuristiques essayées — mots courants,
      mots sans voyelle — ne discriminaient pas assez).
    - Chat Q&A groundé dans un contexte CIBLÉ (`construire_contexte_cible`)
      au lieu du début tronqué du document — bug trouvé en testant :
      une question sur un passage situé loin dans un long document
      échouait car `charger_fichier_texte_pour_llm` tronque avant de
      l'atteindre. Reste déterministe (recherche de mots-clés, pas
      d'embeddings, conforme à la philosophie du README Nigel).
    - Carrousel photo (Précédente/Suivante dans l'aperçu image, purement
      frontend) et sélection multiple (cases à cocher, actions par lot
      "Voir" en galerie / "Télécharger") — le vrai zip côté serveur
      (avec découpage par taille, logique déjà existante côté Telegram)
      reste une suite séparée ; ceci est la version cliente qui débloque
      déjà l'usage.
    Vérifié en conditions réelles dans le navigateur, de bout en bout,
    sur le même document dégradé que Chris avait signalé. 391 tests
    verts côté Nigel.
  - [x] 3bis.2quinquies (ajouté le 2026-08-29, deux rounds de retours
        supplémentaires après usage réel plus poussé) :
    - Bug réel trouvé et corrigé : cliquer sur Résumer pendant qu'une
      recherche in-document était encore active affichait le résumé en
      coulisses mais l'écran restait bloqué sur l'ancienne liste
      d'occurrences (`openFile` ne réinitialisait jamais
      `docFilter`/`docSearchResults`, contrairement à `openSelection`).
    - Navigation repensée : un bouton unique "← Retour" dans la barre du
      haut remplace les boutons "Fermer" dispersés dans chaque panneau -
      un seul endroit prévisible pour revenir en arrière. La lecture
      contextuelle propose Lire/Résumer/Télécharger directement dans son
      en-tête (actions explicites) plutôt que de rouvrir automatiquement
      le début du document en arrière-plan à la fermeture (première
      tentative jugée par Chris "pas très intuitive" - remplacée).
    - Course critique corrigée (jeton de navigation `requestTokenRef`) :
      cliquer sur Résumer puis naviguer ailleurs pendant que la requête
      LLM tourne encore ne force plus l'affichage à revenir dessus une
      fois arrivée - la réponse tardive est ignorée. Même mécanisme pour
      le chat Q&A. Les boutons Lire/Résumer de la liste ne se
      désactivent plus tous ensemble dès qu'un chargement est en cours
      (seulement celui concerné), ce qui permet justement de naviguer
      pendant l'attente au lieu d'être bloqué.
    - Avertissement réseau lent : au-delà de 10s sur un résumé ou une
      question (les deux seuls appels LLM), bannière "M'avertir quand
      c'est terminé" - si accepté puis parti voir autre chose, le
      résultat tardif affiche une bannière "c'est prêt, voulez-vous
      regarder ?" au lieu d'être jeté silencieusement. Les vraies
      notifications système (onglet fermé/arrière-plan) demanderaient un
      service worker + l'API Notification - non construit, noté en
      Phase 8.
    Vérifié en conditions réelles : bug de résumé masqué reproduit et
    corrigé, fermeture de la lecture contextuelle revenant exactement
    aux résultats de recherche, clic Résumer suivi immédiatement d'un
    clic Lire sur un autre document confirmant que le résumé tardif ne
    force plus l'écran. Build de production propre.
  - [x] 3bis.2sexies (ajouté le 2026-08-29, cinquième round de retours,
        après confirmation Tailscale de Chris) :
    - Téléchargement groupé réellement fonctionnel : la boucle de clics
      `<a>` synthétiques se heurtait au blocage natif de Chrome sur les
      téléchargements automatiques multiples sans permission explicite -
      remplacée par un vrai zip côté serveur
      (`POST /documents/zip`, construit en mémoire, peut mélanger
      plusieurs dossiers). Pas de découpage par taille comme côté
      Telegram (`TELEGRAM_ZIP_MAX_BYTES`, lié au plafond de pièce jointe
      de Telegram) - un garde-fou plus large (500 Mo) suffit pour un
      navigateur.
    - "Voir la suite" sous un contenu tronqué en lecture simple (pas
      seulement en recherche) et navigation par onglet pour les fichiers
      Excel à plusieurs feuilles (`budget_multi_feuilles_test.xlsx`) -
      les deux réutilisent le lecteur contextuel déjà construit
      (`read-around`), aucune nouvelle UI de pagination. Le marqueur
      `"=== Feuille : X ==="` que `lire_fichier_xlsx` posait déjà pour
      Telegram est simplement repéré côté web.
    - Bandeau de sélection multiple déplacé en position fixe en bas
      d'écran (au lieu d'être inséré dans le flux, ce qui faisait
      descendre toute la liste d'un cran à chaque coche).
    - Navigation clarifiée : bouton "↩ Retour" déplacé à droite de
      l'en-tête (distinct du fil d'Ariane) ; "🏠" devient "🏠 Accueil" ;
      le lien du haut devient "← Retour au Domaine" - les deux "Accueil"
      se confondaient.
    - "Voir" sur une sélection multiple d'images ouvre désormais la vue
      grille par défaut.
    - Chevron "›" ajouté aux résultats cliquables de la barre de
      recherche du Domaine (`SearchBar.tsx`) : ils fonctionnaient déjà,
      rien ne signalait juste qu'ils étaient cliquables.
    Vérifié en conditions réelles : zip de fichiers de dossiers
    différents en un clic, suite de lecture reprenant exactement où le
    texte tronqué s'arrêtait, navigation vers un onglet Excel précis,
    bandeau de sélection fixe ne déplaçant plus la liste. 405 tests
    verts côté Nigel, build de production propre côté web.
  - [x] 3bis.2septies (ajouté le 2026-08-29, sixième round de retours) :
    - **Bug racine trouvé, pas juste contourné** : l'OCR web échouait
      ("Tesseract non trouvé") sur tout document scanné pas déjà en
      cache, alors même que `TESSERACT_CMD` était correctement renseigné
      dans `.env`. Cause : `api/main.py` (le serveur FastAPI) n'a jamais
      appelé `load_dotenv()` - seul `run_telegram.py` le fait. `.env`
      n'était donc jamais lu par l'API web. Les quelques documents déjà
      lisibles l'étaient uniquement parce que leur extraction avait été
      mise en cache lors d'un passage antérieur par Telegram. Deuxième
      couche du bug : le cache d'extraction mémorise aussi les échecs
      (indexés par mtime/taille du fichier) - un document resté bloqué
      sur l'erreur avant la correction y restait bloqué pour toujours,
      même après avoir corrigé la cause. Purge ponctuelle des 11 lignes
      en erreur dans `document_index.sqlite3` en plus du correctif de
      code.
    - Navigation par page pour les PDF à plusieurs pages, même principe
      que les onglets Excel (marqueur "=== Page N/M ===" posé par
      `lire_fichier_pdf` et `retrieval.ocr_service`) - `feuilles` renommé
      en `sections` (backend et web) pour couvrir les deux cas. Demande
      de Chris après avoir remarqué des numéros "1/8, 2/8" dans un
      document lu, qui n'étaient que le pied de page du PDF lui-même
      (pas fiable), pas un marqueur.
    - En-tête de Documents restructuré (retour avec capture d'écran) :
      deux rangées distinctes désormais - titre "Documents" + retour
      discret vers le Domaine général sur la première, navigation
      interne à Documents (accueil + fil d'Ariane à gauche, retour
      arrière contextuel à droite) sur la seconde.
    Vérifié en conditions réelles sur le document qui échouait
    (PDF scanné de 28 pages, contenu notarié) : OCR réussi de bout en
    bout, 28 pages navigables, saut direct vers la page 15 fonctionnel.
    406 tests verts, build de production propre.
  - [x] 3bis.2octies (ajouté le 2026-08-29, septième round de retours) :
    - Barre de recherche du Domaine : bug de course réel corrigé (jeton
      de navigation, même mécanisme que `documents/page.tsx`) - une
      réponse tardive à une recherche abandonnée pouvait écraser le
      résultat d'une recherche plus récente. Repensée pour amener
      directement dans la salle Documents ("Voir dans Documents ›") au
      lieu d'un aperçu limité dans le widget - nouveau support de lien
      profond côté `documents/page.tsx` (`?dossier=`/`?fichier=`/`?ligne=`).
    - "Lire" utilise désormais une vraie pagination
      (`POST /documents/read-page`, réutilisant tel quel
      `assistant.document_reader.prepare_document_reader`, déjà solide
      côté Telegram) plutôt que la navigation par marqueur du tour
      précédent - qui ne couvrait que xlsx/pdf et ne fonctionnait pas
      sur les documents déjà en cache sans les nouveaux marqueurs.
      Fonctionne pour tous les formats, indépendamment de l'état du
      cache. Bouton "Page X / Y" révélant un champ pour sauter à une
      page précise, sans encombrer l'écran de boutons (retour de Chris
      sur un PDF de 28 pages).
    - Une seule barre de recherche visible à la fois (dossier ou
      document, jamais les deux) - elles se chevauchaient et
      perturbaient.
    - L'avertissement réseau lent s'applique désormais aussi à la
      lecture (un OCR peut être aussi long qu'un résumé), pas
      seulement au résumé.
    - **Leçon opérationnelle découverte en testant** : après avoir purgé
      le cache d'erreurs OCR (3bis.2septies), une recherche dans le
      contenu portant sur un dossier avec plusieurs gros scans jamais
      encore lus prend très longtemps (chaque document non encore en
      cache déclenche son propre OCR, synchrone, dans la même requête) -
      pas un bug, mais un coût de préchauffage réel et notable. Le cache
      étant alimenté à la demande (pas de réindexation en arrière-plan),
      value la peine d'ouvrir une fois chaque document d'un dossier
      avant de compter sur la recherche de contenu dessus.
    Vérifié en conditions réelles : clic sur un résultat de recherche du
    Domaine amenant directement dans Documents avec le fichier déjà
    ouvert, pagination fonctionnelle sur le document exact montré en
    capture par Chris (6 pages, saut direct à la page 5). 409 tests
    verts, build de production propre.
  - [x] 3bis.2nonies (ajouté le 2026-08-29, huitième round) : le
    découpage générique de 3bis.2octies ne correspondait toujours pas
    aux vraies pages/feuilles (un PDF de 8 pages devenait 6 "pages", un
    xlsx de 3 feuilles devenait 4). Corrigé en découpant en priorité aux
    marqueurs déjà présents dans le texte extrait ("=== Page N/M ==="
    pour les PDF, "=== Feuille : X ===" pour les xlsx) plutôt que par une
    taille de caractères arbitraire - une page de l'appli correspond
    désormais exactement à une vraie page PDF, une feuille Excel devient
    une page. Boutons de saut direct par onglet Excel ajoutés,
    distincts de la pagination générale (demande explicite de Chris).
    Recherche mot-clé et question fusionnées en une seule barre avec un
    bascule, au lieu de deux formulaires empilés en permanence. Vérifié
    sur les trois documents exacts de Chris : xlsx 3/3, PDF 8/8 (page 5
    confirmée par son propre marqueur), PDF copropriété 28/28. 411 tests
    verts, build propre.
  - [x] 3bis.2decies (ajouté le 2026-08-29, neuvième round - premier test
        via Tailscale/Vercel réel) :
    - Réponse Q&A déplacée juste sous la barre de recherche/question,
      plus après tout le corps du document.
    - **Vrai bug trouvé en lisant les logs réels de Chris**
      (`logs/conversation.log`, canal `api-rest`) : taper un mot seul
      comme "anissa" dans la recherche du Domaine résout bien un dossier
      réel par recherche floue et affiche son contenu côté Telegram,
      mais l'action générique retournée
      (`action_depuis_contexte_dossier`) ne portait jamais le nom du
      dossier résolu dans son payload - le majordome web ne pouvait donc
      jamais reconstruire de bloc cliquable pour ce cas, même en cas de
      succès. Corrigé à la source
      (`executer_action_fichier_depuis_contexte_dossier` retourne
      désormais un `ExecutionResult` explicite avec
      `action="lister_fichiers"` + `dossier_relatif`, texte Telegram
      inchangé). Vérifié : "anissa" retourne maintenant 3 résultats
      cliquables. **Limite honnête signalée à Chris** : d'autres
      formulations plus proches du langage naturel ("cherche anissa",
      "y a-t-il des documents avec budget") échouent encore plus tôt,
      dans la détection d'intention elle-même (pas dans la
      reconstruction de bloc) - un effort de calibration plus large et
      continu, pas un correctif ponctuel.
    - **Découverte via les mêmes logs, non encore résolue** : les
      téléchargements réussissent bien côté serveur (`ok` dans les logs)
      mais Chris ne reçoit rien côté navigateur en testant depuis
      `le-domaine-tau.vercel.app` (HTTPS) vers l'API Tailscale (HTTP) -
      cohérent avec le blocage "téléchargements non sécurisés" de
      Chrome sur les téléchargements HTTP déclenchés depuis une page
      HTTPS. Piste retenue : passer l'API sur HTTPS via les certificats
      Tailscale natifs (`tailscale cert`/`tailscale serve`) plutôt que de
      contourner - nécessite une action de Chris (activer les
      certificats HTTPS dans la console Tailscale) avant de pouvoir
      avancer côté code.
    412 tests verts.
- [x] 3bis.3 Intégrés à l'écran d'accueil : deux nouvelles tuiles
      cliquables (Tâches, Documents) ; Ménage reste en attente de la
      Phase 4.
- [x] 3bis.4 Vérifié en conditions réelles : vraies tâches et vrais
      documents affichés et manipulés correctement (ajout/bascule testés
      avec une tâche de test créée puis remise à son état d'origine —
      jamais de mutation sur les vraies données). Build de production et
      lint propres.

**Sortie de la Phase 3bis :** Le Domaine a un vrai menu cliquable,
alimenté par le même cœur métier que Telegram — la preuve concrète que
Chris demandait, sans dépendance nouvelle pour Telegram. **Phase 3bis
complète** (2026-08-28).

---

## Phase 4 — Intégrer la pièce Ménage

**Objectif :** la première vraie pièce, à coût quasi nul.

- [x] 4.1 Tuile "Ménage" sur l'écran d'accueil du Domaine.
- [x] 4.2 V0 : la tuile ouvre l'application Ménage existante
      (https://application-taches-menageres.vercel.app/, dans un nouvel
      onglet) — aucune réécriture, juste un lien. Vérifié en conditions
      réelles.
- [ ] 4.3 V1 (optionnel, seulement si le confort le justifie plus tard) :
      ramener les écrans Ménage sous l'habillage visuel du Domaine.
      Décision à reprendre après usage réel du V0, pas avant.

**Sortie de la Phase 4 :** le Domaine donne accès aux tâches ménagères
sans avoir touché à une ligne du code Ménage existant. **Phase 4
complète** (V0 ; V1 volontairement en attente d'usage réel).

---

## Phase 5 — Pièce Documents/NAS (le tunnel réseau)

**Objectif :** rendre le NAS/l'index documentaire de Nigel accessible
depuis le Domaine, où que Chris se trouve.

> **Révision du 2026-08-28** : le NAS et le mini-PC ne sont pas encore là
> (achat en cours, délai de quelques jours/semaines). Décision : ne pas
> attendre — le PC actuel de Chris sert de relais provisoire pour tout ce
> qui suit (Tailscale, API exposée dessus). Seule différence pratique :
> pas de disponibilité 24/7 garantie tant que c'est le PC principal et
> non un mini-PC dédié (déjà nommé comme risque dans `ARCHITECTURE.md`
> §0) — mais aucun changement d'architecture n'est nécessaire, Tailscale
> ne fait pas de distinction entre "mini-PC" et "PC principal". Migration
> vers le vrai mini-PC/NAS plus tard : reconnecter Tailscale sur la
> nouvelle machine, rien à changer côté Domaine/API.

- [x] 5.1 🎓 Tailscale (fait par Chris, confirmé le 2026-08-29) :
  - [x] 5.1.1 Compte créé, installé sur le PC actuel de Chris (relais
        provisoire — migration vers le mini-PC/NAS plus tard). Adresse
        Tailscale du PC : `100.113.182.103` ("pcseeouest016").
  - [x] 5.1.2 Installé sur le téléphone. Adresse Tailscale :
        `100.65.47.83` ("s23-ultra-de-chris").
  - [x] 5.1.3 Les deux appareils apparaissent connectés dans
        `tailscale status` — l'interface Tailscale est classée en profil
        pare-feu Windows "Private", distinct du Wi-Fi ("Public"), ce qui
        permettra une règle de pare-feu ciblée juste sur elle (voir 5.2).
- [x] 5.2 Exposer l'API FastAPI sur le réseau Tailscale — trouvé et
      corrigé le 2026-08-29 : l'API n'a jamais été lancée qu'avec le bind
      uvicorn par défaut (`127.0.0.1`, localhost uniquement), donc
      injoignable même en local réseau AVANT même l'arrivée de
      Tailscale. Lancer désormais avec `--host 0.0.0.0` (vérifié
      joignable depuis l'IP Tailscale du PC).
  - [ ] Reste à faire par Chris (modification de pare-feu — hors de ce
        que Claude peut faire lui-même) : ajouter une règle de pare-feu
        Windows entrante sur le port 8000, restreinte à l'interface
        Tailscale (`New-NetFirewallRule -DisplayName "Nigel API (Tailscale)"
        -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
        -InterfaceAlias "Tailscale"` en PowerShell administrateur) — sans
        cette règle, le profil "Public"/"Private" bloque les connexions
        entrantes par défaut même si uvicorn écoute sur toutes les
        interfaces.
- [x] 5.3 Sur Vercel, `NEXT_PUBLIC_API_URL` mis à jour vers
      `https://pcseeouest016.tailed7ce8.ts.net:8000` et redéployé par
      Chris le 2026-08-29 (voir 5.3bis). Le fetch reste côté client (dans
      le navigateur du visiteur), donc ça marche tant que l'appareil qui
      consulte le Domaine est lui-même sur le tailnet (le téléphone de
      Chris l'est déjà) — Vercel lui-même n'a pas besoin d'être sur le
      réseau Tailscale.
- [x] 5.3bis (ajouté le 2026-08-29) Certificat HTTPS Tailscale, pour
      régler le blocage de téléchargement découvert en 3bis.2decies
      (Chrome bloque le HTTP déclenché depuis une page HTTPS) :
  - [x] Chris a activé "HTTPS Certificates" dans la console d'admin
        Tailscale.
  - [x] Claude a généré le certificat sur le PC : `tailscale cert
        pcseeouest016.tailed7ce8.ts.net`, fichiers dans
        `assistant-ia-personnel/certs/` (ajouté au `.gitignore` — clé
        privée, spécifique à la machine, ne doit jamais être commitée).
  - [x] API relancée par Chris avec `--ssl-keyfile`/`--ssl-certfile` —
        premier essai bloqué par une ancienne instance de l'API restée
        active sur le port 8000 (`Errno 10048`), débloqué en tuant
        l'ancien processus Python.
  - [x] `NEXT_PUBLIC_API_URL` mis à jour sur Vercel et redéployé (voir 5.3).
  - [x] Vérifié le 2026-08-29 : téléchargement fonctionnel depuis le
        Domaine déployé, questions sur document testées avec succès.
  - Note : le certificat Tailscale expire au bout de quelques mois — un
    renouvellement (`tailscale cert` à nouveau) sera nécessaire un jour,
    à garder en tête si le download recommence à échouer plus tard.
- [x] 5.4 Construire la pièce Documents dans le Domaine — fait dès la
      Phase 3bis (`app/documents`), avant même le tunnel réseau :
  - [x] 5.4.1 Liste de dossiers/fichiers (réutilise l'API de la Phase 1).
  - [x] 5.4.2 Recherche.
  - [x] 5.4.3 Lecture d'un fichier.
  - [x] 5.4.4 Téléchargement — fait le 2026-08-29 (`GET /documents/download`,
        voir 3bis.2bis). Zip multi-fichiers fait le même jour aussi (voir
        3bis.2quinquies, dernier point) — le téléchargement par clics
        successifs se heurtait au blocage natif de Chrome sur les
        téléchargements automatiques multiples.
- [ ] 5.5 Gérer proprement le cas "le PC est éteint/injoignable" côté Web
      (message clair, pas une erreur technique brute) — la base existe
      déjà (`callApi` renvoie un message d'erreur lisible), à vérifier
      que le message reste clair une fois passé par Tailscale.
- [x] 5.6 Test réel depuis un téléphone en 4G, hors réseau local — le
      scénario "vacances sans le PC" qui a motivé toute cette réflexion.
      Premier essai le 2026-08-29 (Vercel + Tailscale) : la connexion API
      fonctionnait déjà à distance, mais le téléchargement échouait
      silencieusement (Chrome bloquait le HTTP déclenché depuis une page
      HTTPS). Résolu le même jour via le certificat HTTPS Tailscale (voir
      5.3bis) : téléchargement et questions sur document confirmés
      fonctionnels par Chris en conditions réelles.

**Sortie de la Phase 5 :** le scénario "je suis en vacances, je veux un
fichier de mon NAS depuis mon téléphone" fonctionne pour de vrai (même si
le "NAS" est encore le PC de Chris pour l'instant).

---

## Phase 6 — Le Majordome complet

**Objectif :** que la barre de recherche du Domaine sache vraiment router
entre les pièces déjà branchées, pas seulement interroger les documents.

- [x] 6.0 (ajouté le 2026-08-28, prérequis technique découvert en route) :
      le contrat de retour interne `finalize_result` ne perdait plus
      `status`/`payload` (flow/action) — condition posée dans
      `ARCHITECTURE.md` §0.4.1 pour pouvoir un jour reconstruire des
      blocs structurés depuis `/ask`. Aucun changement de comportement
      pour Telegram/terminal (361 tests verts).
- [x] 6.1 Généraliser `POST /ask` pour router entre tous les domaines déjà
      exposés (documents, tâches ; Ménage reste un lien direct, Phase 4,
      pas encore de données Ménage exposées par l'API).
  - [x] Tranche 1 (tâches) : `voir_taches`/`voir_restantes` tapés en texte
        libre renvoient désormais un vrai bloc `list` cliquable (même
        constructeur que `POST /tasks/list`), rendu en menu dans la barre
        de recherche du Domaine — plus du texte brut. Vérifié en
        conditions réelles (liste cliquable, bascule fait/pas fait
        depuis la barre de recherche, "aide" toujours en texte normal).
  - [x] Tranche 2 (documents, recherche/liste) : même principe pour
        `rechercher_fichier` et `lister_fichiers` en texte libre — vrai
        bloc `list` cliquable (mêmes constructeurs que
        `POST /documents/search`/`/list`), lu directement depuis les
        paramètres déjà présents dans le payload de l'orchestrateur
        (`mot_cle`, `dossier_relatif`), sans reparser le texte
        utilisateur. Cas "pending" (mot-clé pas encore donné) reste
        correctement en texte normal. Vérifié en conditions réelles :
        recherche + lecture inline depuis la barre de recherche.
  - [x] Tranche 3 (documents, contenu/lecture/résumé/question, ajoutée le
        2026-08-29) : les 4 intentions documentaires restantes.
        `rechercher_contenu_fichiers` et `lire_fichier` réutilisent des
        constructeurs de bloc (nouveau `build_read_block`, même refactor
        que les autres routes) — pas d'appel LLM, recalcul sans risque.
        `resumer_fichier`/`question_fichier` ne sont PAS recalculés : le
        bloc réutilise directement `reponse.text` déjà produit par
        l'orchestrateur (évite de payer un second appel LLM juste pour
        construire le bloc), en y ajoutant seulement le contrôle de
        lisibilité OCR (lecture locale, pas un appel LLM).
        Bug plus profond trouvé en préparant ce point : le chemin
        Telegram/majordome (`outil_question_fichier_texte_local`)
        utilisait encore la troncature aveugle du début du document
        (`charger_fichier_texte_pour_llm`) — exactement le bug que Chris
        avait signalé et que `construire_contexte_cible` corrigeait déjà,
        mais uniquement côté web (voir 3bis.2quater). Corrigé à la racine
        plutôt que contourné : `construire_contexte_cible` a déménagé de
        `api/document_intelligence.py` (marqué à tort "spécifique au
        web") vers `core/fichiers.py` (partagé), et
        `outil_question_fichier_texte_local` l'utilise désormais aussi —
        un seul comportement correct sur les deux canaux, au lieu de deux
        copies dont une buguée. Vérifié en conditions réelles via la
        barre de recherche du Domaine (pas seulement en tests) : le
        contexte ciblé retrouve bien le passage enfoui (article 1169) du
        même document dégradé que Chris avait signalé, via ce chemin
        aussi. 397 tests verts.
  - [x] Tranche 4 (ajoutée le 2026-08-29, suite au test réel de Chris sur
        la recherche du Domaine) : les tranches précédentes construisaient
        un bloc cliquable à partir de (action, payload), mais
        `handle_document_flow()` emprunte en réalité une bonne douzaine de
        chemins internes différents (navigation "retour", résolution
        implicite sur un mot seul, confirmation d'action en attente,
        contexte de dossier courant...) qui n'utilisaient pas tous le même
        nom d'action, ou perdaient le dossier/fichier résolu en route
        avant d'atteindre `_bloc_structure_pour`. Le texte Telegram restait
        toujours correct (ces bugs étaient invisibles sur ce canal), mais
        le web retombait sur du texte brut, jamais de bouton.
        Généralisé via trois constructeurs canoniques dans
        `document_flow.py` (`_resultat_lister_dossier`/
        `_resultat_lire_fichier`/`_resultat_rechercher_fichier`/
        `_resultat_rechercher_contenu`), utilisés à chaque endroit où le
        code produit une vraie liste de dossier, une recherche par nom ou
        une lecture de fichier — quel que soit le chemin interne emprunté.
        Deux bugs concrets corrigés au passage (distincts de celui d'hier
        sur "anissa") : la navigation "retour" et le fallback de choix
        libre sur un dossier utilisaient tous les deux un nom d'action
        jamais reconnu côté web ; l'intention explicite "lister_fichiers"
        perdait le dossier ciblé et listait la racine à la place. 415
        tests verts (3 nouveaux). Volontairement laissé de côté pour
        garder le lot réviewable : l'harmonisation de `resumer_fichier`/
        `question_fichier` (déjà fonctionnels en texte, l'avertissement
        OCR n'est pas uniforme partout) et le concept de "fiche fichier"
        (menu d'action après sélection) qui n'a pas d'équivalent web.
        **Reste à faire par Chris : relancer l'API** pour charger ce
        code (testé ici sur une instance isolée port 8010, sans toucher
        au serveur HTTPS en cours d'utilisation) — puis retester "cherche
        anissa" et d'autres phrasés naturels : certains devraient
        maintenant produire un bouton, d'autres échouent encore plus tôt
        (détection d'intention, hors scope de cette tranche).
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

**Idées notées pour plus tard, non priorisées** (Chris, 2026-08-29,
volontairement pas développées maintenant) :
- Zip serveur pour le téléchargement groupé (voir 3bis.2quater) — la
  sélection multiple elle-même a été avancée le jour même ; reste le
  vrai zip côté serveur, avec le découpage par taille déjà existant côté
  Telegram, à porter sur l'API.
- "Envoyer par email" comme action sur un fichier, une fois qu'une
  adresse mail sera configurée dans Le Domaine.
- Vraies notifications système pour les tâches longues (résumé, Q&A) une
  fois l'utilisateur parti de l'onglet ou de l'application - la version
  actuelle (voir 3bis.2quinquies) affiche déjà une bannière discrète
  "c'est prêt" tant qu'on reste dans l'app, mais une notification après
  fermeture de l'onglet demanderait un service worker et l'API
  Notification (permission navigateur, infrastructure PWA) - plus lourd
  que ce qui a été nécessaire jusqu'ici, à envisager si le besoin revient.

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
      est down (ex. vérification programmée + alerte Telegram). Premier
      pas fait le 2026-08-29 : `/documents/*` et `/tasks/*` journalisent
      maintenant chaque appel dans `logs/conversation.log`
      (`api/logging_utils.py`), comme `/ask` le faisait déjà — Chris n'a
      plus besoin de retaper ce qu'il a testé, Claude peut relire le
      journal directement. Reste à faire : alerte si le serveur tombe.
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
- 2026-08-28 : révision de direction — Chris envisage Le Domaine comme
  interface principale à terme (menus cliquables type Telegram), Telegram
  devenant secondaire/optionnel plutôt que retiré activement. Phase 3
  (Telegram → API) reportée ; nouvelle Phase 3bis insérée (menu cliquable
  Documents/Tâches côté Domaine, sur les routes déjà construites).
- 2026-08-28 : Phase 3bis complète, testée par Chris. Bug trouvé et
  corrigé au passage (pages bloquées sur "Chargement..." sans erreur si
  l'API est injoignable). Leçon technique retenue : un site HTTPS public
  (Vercel) qui appelle une API tournant en local sur la machine du
  visiteur se heurte à *Private Network Access* de Chrome — en plus du
  CORS classique, le serveur doit répondre avec l'en-tête
  `Access-Control-Allow-Private-Network: true` (ajouté dans
  `api/main.py`). Confirmé fonctionnel par Chris dans son navigateur
  réel. Utile à se rappeler pour la Phase 5 (Tailscale) : ce même
  mécanisme jouera probablement un rôle une fois le tunnel réseau posé.
- 2026-08-29 : Chris teste par lui-même le Domaine + l'API en local
  (Tailscale connecté sur son PC actuel + téléphone). Remarque
  importante : Claude n'avait aucun moyen de voir ce que Chris testait
  sans qu'il le retape dans le chat. Diagnostic en creusant
  `logs/conversation.log` (déjà alimenté par `/ask`, pas par
  `/documents/*`/`/tasks/*`) : le "menu cliquable" ne s'affichait pas
  pour certains messages de Chris car il utilisait des phrasés de
  navigation façon Telegram ("dossier", "remonte", "ouvre le premier")
  non couverts par la Phase 6 (qui ne gère que la recherche/listing par
  mot-clé et les tâches) — comportement attendu, pas un bug. Corrigé au
  passage : les routes API dédiées journalisent maintenant aussi (voir
  9.3). Images toujours pas prises en charge par `/documents/read` —
  confirmé, accepté par Chris comme limite connue pour l'instant.
- 2026-08-29 : le gap image comblé le jour même (3bis.2ter) — aperçu,
  recherche OCR/contenu, recherche in-document, chat Q&A groundé.
  Retours UX de Chris après test réel traités dans la foulée : retour
  tactile au clic (globals.css) et indicateur de chargement précis
  (Spinner.tsx). Idées "sélection multiple" et "envoi par email" notées
  en Phase 8, volontairement pas développées maintenant.
- 2026-08-29 : deuxième round de retours de Chris après un test plus
  poussé du même document dégradé (3bis.2quater) — lecture contextuelle
  par fenêtre de lignes, disclaimer OCR, chat Q&A recentré sur un
  contexte ciblé plutôt que le début tronqué, carrousel photo, sélection
  multiple avec galerie/téléchargement par lot. La sélection multiple,
  prévue "pour plus tard" en Phase 8, a finalement été avancée maintenant
  à la demande explicite de Chris (cas d'usage album photo). Le zip
  serveur reste différé.
- 2026-08-29 : troisième round de retours (3bis.2quinquies, première
  moitié) — bug réel du résumé masqué par une recherche in-document
  périmée, corrigé à la racine. Sélection de dossier entier (récursive,
  côté client) et vue grille dans l'aperçu photo ajoutées à la demande
  de Chris, en avance sur Phase 8.
- 2026-08-29 : quatrième round (3bis.2quinquies, seconde moitié) —
  Chris a signalé que la fermeture de la lecture contextuelle "affiche
  un autre texte", pas intuitif : c'était l'effet de bord d'un correctif
  du round précédent (ouverture automatique du début du document en
  arrière-plan). Retiré, remplacé par un bouton "← Retour" unique dans
  la nav du haut et des actions explicites dans l'en-tête de la lecture
  contextuelle. Bug de course corrigé au passage (résumé tardif forçant
  l'écran après un "retour") via un jeton de navigation - illustre
  l'intérêt de garder une correction ciblée plutôt qu'un correctif large
  quand l'effet de bord n'est pas évident à l'avance.
- 2026-08-29 : Chris a explicitement laissé la main pour avancer sur la
  suite du plan. Repris la Phase 6.1 (majordome) là où elle s'était
  arrêtée le 28 : les 4 intentions documentaires manquantes (contenu,
  lecture, résumé, question) en texte libre depuis la barre de recherche
  du Domaine. En les préparant, trouvé que le chemin Telegram/majordome
  pour "question sur un fichier" avait le même bug de troncature que
  Chris avait signalé et que je pensais avoir corrigé - la correction du
  round précédent n'avait touché que la route web dédiée
  (`POST /documents/question`), pas le code partagé avec Telegram.
  Corrigé à la racine (fonction partagée déplacée dans `core/fichiers.py`)
  plutôt que rapiécé côté web une seconde fois. Phase 6.1 complète.
- 2026-08-29 : Chris confirme avoir créé le compte Tailscale et l'avoir
  installé sur son PC et son téléphone. Vérifié connecté (`tailscale
  status`) et trouvé au passage que l'API n'était joignable que depuis
  `127.0.0.1` (bind uvicorn par défaut) — jamais testé au-delà du
  local avant. Corrigé (5.2). Reste à Chris : la règle de pare-feu
  (modification système, hors de ce que Claude fait lui-même) et la mise
  à jour de la variable Vercel (accès dashboard que Claude n'a pas).
- 2026-08-29 : cinquième round de retours après ce test Tailscale
  (3bis.2sexies) — zip de téléchargement groupé (le mécanisme précédent
  ne marchait pas du tout, bloqué par Chrome), suite de lecture pour le
  contenu tronqué, navigation par onglet Excel, bandeau de sélection
  fixe, clarification Retour/Accueil, vue grille par défaut sur la
  galerie, chevrons sur la recherche du Domaine. Chris a aussi signalé
  qu'un document PDF scanné ("Modificatif au règlement de copropriété")
  échoue avec "Tesseract n'est pas installé" — contrairement au docx
  déjà testé qui n'a pas besoin d'OCR. C'est un binaire système
  (Tesseract) manquant sur la machine de Chris, pas un bug de code ;
  installation à faire par lui (lien fourni dans le message d'erreur
  existant, `TESSERACT_CMD` dans `.env` si besoin d'un chemin
  personnalisé) — Claude n'installe pas d'exécutables système.
- 2026-08-29 : correction du diagnostic Tesseract ci-dessus - Chris avait
  déjà Tesseract installé (`TESSERACT_CMD` déjà correct dans `.env`
  depuis un moment). Le vrai problème était côté code : `api/main.py` ne
  chargeait jamais `.env` (voir 3bis.2septies). Pas besoin d'action
  supplémentaire de Chris pour l'OCR une fois ce correctif déployé -
  juste redémarrer l'API.
