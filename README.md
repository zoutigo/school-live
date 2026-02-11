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

### 1) Installer

```bash
npm install
```

### 2) Lancer PostgreSQL

```bash
docker compose -f docker/docker-compose.yml up -d postgres
docker compose -f docker/docker-compose.yml ps
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

### 5) Lancer le web

```bash
npm run -w @school-live/web dev
```

### 6) Lancer le mobile

```bash
npm run -w @school-live/mobile dev
```

Variable mobile utile:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

### 7) Arreter PostgreSQL

```bash
docker compose -f docker/docker-compose.yml stop postgres
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
