# school-live

Monorepo TypeScript pour une plateforme multi-ecoles (tenancy par route `schoolSlug`).

## Routage multi-school

- Web: `/schools/:schoolSlug/...`
- API: `/api/schools/:schoolSlug/...`
- Mobile: stocke `schoolSlug` et l'injecte dans tous les appels API

## Structure

- `apps/api`: NestJS + Prisma
- `apps/web`: Next.js 16 (App Router)
- `apps/mobile`: React Native / Expo
- `packages/types`: types partages
- `packages/config`: config partagee
- `packages/ui`: composants partages (a terme)

## Prerequis

1. Copier `apps/api/.env.example` vers `apps/api/.env`
2. Verifier `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`

## Commandes de developpement

Depuis la racine `school-live`:

### Demarrage rapide (copier/coller)

Si tu veux l equivalent du `npm run dev` d un projet simple, lance exactement ces commandes (dans cet ordre):

```bash
# Terminal 1 - installation + infra + prisma client
npm install
docker compose -f docker/docker-compose.dev.yml up -d postgres redis minio media
npm run db:generate

# Terminal 2 - API
npm run -w @school-live/api dev

# Terminal 3 - Worker (emails/jobs)
npm run -w @school-live/api worker:dev

# Terminal 4 - Web
npm run -w @school-live/web dev
```

Application web: `http://localhost:3000`  
API: `http://localhost:3001/api`

`npm run db:migrate -- --name ...` est a lancer uniquement quand le schema Prisma change.

### 1) Installer

```bash
npm install
```

### 2) Lancer PostgreSQL + Redis + MinIO + media

```bash
docker compose -f docker/docker-compose.dev.yml up -d postgres redis minio media
docker compose -f docker/docker-compose.dev.yml ps
```

### 3) Prisma schema (multi-fichiers)

Les sources Prisma sont dans `apps/api/prisma/schema/*.prisma`.
Le schema consomme par Prisma est genere dans `apps/api/prisma/schema.prisma`.

```bash
npm run db:schema:gen
npm run db:generate
npm run db:migrate -- --name init-multischool
```

Commandes alternatives workspace API:

```bash
npm run -w @school-live/api prisma:generate
npm run -w @school-live/api prisma:migrate:dev -- --name init-multischool
npm run -w @school-live/api prisma:studio
```

### 4) Lancer l'API

```bash
npm run -w @school-live/api dev
```

### 5) Lancer le worker (jobs async: emails, etc.)

```bash
npm run -w @school-live/api worker:dev
```

### 6) Lancer le web

```bash
npm run -w @school-live/web dev
```

### 6.bis) Lancer le microservice media (upload/resize images)

```bash
npm run -w @school-live/api media:dev
```

MinIO (local):

- API S3: `http://localhost:9000`
- Console: `http://localhost:9001`
- Login: `minioadmin` / `minioadmin`
- Region par defaut: `af-south-1` (choix recommande pour un service cible Afrique/Cameroun).
- Health microservice media: `GET http://localhost:3002/health`

### 7) Lancer le mobile

```bash
npm run -w @school-live/mobile dev
```

Variable mobile utile:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

### 8) Arreter les services infra

```bash
docker compose -f docker/docker-compose.dev.yml stop postgres redis minio media
```

## API exposee

### Auth

- `POST /api/auth/login` (landing email/password, redirection via `schoolSlug`)
- `POST /api/schools/:schoolSlug/auth/login`
- `GET /api/schools/:schoolSlug/me`
- `GET /api/schools/:schoolSlug/auth/me` (alias)

### Ecole (public)

- `GET /api/schools/:schoolSlug/public`

### Notes

- `POST /api/schools/:schoolSlug/grades`
- `GET /api/schools/:schoolSlug/grades`
- `PATCH /api/schools/:schoolSlug/grades/:id`
- `DELETE /api/schools/:schoolSlug/grades/:id`

### Provisioning / Administration

- `POST /api/system/admins` (`SUPER_ADMIN`)
- `POST /api/system/schools` (`ADMIN`, `SUPER_ADMIN`) with embedded `school_admin` creation
- `POST /api/schools/:schoolSlug/admin/classrooms` (`SCHOOL_ADMIN`, `SUPER_ADMIN`)
- `POST /api/schools/:schoolSlug/admin/teachers` (`SCHOOL_ADMIN`, `SUPER_ADMIN`)
- `POST /api/schools/:schoolSlug/admin/students` (`SCHOOL_ADMIN`, `SUPER_ADMIN`)
- `POST /api/schools/:schoolSlug/admin/parent-students` (`SCHOOL_ADMIN`, `SUPER_ADMIN`)

## Controle d'acces

- JWT contient `sub`, `schoolId`, `role`
- Guards NestJS:
  - `JwtAuthGuard`
  - `SchoolScopeGuard`
  - `RolesGuard`
- Regles metier notes:
  - `SCHOOL_ADMIN`: gestion complete dans son ecole
  - `TEACHER`: create/update/list selon ses assignments `TeacherClassSubject`
  - `PARENT`: lecture notes de ses enfants lies
  - `STUDENT`: lecture de ses propres notes
  - `SUPER_ADMIN`: cross-school

