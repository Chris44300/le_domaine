# Le Domaine

Interface maîtresse personnelle de Chris : un écran d'accueil façon
téléphone (grille de "pièces" — Tâches, Documents, Ménage...), et une
barre de recherche persistante en bas de chaque écran, connectée à un
cœur métier Python ("Nigel") partagé avec le bot Telegram du même nom —
un seul cerveau, plusieurs façons d'y accéder.

Le détail complet (contexte, décisions d'architecture actées au fil des
sessions, plan de construction phase par phase, journal des rounds de
test réels) est dans [`PLAN.md`](PLAN.md) — **à lire en premier** avant
toute reprise de session ou contribution. Ce README couvre "comment ça
marche et comment le lancer" ; `PLAN.md` couvre "pourquoi c'est comme ça,
et ce qui reste à faire".

**Tu arrives avec une nouvelle pièce à intégrer** (un autre dépôt, ex.
"voici le lien du Domaine, voici le lien de la nouvelle tuile") ? Va
directement à [`GABARIT_NOUVELLE_PIECE.md`](GABARIT_NOUVELLE_PIECE.md) —
c'est la checklist étape par étape écrite pour exactement ce cas, avec
Ménage comme exemple de référence déjà fait.

## Les projets liés

- **Ce dépôt** (`Le Domaine`) — l'interface web (Next.js), dans `web/`.
  Toutes les pièces intégrées (Tâches, Documents, Ménage, Road Map) y
  vivent, quel que soit leur backend.
- **Nigel** (`../Projet - Assistant IA (Nigel)/assistant-ia-personnel`) —
  le cœur métier Python : documents, tâches, le "majordome" (chat/
  recherche), et l'API FastAPI que ce dépôt appelle. Voir son propre
  README pour l'installation et le lancement de l'API.
- **Ménage** (`../Projet - Taches ménage/Application Tâches ménagères`)
  — dépôt d'origine de l'application Ménage (Next.js + Supabase),
  toujours déployé indépendamment et utilisé par Mel au quotidien.
  Réellement intégrée à Domaine depuis fin août 2026 (écrans, permissions
  par personne, chat) — les deux déploiements partagent la même base
  Supabase, voir `PLAN.md` pour le détail du portage et
  `GABARIT_NOUVELLE_PIECE.md` pour la méthode générale qui en a été
  extraite.
- **Reporting** — prochaine pièce, volontairement démarrée dans son
  propre dépôt séparé (pas encore créé à l'écriture de ce README) plutôt
  que directement ici, le temps qu'elle soit construite ; sera intégrée
  ensuite en suivant `GABARIT_NOUVELLE_PIECE.md`, comme Ménage.

## Comment ça marche

- **Next.js** (App Router), hébergé sur **Vercel**
  (`https://le-domaine-tau.vercel.app`).
- Un jeton d'accès unique partagé (`DOMAIN_ACCESS_TOKEN`) protège
  l'accès — pas encore de comptes par personne (voir `PLAN.md`, section
  réseau multi-utilisateurs, pas commencée).
- Toutes les données viennent de l'**API Nigel** (FastAPI), jamais d'un
  accès direct à des fichiers ou une base de données depuis ce dépôt.
  L'adresse de l'API est configurée via `NEXT_PUBLIC_API_URL` (voir
  `web/.env.local.example`) — en local sur le même PC, ou via
  l'adresse HTTPS Tailscale de la machine qui héberge Nigel pour un accès
  distant réel (téléphone, Vercel).

### La barre de recherche (persistante sur toutes les pages)

Rendue dans `app/layout.tsx` (pas seulement l'accueil) — disponible en
te baladant dans Documents, Tâches, etc. Deux modes :

- **🔍 Mot-clé** — recherche déterministe et directe (`/documents/search`
  puis, sur demande, `/documents/search-content`), jamais d'ambiguïté :
  un mot-clé cherche toujours, ne "discute" jamais.
- **💬 Texte** — question ouverte, passe par la boucle agentique de
  Nigel (`POST /agent/ask`) : le modèle peut chercher, lire, puis
  répondre, en plusieurs étapes si besoin, avec mémoire de la
  conversation (côté client uniquement, jamais stockée sur le serveur)
  et citation systématique des sources consultées.

## Lancer en local

```bash
cd web
npm install
cp .env.local.example .env.local   # puis remplir les valeurs
npm run dev
```

Nécessite que l'API Nigel tourne (voir son README, section "Lancement >
API") et que `NEXT_PUBLIC_API_URL` pointe dessus.

## Déployer (Vercel)

Le dépôt est déjà connecté à Vercel (déploiement automatique sur push
vers `main`). Les variables d'environnement (`NEXT_PUBLIC_API_URL`,
`DOMAIN_ACCESS_TOKEN`) se configurent dans le dashboard Vercel du
projet — **`NEXT_PUBLIC_*` est figé au moment du build**, un changement
de valeur seul ne suffit pas, il faut redéployer après modification.

## État actuel

Ménage réellement intégré (écrans, permissions par personne, chat) et
pièce Road Map ajoutée — voir `PLAN.md` (section "Feuille de route
actuelle" en tête de fichier) pour le détail complet, le journal des
rounds de test réels, et la liste priorisée de ce qui reste ouvert :
réseau multi-utilisateurs, pièce Reporting (prochain chantier, dans son
propre dépôt), confidentialité par tag, sauvegardes, alerte serveur.
