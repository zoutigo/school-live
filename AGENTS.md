# AGENTS.md — scolive-web

## Git

- Après toute modification du code (correction de bug, nouvelle fonctionnalité, correctif), terminer systématiquement par : des tests approfondis unitaires, fonctionnels et d'intégration (front ET back, y compris la gestion des erreurs), puis les vérifications précommit (format, lint, typecheck, build), et enfin un commit.
- Le push sur le remote reste soumis à une instruction explicite de l'utilisateur (voir `/release-ci` pour le cycle complet push → PR → CI → merge).
- Sauf indication explicite contraire de l'utilisateur, tout le développement se fait sur la branche `dev`.
- Si la branche courante n'est pas `dev`, basculer dessus avant toute modification ou signaler clairement le blocage.

## Agents

- Ne jamais utiliser de sous-agents ou de délégation pour réaliser le travail demandé.
- Faire tout le travail soi-même, étape par étape si nécessaire.

## Déploiement et VPS

- Avant toute action de déploiement, d'infra ou d'exploitation VPS, lire `docs/ops/vps-deploy.md`.
- Ce document est la source de vérité opérationnelle pour les chemins de déploiement, compose files, réseaux, reverse proxy et procédure de déploiement.
- Si le fichier manque ou semble obsolète, le signaler explicitement avant d'aller plus loin.

## Architecture multi-tenant

- Web : routes sous `/schools/:schoolSlug/...`
- API : routes sous `/api/schools/:schoolSlug/...`
- Mobile : conserve `schoolSlug` et appelle l'API avec ce contexte

Règles à ne pas casser :

- Ne jamais faire confiance au client pour le contexte école.
- Ne jamais accepter `schoolId` comme source de vérité côté client.
- Le backend reste la source de vérité pour l'autorisation et les règles métier.
- Les requêtes et contrôles d'accès sensibles doivent rester scopés par école.

## Web et UI

- Avant de créer un nouveau composant UI, vérifier s'il existe déjà un composant réutilisable dans `apps/web/components` ou `packages/ui`.
- Réutiliser ou étendre l'existant avant d'ajouter un nouveau composant.
- Les pages école vivent sous `apps/web/app/schools/[schoolSlug]/...`.
- La navigation ou le masquage par rôle côté frontend ne remplace jamais l'autorisation côté API.

## Formulaires web

- Utiliser `react-hook-form` avec validation `zod` par défaut.
- Mode de validation attendu : `onChange`.
- Les erreurs inline sont obligatoires.
- Réutiliser les helpers et composants de formulaire existants avant d'introduire une nouvelle abstraction locale.

## Internationalisation (i18n)

Le web utilise un système de traduction maison dans `apps/web/src/i18n/` :

- `translations.ts` : dictionnaires par locale, clés namespacées
- `useTranslation.ts` : hook `useTranslation()` -> `{ locale, setLocale, t }`
- Locales supportées : `fr` et `en`

Pour tout nouveau développement ou correction :

- Ne jamais laisser de texte en dur dans le code.
- Ajouter chaque clé dans toutes les locales supportées.
- Afficher le texte via `t("namespace.key")`.
