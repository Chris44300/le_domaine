# Le Domaine — Plan de construction

Document vivant : à mettre à jour au fil de l'avancement (cocher les
étapes, ajouter des notes, corriger ce qui s'avère faux à l'usage). Ce
n'est pas un contrat figé — voir "Comment lire ce document" ci-dessous.

## Feuille de route actuelle (priorisée par Chris, 2026-08-30)

Ordre confirmé pour les prochains gros chantiers, à date. Mettre à jour
cette liste si l'ordre change plutôt que de la laisser devenir fausse.

1. **Documentation** ("pour moi dans 2 ans qui a tout oublié") — en
   cours, voir les README de chaque dépôt.
2. **Ménage réellement intégré** — EN COURS depuis le 2026-08-30.
   - [x] **Étape 1 (lecture seule)** : `connectors/menage.py` (dépôt
     Nigel) lit directement dans la base Supabase de Ménage (clé
     secrète, filtrée sur le foyer en application — même principe que
     `web/src/lib/supabase/admin.ts`, le seul autre endroit du projet
     Ménage à contourner RLS). Trois outils exposés au chat : tâches du
     jour/en retard, recherche d'une tâche par nom (correspondance
     floue), to-do en attente. Zéro risque pour les données : aucun
     code de Ménage modifié, aucune donnée déplacée/dupliquée.
     Vérifié en conditions réelles : "quelle est la récurrence pour
     nettoyer le balcon ?" répond correctement avec les vraies données.
   - [ ] **Étape 2 (écriture)** : ajouter une tâche/to-do, cocher fait,
     reporter — pas commencé, volontairement séparé (modifie de vraies
     données).
   - **Étape 3 (intégration visuelle, fusion de code — accord de Chris
     le 2026-08-30 "on fusionne le code")** : voir la note ci-dessous
     pour le pourquoi. Découpée en 3 sous-étapes :
     - [x] **A — Fondation auth** : Supabase Auth ajouté à Le Domaine
       (`web/lib/supabase/`, `proxy.ts`, `app/login/LoginForm.tsx`,
       `app/auth/confirm/route.ts`), en réutilisant tel quel le
       mécanisme de connexion de Ménage (code reçu par email, saisi
       dans l'appli — pas de lien cliquable, pour éviter les deux bugs
       iOS connus : pré-visite des liens par Apple Mail, stockage PWA
       séparé de Safari). Remplace l'ancien jeton unique
       `DOMAIN_ACCESS_TOKEN` (route `/api/login` supprimée, devenue
       inutile). Même projet Supabase que Ménage : comptes de Chris et
       Mel déjà existants, rien à recréer. Vérifié en conditions
       réelles le 2026-08-30 : connexion avec `chris.marec44@gmail.com`
       (code à 8 chiffres, pas 6 comme l'annonçait le texte copié de
       Ménage — corrigé dans Domaine), session posée, page d'accueil
       affichée, session qui tient sur `/documents`. Ménage lui-même
       reste déployé et inchangé (`application-taches-menageres.vercel.app`)
       pendant toute la durée du chantier — zéro risque pour l'usage
       quotidien de Mel.
     - **B — Écrans Ménage portés dans Domaine** : pages `/menage/*`
       dans ce dépôt, appelant Supabase directement côté navigateur
       avec RLS (pas la clé secrète du connecteur Nigel, réservée au
       serveur/chat). Aucune donnée déplacée — même base. Chris a
       confirmé le 2026-08-31 qu'on garde la forme de Ménage "à
       l'identique" (mêmes couleurs, même police, même barre de
       navigation en bas) — juste hébergé dans Domaine, plus de nouvel
       onglet à l'ouverture. Découpée écran par écran, validée en
       conditions réelles à chaque fois avant de continuer :
       - [x] **B1 — Aujourd'hui** (`/menage`) : tâches du jour/en
         retard, to-do, cocher fait, reporter, ajouter une to-do,
         filtre par personne, notif temps réel entre foyers (Supabase
         Realtime). Palette et police de Ménage isolées dans
         `.menage-shell` (`app/globals.css`) pour ne pas déteindre sur
         le reste de Domaine. La nav du bas pointe encore vers le site
         Ménage externe pour Semaine/Historique/Réglages (pas encore
         portés) — à retirer au fur et à mesure de B2-B4. Vérifié en
         conditions réelles le 2026-08-31 : connexion, lecture des
         vraies données (13 to-do, tâches du jour), écriture réelle
         confirmée (to-do cochée puis annulée par Chris), aucune
         régression sur Tâches/Documents.
       - [x] **B2 — Semaine** (`/menage/semaine`) : navigation semaine
         précédente/suivante, occurrences projetées ("prévision"),
         "avancer à cette semaine". Vérifié en conditions réelles.
       - [x] **B3 — Historique** (`/menage/historique`) : journal
         (100 dernières tâches faites) et statistiques (7/30/90 jours,
         qui fait quoi, par catégorie, tâches les plus reportées).
         Vérifié en conditions réelles.
       - [x] **B4 — Réglages** (`/menage/parametres`) : gestion des
         personnes/catégories/tâches (ajouter, archiver, modifier,
         supprimer), Zone dangereuse (réinitialiser tout l'historique
         du foyer). Vérifié en conditions réelles (affichage et
         données réelles seulement — jamais cliqué "Réinitialiser
         l'historique" ni testé les formulaires d'ajout/suppression en
         automatique, irréversible ou structurel). **Notifications
         push volontairement absentes** : elles dépendent d'un service
         worker propre à l'origine du site (celui de Ménage
         aujourd'hui) — pas construit pour Domaine, décision à prendre
         séparément si besoin. Toujours actives sur l'app Ménage
         d'origine en attendant, message explicite affiché à la place
         dans Domaine.
       - La nav du bas de Ménage est maintenant 100% interne à Domaine
         (Aujourd'hui/Semaine/Historique/Réglages) — plus de lien
         externe. Les 4 écrans principaux de Ménage sont donc tous
         portés ; le site Ménage externe reste la seule référence pour
         les notifications push. `loading.tsx` (écran de chargement)
         également porté - étape B considérée complète pour tout ce
         qui n'est pas notifications.
     - **C — Permissions par personne** : qui voit quelle application.
       Portée confirmée par Chris le 2026-08-30 : **Mel a accès à
       Documents + Ménage + Chat, pas au reste** (pas de Tâches Nigel,
       pas de future pièce Programmation/admin) ; Chris garde accès à
       tout. Sert aussi de socle au chantier réseau multi-utilisateurs
       (item 4). Découpée en deux :
       - [x] **C1 — Accès aux pages** (Domaine, frontend) : nouvelle
         colonne `members.apps_autorises` (`text[]`, `null` = accès
         complet — voir `supabase/migration_008_domaine_permissions.sql`
         dans le dépôt Ménage) ; `proxy.ts` bloque/redirige vers `/`
         si la page demandée n'est pas dans la liste de la personne ;
         la page d'accueil masque les tuiles non autorisées. Vérifié
         en conditions réelles pour Chris (accès complet, les 3
         tuiles, `/tasks` accessible) - le cas restreint de Mel reste
         à vérifier par elle-même (pas d'accès à sa boîte mail pour
         tester à sa place).
       - [ ] **C2 — Accès aux outils du chat** (Nigel, backend Python) :
         filtrer les outils exposés au LLM selon qui pose la question
         (`assistant/agent_tools.py`/`registry.py`) - pas commencé.
     - [x] **D — Ménage interactif dans le chat et le mode Mot-clé**
       (demande de Chris le 2026-08-31 : "comme avec document,
       interagir"). Nouvel outil `lister_taches_menage_semaine` (Nigel)
       - taches récurrentes dues d'ici dimanche + to-do ouvertes, une
       seule vue pour "toutes les tâches" comme pour "la semaine".
       Nouveau `api/menage.py` (Nigel) : blocs cliquables pour tous les
       outils Ménage du chat (même contrat que `api/documents.py`),
       nouvelle route `POST /menage/search` pour le mode Mot-clé (cherche
       aussi dans Ménage, pas seulement les documents). Côté Domaine
       (`SearchBar.tsx`) : les résultats Ménage sont cliquables, amènent
       directement au bon écran (`/menage` ou `/menage/semaine`) ; une
       réponse qui mélange to-do et tâches récurrentes se groupe en deux
       catégories repliables indépendamment. Corrigé au passage : CORS
       n'autorisait que `localhost:3000`, pas `3001` (port réellement
       utilisé en dev local) - tout appel API en dev échouait
       silencieusement en "Impossible de joindre l'API". Vérifié en
       conditions réelles : "gamelle"/"ledger" en Mot-clé remontent bien
       les résultats Ménage ; "montre-moi toutes les tâches ménagères"
       en Texte répond avec un bloc groupé "Tâches récurrentes (9)" /
       "To do (15)".
     - [x] **E — Barre de recherche repliée + palette unifiée** (retours
       de Chris le 2026-08-31 sur la fusion Ménage) : la barre plein
       écran est devenue un petit bouton flottant (💬, coin bas-droit),
       qui s'ouvre en carte flottante au clic - corrige le chevauchement
       avec la nav du bas de Ménage. Lien "🏰 Retour au Domaine" ajouté
       dans Ménage. Palette de couleurs unifiée entre Domaine et Ménage
       (plus de bleu séparé) - **puis palette claire de Ménage remise à
       l'identique** (bleu/teal d'origine) après retour de Chris, qui la
       préférait à la variante ambrée proposée initialement ; le thème
       sombre reste ambré. Nouvelle page `/parametres` (bouton ⚙️ sur
       l'accueil) : choix Système/Clair/Sombre, appliqué via
       `data-theme` sur `<html>`, persisté en `localStorage`.
3. **Pièce Reporting** (Phase 7) — un peu après Ménage.
4. **Réseau multi-utilisateurs + permissions + "Programmation"** (chat
   admin capable de modifier le code, avec snapshots/retour en
   arrière) — voir la discussion du 2026-08-30 pour le découpage en
   étapes proposé.
5. **Confidentialité par tag sur certains documents** — architecture
   déjà confirmée compatible (le garde-fou se poserait au point de
   passage unique `executer_outil`), rien construit.
6. **Sauvegardes du mini-PC** (au-delà de ce que Supabase gère déjà
   tout seul pour Tâches/Ménage).
7. **Alerte si le serveur tombe complètement** (aujourd'hui : alerte
   sur l'échec du balayage planifié seulement, pas sur une panne
   générale de l'API).

### Note : intégration visuelle de Ménage (Étape 3 ci-dessus)

Question de Chris le 2026-08-30 : "je veux que l'application ménage
soit dans domaine... comme on peut avoir entre domaine et Document".
Réponse — oui, possible, mais Ménage est structurellement différent de
Documents : Documents est une simple route qui appelle la même API
Nigel que le reste du Domaine, alors que Ménage est une **application
Next.js séparée avec son propre système de connexion** (email + lien
magique Supabase Auth, par personne — Chris ET Mel ont chacun leur
compte). Trois façons possibles d'obtenir l'effet recherché, par ordre
de préférence :

- **Fusionner le code** (recommandée) : faire vivre les écrans de
  Ménage comme une route à l'intérieur de ce dépôt, connectée à la même
  base Supabase. C'est la seule option qui donne vraiment "une seule
  appli, une seule connexion" — pas de double authentification, pas de
  sensation de changer d'appli. Implique de porter la connexion par
  personne (Supabase Auth) dans Le Domaine, qui n'a aujourd'hui qu'un
  jeton unique partagé — **ce qui recoupe directement l'item 4
  (réseau multi-utilisateurs)** : Ménage a déjà un vrai modèle
  foyer/membres/permissions par personne, exactement ce dont ce chantier
  a besoin. Plutôt que de construire un système d'utilisateurs from
  scratch pour le Domaine, étendre celui de Ménage (déjà existant,
  déjà éprouvé à deux) est probablement le chemin le plus efficace.
- **Iframe** (rapide mais déconseillée) : afficher le site Ménage
  existant dans un cadre à l'intérieur du Domaine. Techniquement
  simple, mais ne résout ni la double connexion ni la sensation de
  changer d'appli — un pis-aller, pas la cible.
- **Proxy/rewrite** : faire passer les requêtes vers `/menage` par le
  déploiement Ménage existant sans fusionner le code. Complexité propre
  (cookies, session, deux déploiements à garder synchronisés) sans
  vraiment simplifier par rapport à la fusion.

Chris a validé l'option "fusionner le code" le 2026-08-30 ("ok, je suis
chaud, on fusionne le code"). L'étape A (fondation auth) est faite et
vérifiée — voir le détail dans l'item 2 ci-dessus.

Hors liste ci-dessus mais notée : Telegram/API (Phase 3) est devenue
**obsolète**, pas juste reportée — voir la note dans la Phase 3
elle-même. Rotation des clés API : juste une bonne hygiène selon Chris,
idée retenue pour plus tard — un rappel Telegram périodique ("cela fait
X semaines que les clés n'ont pas changé"), pas urgent.

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

## Phase 3 — Brancher Telegram sur le nouveau cœur (OBSOLÈTE, voir note)

> **Révision du 2026-08-28** : discussion avec Chris sur la direction long
> terme — il envisage que Le Domaine devienne à terme l'interface
> principale, avec ses propres menus cliquables (inspirés de l'UX
> Telegram), au point que Telegram devienne un client secondaire/optionnel
> plutôt qu'indispensable. Décision : pas de coupure ni de dépréciation
> décidée alors (Telegram continue de tourner normalement, sur son chemin
> actuel, sans coût à le laisser vivre) — mais ça change la priorité
> immédiate. Plutôt que de brancher Telegram sur l'API tout de suite (ce
> qui le rendrait dépendant du serveur API sans bénéfice visible pour
> Chris), on construit d'abord le menu cliquable côté Domaine (documents +
> tâches), qui s'appuie sur les mêmes routes structurées déjà testées en
> Phase 1.
>
> **Mise à jour du 2026-08-30** : Le Domaine a effectivement repris
> l'usage quotidien. Chris confirme que Telegram ne deviendra **jamais**
> un vrai client de l'API — cette phase n'est donc plus "reportée" mais
> **obsolète** : le rôle cible de Telegram se limite à un canal de
> communication léger serveur → téléphone (notifications, alertes comme
> celle de `scripts/warmup_cache.py`), pas une interface à maintenir au
> niveau du web. Section gardée ci-dessous pour mémoire (le détail des
> étapes envisagées), pas comme travail à faire.

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
>
> **Révision du 2026-08-31 : matériel choisi.** Mini PC : **Geekom A6**
> (Ryzen 7 6800, 8c/16t, ~530€, 1 To NVMe réservé à l'OS/l'appli/le
> cache — pas au stockage des documents). NAS : **Synology DS224+**
> (~299€, CPU Intel Celeron J4125, RAM extensible à 6 Go, Btrfs) — pas
> le DS223 (CPU ARM, RAM non extensible, plus cher pour moins bien).
> **Architecture de stockage tranchée** : le NAS est la source de
> vérité UNIQUE des documents de Chris (volume réel à venir : centaines
> de Go, le `C:\Perso` mesuré à 3,2 Go sur le PC actuel n'est qu'un PC
> de travail, pas représentatif). Le mini-PC ne stocke AUCUNE copie des
> documents - il les lit à la volée sur le NAS par le réseau (partage
> SMB). Confirmé techniquement viable : la lecture réseau est
> transparente pour Python (`open()` marche pareil sur un chemin UNC
> que sur un chemin local) et pour l'OCR Tesseract (ne travaille que
> sur des octets en mémoire, indifférent à la source). Point
> d'implémentation à respecter le moment venu : utiliser un **chemin
> UNC direct** (`\\DS224+\...`) plutôt qu'un **lecteur réseau mappé**
> (lettre du type `Z:\`) - un lecteur mappé ne persiste que dans la
> session qui l'a créé, un chemin UNC avec identifiants enregistrés
> marche quel que soit comment le service Nigel est lancé. Compromis
> accepté : une brève indisponibilité de lecture si le NAS redémarre
> (mise à jour DSM) - géré comme une erreur ponctuelle, pas un crash.
> Achat pas encore fait à cette date ; migration à traiter comme son
> propre morceau de travail le moment venu (vérifier notamment comment
> Nigel centralise aujourd'hui la racine des documents avant de changer
> quoi que ce soit).

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
- [x] 6.2 (ajouté le 2026-08-29, suite à la question de Chris "es-tu sûr
      de pouvoir faire une barre de recherche efficace ?") Débloquer le
      routeur LLM déjà en place (`registry.py`/`llm_router.py`) : LLM pour
      comprendre/choisir l'outil, Python pour l'exécuter.
      **Découverte clé** : ce routeur existait déjà, complet et
      fonctionnel (il envoie la phrase + la liste des outils disponibles
      au LLM, qui renvoie directement `{tool_name, paramètres}` proprement
      structuré) — mais il n'était quasiment jamais atteint. Un verrou
      dans `orchestrator.py` bloquait avec une erreur générique tout
      message "à consonance documentaire" pour lequel la couche de règles
      heuristiques (des dizaines de chemins internes, `document_flow.py`)
      échouait à résoudre quoi que ce soit — sans jamais donner sa chance
      au routeur LLM. Autrement dit : le système "intelligent" existait
      déjà, il était juste coupé du reste par une couche de règles trop
      sûre d'elle-même. Ce n'était donc pas un chantier de plusieurs
      semaines mais un déblocage ciblé de 3 points précis :
  - [x] `document_flow.py` : la résolution implicite sur un mot seul cède
        maintenant la main (au lieu de renvoyer un échec déguisé en
        "traité") quand aucune piste, même approximative, n'existe pour
        un dossier. Le cas ambigu ("plusieurs dossiers ressemblent à...")
        garde le comportement existant — bonne UX, pas un bug.
  - [x] `orchestrator.py` : suppression du verrou redondant qui empêchait
        le routeur LLM d'être consulté.
  - [x] `llm_router.py` : le prompt demandait trop souvent une précision
        en mode conversationnel au lieu de lancer une recherche — ajout
        d'une règle explicite pour privilégier la recherche dès qu'un
        mot-clé exploitable existe.
  - Vérifié sur une instance isolée (port 8010, sans toucher au serveur
    de Chris) : "cherche anissa" et "où est le fichier budget" — les
    deux exemples exacts que Chris avait signalés — produisent
    maintenant une vraie liste cliquable, alors qu'ils étaient bloqués
    net avant. 417 tests verts (2 nouveaux).
  - **Limite honnête, non traitée ici** : sur une phrase vague sans
    mot-clé clair ("as-tu des infos sur X"), le routeur LLM peut encore
    halluciner un nom de fichier au lieu de chercher ou de répondre en
    conversation. C'est un réglage de prompt/heuristique différent du
    problème de plomberie réglé ici, à reprendre séparément si Chris
    rencontre ce cas en usage réel — pas promis comme réglé à 100 %.
  - **Reste à faire par Chris : relancer l'API** (Claude l'a fait une
    fois lui-même à sa demande le 2026-08-29 pour ce lot ; pour la
    suite, redemander à Claude de la relancer après chaque changement de
    code plutôt que de la lancer soi-même, pour éviter que les deux
    tournent en parallèle sur le même port).
  - [x] **Deux vrais bugs trouvés par Chris en retestant** (même jour) :
    - "ça me renvoie toujours vers anissa" — la barre de recherche
      n'envoyait jamais de `session_id` à `/ask`, qui retombe alors sur
      un identifiant par défaut (`"api-session"`) **partagé par toutes
      les recherches, de tous les visiteurs, jamais réinitialisé**. Le
      dossier résolu par une recherche restait donc mémorisé côté
      serveur et polluait les recherches suivantes sans rapport.
      Corrigé : une session jetable (UUID) par recherche — une barre de
      recherche n'a pas à se souvenir de la requête précédente.
    - "le retour me remet à l'accueil, pas dans Aide Anissa" — les
      items d'un LISTING de dossier (`lister_fichiers`, ex. "anissa"
      résolu en dossier) ne portaient que le nom nu du fichier, sans son
      chemin parent (contrairement aux résultats d'une recherche par
      nom/contenu, qui portent déjà le chemin complet) — la vraie cause
      remontait donc à l'API (`build_list_block`), pas seulement au
      front. Le lien profond vers la salle Documents atterrissait donc
      à la racine. Corrigé aux deux bouts : l'API expose maintenant
      `meta.dossier` sur chaque item, et la barre de recherche s'en sert
      pour reconstruire le chemin complet.
    - Vérifié en direct : "anissa" → "notes" → "budget" à la suite ne se
      polluent plus entre elles ; ouvrir un fichier trouvé via "anissa"
      puis faire "Retour" ramène bien dans "Aide Anissa". 417 tests
      verts côté API.
    - **Limite confirmée, pas nouvelle** : "budget" seul (sans verbe
      comme "cherche"/"où est") ne déclenche toujours pas de recherche
      côté LLM, même avec une session neuve — c'est exactement la
      limite déjà notée juste au-dessus (réglage de prompt), pas une
      régression liée aux deux bugs ci-dessus.
- [x] 6.2bis (ajouté le 2026-08-30, proposition de Chris après avoir lu
      les logs réels avec lui) : mode **Mot-clé / Texte** sur la barre
      de recherche du Domaine, même principe que le toggle déjà validé
      dans la salle Documents.
  - **Preuve dans les logs qui a tranché le débat** : "AON" et
    "Seenovate" (deux vrais noms de fichiers de Chris) atterrissaient en
    mode conversation libre côté LLM — réponse générique sur la société
    de courtage d'assurances AON, ou sur l'entreprise Seenovate — au
    lieu de chercher dans les documents. Le LLM ne peut structurellement
    pas deviner qu'un mot correspond à un fichier local sans que
    l'utilisateur le précise : ce n'est pas un réglage de prompt de
    plus à faire, c'est une ambiguïté qu'il vaut mieux lever côté UX.
  - "🔍 Mot-clé" appelle désormais `/documents/search` directement, sans
    passer par `/ask` ni le routeur LLM — une recherche par mot-clé
    cherche toujours, elle ne devine jamais s'il faut chercher ou
    discuter. "💬 Texte" garde le routeur LLM actuel (`/ask`) pour les
    questions ouvertes, l'usage des tâches, le chat général.
  - Corrigé au passage : ouvrir une **image** trouvée par la barre de
    recherche affichait "Format non pris en charge : .png" avant qu'un
    repli affiche quand même l'image (bug remonté par Chris, message
    d'erreur qui clignotait). Le lien profond transmet maintenant
    l'information "c'est une image" (déjà connue de la barre de
    recherche via `meta.image`), qui l'ouvre directement dans la
    visionneuse — même logique que `documents/page.tsx::openSelection`
    pour un clic normal dans la salle Documents.
  - Vérifié en direct : "AON" en mode Mot-clé renvoie les 2 PDF ; ouvrir
    une image trouvée par mot-clé affiche la visionneuse sans message
    d'erreur transitoire.
  - Limite du mode Mot-clé pour l'instant : ne cherche que dans les
    documents (nom ET contenu, voir 6.2ter juste en dessous), pas dans
    les tâches — pas d'outil de recherche par mot-clé équivalent pour
    les tâches aujourd'hui. Extensible plus tard si le besoin se
    confirme, pas fait par anticipation.
  - [x] Mode Mot-clé étendu à la recherche dans le CONTENU des
        documents (pas seulement leur nom), le même jour — demande de
        Chris : "Seenovate" ne se trouve pas dans un titre de fichier,
        mais dans le texte de "Cours JFM". Les deux recherches (nom +
        contenu) tournent en parallèle et sont fusionnées sans doublon ;
        un délai de 8s laisse de côté la recherche de contenu si elle
        traîne (cache froid, OCR à refaire — limite déjà documentée plus
        haut) plutôt que de bloquer la recherche par nom, quasi
        instantanée elle. Vérifié en direct : "Seenovate" trouve "Cours
        JFM.docx" avec l'extrait exact et le bon numéro de ligne, le
        lien profond ouvre directement au bon passage.

## Architecture cible pour le mode "Texte" (discussion du 2026-08-30)

**Le vrai problème, pas un bug de prompt** : le routeur LLM actuel
(`llm_router.py`) fait un seul appel, une seule décision par message —
soit UN outil (paramètres devinés en une fois depuis le texte), soit
"chat libre". Le mode chat libre appelle le LLM sans accès à rien de
local (`chat_free()`, aucun outil). Résultat observé dans les vrais
logs de Chris : "AON" et "Seenovate" (deux vrais noms/mots présents
dans ses documents) atterrissaient en chat libre, avec une réponse
générique sur la société AON ou l'entreprise Seenovate, sans jamais
avoir cherché localement. Ce n'est pas réparable par un réglage de
prompt de plus : le système ne peut poser qu'un seul geste par
question, alors que "creuser" (chercher, regarder le résultat, décider
d'aller lire un fichier précis, répondre) demande plusieurs étapes.

**Architecture cible : une vraie boucle agentique**, pas un routeur à
décision unique. Le LLM doit pouvoir : (1) recevoir la question + le
catalogue d'outils disponibles, (2) appeler un outil, (3) voir le
résultat et décider s'il en sait assez ou doit creuser encore (ex.
lire un fichier trouvé par la recherche), (4) répéter (avec une limite,
~4-5 aller-retours max, pour borner coût/latence), (5) répondre en
s'appuyant sur ce qu'il a vraiment trouvé. C'est le mécanisme "function
calling" natif d'OpenAI (le projet utilise déjà `gpt-4.1-mini` via
l'API OpenAI, qui le supporte). La brique d'exécution existe déjà et
n'a pas besoin d'être réécrite : `executer_outil()`
(`tool_executor.py`) est l'unique point de passage pour appeler un
outil, aujourd'hui comme demain.

**Pourquoi ça répond aussi au besoin "demain, Ménage"** : une fois la
boucle en place, ajouter un nouveau domaine (Ménage : "ajoute X au
to-do", "récurrence de Nettoyer le Balcon") ne demande aucun
changement à la boucle elle-même — juste déclarer de nouveaux outils,
le jour où Ménage expose une API (pas le cas aujourd'hui). C'est la
différence entre une architecture et un patch : un patch résout un
cas, une architecture absorbe le suivant sans qu'on y retouche.

**Garde-fou confidentialité, posé par Chris et vérifié avant de foncer**
: Chris veut pouvoir taguer certains documents "confidentiel" plus
tard — titre visible, mais aucun accès LLM au contenu (pas de résumé,
pas de question dessus). Vérifié que l'architecture cible le permet
nativement : tout appel d'outil (aujourd'hui comme la future boucle
agentique) passe par le même point unique (`executer_outil`) — un
garde-fou posé dans les fonctions qui envoient du contenu à un LLM
(`resumer_fichier_texte_local`, `question_fichier_texte_local`, et
leurs équivalents dossier) s'appliquerait donc automatiquement à tous
les appelants, y compris la boucle agentique, qui ne peut pas le
contourner puisqu'elle appelle exactement les mêmes fonctions. Question
ouverte à trancher le jour de l'implémentation : "confidentiel"
bloque-t-il aussi la recherche par mot-clé dans le contenu (filtrage
texte local, aucun LLM impliqué), ou seulement les opérations qui
envoient réellement du contenu à un LLM ? Rien à faire maintenant,
juste à garder en tête.

**Découpage en 4 étapes** (accord de Chris le 2026-08-30, "toutes les
étapes me conviennent") :
- [x] Étape 1 — Recherche mot-clé étendue au contenu (voir 6.2bis
      ci-dessus, faite immédiatement, indépendante du reste).
- [x] Étape 2 — Catalogue d'outils formalisé en schéma structuré (format
      JSON Schema attendu par l'API OpenAI) dans un nouveau module
      (`assistant/agent_tools.py`), à côté de `REGISTRE_OUTILS`
      (`registry.py`) — pas modifié, ni `llm_router.py` : le routeur à
      décision unique continue de fonctionner tel quel pour
      Telegram/terminal. 429 tests verts (6 nouveaux).
- [x] Étape 3 — Boucle agentique (`assistant/agent_loop.py`,
      `executer_agent()`) : appel OpenAI avec `tools=[...]`, exécution
      via `executer_outil()` (déjà l'unique point de passage), résultat
      renvoyé au modèle, répété jusqu'à réponse finale ou 5
      allers-retours max. 431 tests verts (6 nouveaux).
- [x] Étape 4 — Nouvel endpoint `POST /agent/ask` (séparé de `/ask`,
      routeur historique inchangé pour Telegram/terminal), branché sur
      le mode "Texte" de `SearchBar.tsx`.
  - **Vrai bug trouvé en testant "qui est Seenovate ?" en conditions
    réelles** (pas seulement en tests unitaires simulés) : le modèle
    cherchait bien, trouvait bien "Cours JFM.docx", mais s'obstinait sur
    `lire_fichier_texte_local` (qui ne renvoie que le DÉBUT du fichier)
    au lieu de `question_fichier_texte_local` (qui cible le bon passage
    via `construire_contexte_cible`) — la mention "Seenovate" étant plus
    loin dans le document, 4 tentatives identiques n'aboutissaient
    jamais (boucle jusqu'à la limite des 5 allers-retours). Corrigé en
    précisant dans le prompt de la boucle quel outil utiliser pour
    quel usage, et en interdisant explicitement de répéter le même
    appel avec les mêmes paramètres.
  - Vérifié en conditions réelles (vrai déploiement, vrai appel OpenAI,
    pas simulé) sur les deux cas exacts signalés par Chris :
    - "qui est Seenovate ?" → cherche par nom (rien) → cherche dans le
      contenu (trouve Cours JFM.docx) → pose une question ciblée dessus
      → répond correctement en 3 appels d'outils.
    - "budget" seul → cherche et liste les 3 fichiers réels
      (`budget_2026.xlsx`, `budget_multi_feuilles_test.xlsx`,
      `FV_-_Tenir_un_Budget.png`), au lieu de l'ancienne réponse
      inventée ("personnel, entreprise...") sans avoir jamais cherché.
  - 431 tests verts côté API, aucune régression sur le routeur existant
    (Telegram/terminal, mode "Mot-clé") ni sur `/ask`.

**Bilan de ce chantier** : parti d'une question de Chris ("es-tu sûr de
pouvoir faire une barre de recherche efficace ?") après plusieurs
rounds de patchs ponctuels, la vraie cause a fini par être identifiée
(un routeur à décision unique, incapable de creuser) et corrigée par
une architecture qui absorbe le cas suivant sans qu'on y retouche —
exactement la différence que Chris demandait entre patch et
architecture.

- [x] 6.2quater (ajouté le 2026-08-30, round de test suivant sur la
      nouvelle architecture) : quatre retours de Chris, tous corrigés le
      même jour.
  - **Mot-clé en deux temps** : la fusion automatique titre+contenu
    (6.2bis) noyait un mot courant comme "budget" sous des dizaines
    d'occurrences de contenu. Revenu à un vrai deux-temps (titres
    d'abord, contenu seulement via un bouton "Chercher aussi dans le
    contenu des documents") — même logique que la salle Documents,
    dont Chris pensait (à raison) qu'elle fonctionnait déjà ainsi côté
    Domaine.
  - **Occurrences multiples perdues** : un fichier avec plusieurs
    mentions du mot cherché n'affichait/ne rendait cliquable que la
    première (déjà présentes côté API dans `meta.extraits`, jamais
    exploitées côté front). Chaque occurrence est maintenant sa propre
    ligne cliquable.
  - **"Retour" ne remontait qu'une fois** dans la salle Documents,
    puis disparaissait. Cause réelle plus profonde que prévu : un
    chemin venant d'un lien profond utilise `\` (convention Windows du
    backend) alors que la navigation interne utilise `/` — `currentPath`
    mélangeait les deux, et le découpage par `/` sautait un niveau
    entier. Normalisé vers `/` dès l'entrée dans `currentPath`.
  - **Citation de source manquante** en mode Texte : une réponse
    correcte mais qui ne disait pas d'où elle venait, ni qu'elle était
    limitée au contenu d'un seul document. Le prompt de la boucle
    agentique exige désormais de citer le fichier et de signaler une
    information partielle. Vérifié : "qui est Seenovate ?" répond
    maintenant "D'après le fichier Cours JFM.docx, ...".
  - Vérifié en direct sur les quatre : "budget" → 3 titres puis, sur
    demande, 23 occurrences de contenu individuellement cliquables ; 3
    clics sur "Retour" remontent fichier → sous-dossier → dossier
    parent → accueil ; citation de source visible en mode Texte.
  - **Question posée par Chris, pas encore traitée** : un balayage
    planifié (nuit/semaine) de tous les documents pour maintenir le
    cache d'extraction "chaud" en permanence, pertinent surtout une
    fois le futur NAS + mini PC 24/7 en place. Confirmé faisable
    (tâche planifiée cron/Planificateur de tâches qui déclenche
    l'extraction de chaque fichier) mais pas fait — Chris doit
    confirmer s'il veut que ce soit la prochaine étape.
- [x] 6.2quinquies (ajouté le 2026-08-30, même journée) : trois derniers
      retours de Chris sur le mode Texte et l'affichage des occurrences.
  - **Occurrences regroupées** : un fichier avec plusieurs mentions
    (ex. "BFR" trouvé ligne 50 ET 51 de "Cours JFM.docx") affichait
    deux cartes identiques répétant le nom du fichier. Regroupées sous
    une seule carte, occurrences listées dessous, chacune restant
    individuellement cliquable.
  - **Mémoire de conversation** : chaque question au mode Texte
    repartait de zéro ("donne moi l'accès", en suite d'un "ouvre le
    dossier anissa" précédent, ne voulait rien dire au modèle). Ajout
    d'un historique visible (bulles question/réponse), transmis par le
    client à chaque appel — le serveur reste sans état (pas de
    session_id, même principe que le mode Mot-clé), donc aucun risque
    de pollution entre visiteurs comme celle trouvée sur `/ask`. Un
    bouton "Réinitialiser la conversation" efface tout sur demande.
  - **Accès document en mode Texte** : `/agent/ask` peut désormais
    renvoyer un second bloc "liste" cliquable en plus du texte, quand
    le dernier outil de recherche/listing appelé par la boucle a
    réussi — mêmes constructeurs que `/documents/*` et le mode
    Mot-clé.
  - Vérifié en direct : "BFR" → une carte "Cours JFM.docx" avec L50 et
    L51 dessous ; "ouvre le dossier anissa" puis "donne moi l'accès"
    montre que le modèle comprend maintenant de quel dossier il parle
    (avant : question totalement hors-sujet) ; Reset efface la
    conversation proprement.
  - **Limite honnête observée en testant** : quand le modèle répond à
    une relance depuis sa propre mémoire de conversation sans rappeler
    d'outil ce tour-ci, aucun bloc navigable n'est généré pour ce
    tour-là — mémoire et bloc navigable ne se combinent pas toujours
    parfaitement. À suivre sur usage réel plutôt qu'à sur-corriger sans
    plus de cas concrets.
- [x] 6.2sexies (ajouté le 2026-08-30, retour sur capture d'écran) :
      refonte de l'affichage du chat en mode Texte.
  - Chaque tour de conversation porte désormais SES PROPRES sources et
    son bloc navigable (nouveau type de bloc `"sources"` côté API,
    petit lien italique cliquable, distinct d'un vrai bloc `"list"`) —
    rendus DANS la bulle de réponse, plus un bloc flottant partagé qui
    ne reflétait que le dernier tour et "disparaissait" au tour
    suivant.
  - Bouton plier/déplier la conversation — une conversation qui
    grandissait masquait les icônes du Domaine en dessous. Se
    redéploie automatiquement à la question suivante.
  - Vérifié en direct sur deux tours successifs : chacun garde son
    propre contenu (liste de fichiers pour l'un, citation de source
    pour l'autre), sans rien écraser.
  - **Reportés, pas oubliés** (proposés à Chris, pas encore validés) :
    - Un menu de navigation entre occurrences dans la salle Documents
      elle-même (comme le fait déjà Telegram — voir
      `assistant/document_browser.py::_occurrence_actions` — précédent/
      suivant), en plus des occurrences déjà cliquables individuellement
      dans les résultats de recherche.
    - Chat persistant sur toutes les pages (Tâches, Documents, Ménage),
      pas seulement l'accueil — changement de portée (layout partagé)
      plutôt qu'un ajout au composant de recherche, à traiter comme une
      étape à part plutôt qu'un patch de plus.
- [x] 6.2septies (ajouté le 2026-08-30, même journée) : les deux points
      reportés en 6.2sexies, faits + le balayage planifié.
  - **Chat persistant sur toutes les pages** — "un ambassadeur qui ne
    me quitte jamais quand je me balade" (Chris). `SearchBar` déplacé
    de la page d'accueil vers le layout racine (`app/layout.tsx`),
    masqué uniquement sur `/login`. Vérifié en direct : la conversation
    reste disponible et continue depuis la salle Documents, sans
    perdre le fil en changeant de page.
  - **Documents associés affichés sur demande**, plus par défaut à
    chaque tour (bouton "📄 Voir les documents associés (N)") — retour
    de Chris : "ça prend de la place pour rien".
  - **Navigation précédent/suivant entre occurrences** dans la vue de
    lecture d'un document, même principe que Telegram
    (`assistant/document_browser.py::_occurrence_actions`). Le mot-clé
    cherché est transmis via l'URL (nouveau paramètre `q`, mode
    Mot-clé uniquement) ; à l'arrivée, une recherche dans ce fichier
    (`/documents/search-in-file`, déjà existant) construit la liste
    d'occurrences. Vérifié en direct sur "Seenovate" → Cours JFM.docx :
    bascule "Occurrence 1/2" → "2/2" avec le bon contenu à chaque fois.
  - **Balayage planifié** (`scripts/warmup_cache.py`) — parcourt tous
    les fichiers compatibles et déclenche leur extraction via
    `lire_contenu_fichier_autorise()` (déjà l'unique point de passage,
    cache inclus) ; un fichier déjà en cache est ignoré quasi
    instantanément, seuls les fichiers jamais ouverts coûtent
    réellement du temps (OCR). Log dédié (`logs/warmup_cache.log`),
    code de sortie non nul en cas d'erreur. Enregistré comme tâche
    planifiée Windows ("Nigel - Balayage cache documents", quotidienne
    23h30, rattrapage automatique si le PC est éteint à l'heure
    prévue) — vérifié par un déclenchement manuel réel via le
    Planificateur de tâches (`LastTaskResult = 0`), pas seulement en
    ligne de commande.
    - **Reporté, pas oublié** : une alerte Telegram en plus du log en
      cas d'échec — l'infrastructure d'envoi existe déjà
      (`run_telegram.py`) mais pas de `chat_id` stocké de façon
      persistante pour un envoi hors ligne (push) depuis un script
      autonome. À faire si le besoin se confirme.
  - **Vision long terme notée par Chris, hors scope pour l'instant** :
    connecter une capacité de type "Claude Code" dans le chat, avec
    accès aux fichiers du futur mini PC, pour des demandes comme
    "ajoute une icône" ou "inverse les boutons X et Y" directement
    depuis la conversation. Gardé en tête comme direction future, pas
    un chantier engagé.
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
