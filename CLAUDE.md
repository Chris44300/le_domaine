# Le Domaine

Avant toute action dans ce projet, lis entièrement `PLAN.md` — il contient
le contexte complet (vision, décisions d'architecture actées, pourquoi),
l'état d'avancement (cases cochées), et les deux projets liés dont ce
projet réutilise le travail déjà fait :

- Nigel (bot Telegram, futur cœur métier) :
  `C:\Perso\Projet - Assistant IA\Projet - Assistant IA (Nigel)\assistant-ia-personnel`
- Ménage (Next.js/Supabase, première pièce du Domaine) :
  `C:\Perso\Projet - Taches ménage\Application Tâches ménagères`

## Règles de travail

- Mettre à jour `PLAN.md` (cocher les étapes faites, noter les écarts au
  plan) à chaque avancée concrète — c'est le document de référence pour
  toute reprise de session future, il ne doit jamais devenir périmé.
- Avancer par petites tranches testées, comme sur les deux projets liés
  ci-dessus (jamais un gros chantier ouvert sans rien de vérifiable).
- Ne pas dupliquer en JavaScript/TypeScript une logique qui existe déjà en
  Python côté Nigel — l'exposer via l'API plutôt que la réécrire.
- Certaines étapes du plan sont marquées 🎓 (nouveau pour l'utilisateur,
  non-développeur sur ces sujets) : expliquer et guider pas à pas plutôt
  que supposer la connaissance acquise.