## Verification

```bash
npm run typecheck
npm run build
npm run test
```

## Authentification (logique claire)

### Vue d ensemble

- Compte unique `User` pour tous les profils.
- 3 modes d authentification:
  - Email + mot de passe
  - Telephone + PIN (PIN exact: **6 chiffres**)
  - SSO Google / Apple via NextAuth
- Statut activation ecole:
  - `PENDING`: compte en attente, acces donnees ecole bloque
  - `ACTIVE`: acces autorise selon roles
  - `SUSPENDED`: acces bloque

### Regles metier principales

1. Un compte ecole cree par administration est place en `PENDING`.
2. Tant que le compte ecole n est pas valide, les routes scolarisees refusent l acces (`ACCOUNT_VALIDATION_REQUIRED`).
3. Validation possible avec:

- code d activation ecole
- ou PIN initial
- puis definition du PIN final (6 chiffres).

4. Connexion SSO (Google/Apple):

- si compte inconnu: refuse (`401`)
- si compte en attente: redirection vers `compte-en-attente`
- si profil incomplet (nom/prenom/genre/telephone manquants): redirection vers ecran de completion SSO
- sinon session API ouverte.

5. Platform roles:

- pas de contrainte de telephone confirme pour exister
- mais si champs profil requis manquent, completion SSO demandee.

6. Anti-bruteforce:

- verrou temporaire des tentatives invalides (password / phone+PIN / SSO / activation)
- reponse `429` avec code `AUTH_RATE_LIMITED`.

7. Audit auth:

- chaque tentative critique est journalisee (`SUCCESS`, `FAILURE`, `BLOCKED`) dans `AuthAuditLog`
- evenements couverts: login password, login phone, login SSO, activation, change password, change PIN.

8. Codes d activation:

- creation d un nouveau code => invalidation immediate des codes actifs precedents pour ce user/ecole
- activation reussie => tous les codes restants de cette ecole sont marques utilises.

### Endpoints Auth importants

- Session / login:
  - `POST /api/auth/login`
  - `POST /api/auth/login-phone`
  - `POST /api/auth/sso/login`
  - `POST /api/schools/:schoolSlug/auth/login`
  - `POST /api/schools/:schoolSlug/auth/login-phone`
- Activation ecole:
  - `POST /api/auth/activation/start`
  - `POST /api/auth/activation/complete`
- Profil SSO:
  - `POST /api/auth/sso/profile/options`
  - `POST /api/auth/sso/profile/complete`
- Maintenance secrets:
  - `POST /api/auth/change-password`
  - `POST /api/auth/change-pin`

### Ecrans web relies a ces flux

- Callback SSO: `/auth/sso-callback`
- Completion profil SSO: `/auth/completer-profil-sso`
- Compte en attente / activation: `/compte-en-attente`
- Login global: `/`
- Login ecole: `/schools/:schoolSlug/login`

## Guide .env et URLs OAuth

### API (`apps/api/.env`)

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `JWT_REFRESH_TOKEN_PEPPER`
- `PASSWORD_RESET_TOKEN_PEPPER`
- `ACTIVATION_CODE_PEPPER`
- `AUTH_RATE_LIMIT_PEPPER`
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS` (defaut: `5`)
- `AUTH_RATE_LIMIT_WINDOW_SECONDS` (defaut: `900`)
- `AUTH_RATE_LIMIT_BLOCK_SECONDS` (defaut: `900`)
- `ACTIVATION_CODE_TTL_HOURS` (defaut: `48`)
- `WEB_URL` (ex: `http://localhost:3000`)

### Web (`apps/web/.env.local`)

- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=<secret long>`
- `AUTH_GOOGLE_CLIENT_ID=<google-client-id>`
- `AUTH_GOOGLE_CLIENT_SECRET=<google-client-secret>`
- `AUTH_APPLE_ID=<apple-service-id>`
- `AUTH_APPLE_SECRET=<apple-private-jwt>`

### URLs OAuth a declarer

#### Google

- Local: `http://localhost:3000/api/auth/callback/google`
- Prod (exemple): `https://app.school-live.com/api/auth/callback/google`

#### Apple

- Local: `http://localhost:3000/api/auth/callback/apple`
- Prod (exemple): `https://app.school-live.com/api/auth/callback/apple`

## Tests auth ajoutes

### UI cibles (web)

```bash
npm run -w @school-live/web test -- src/app/auth/sso-callback/sso-callback-client.ui.test.tsx src/app/compte-en-attente/pending-account-client.ui.test.tsx src/app/auth/completer-profil-sso/sso-profile-completion-client.ui.test.tsx
```

### E2E auth modes (api)

```bash
npm run -w @school-live/api test:e2e -- test/auth-modes.e2e-spec.ts
```

Ce fichier couvre les 3 modes d auth + erreurs:

- password (success + invalid credentials)
- phone+PIN (success + wrong PIN + compte pending)
- SSO (success + unknown account + profil incomplet puis completion)
- anti-bruteforce (blocage apres tentatives invalides)
- audit (presence d entrees success/failure)
- activation (invalidation des anciens codes apres activation)
