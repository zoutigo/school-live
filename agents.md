# agents.md — SchoolLive (Next.js 16 + NestJS + React Native)

## Mission

Build and maintain a multi-school platform (no subdomains) using route-based tenancy:

- Web: /schools/:schoolSlug/...
- API: /api/schools/:schoolSlug/...
- Mobile: stores schoolSlug and calls the API using it.

Primary goals: security (school isolation), maintainability, performance, and clear architecture.

---

## Mandatory VPS context loading (must follow)

- Before any VPS/deployment/infrastructure action (analysis, command, change, advice), the agent MUST read:
  - `docs/ops/vps-deploy.md`
- If the file is missing or outdated, the agent must:
  - state it explicitly,
  - proceed carefully with verification commands,
  - and propose updating `docs/ops/vps-deploy.md` at the end.
- The agent must treat `docs/ops/vps-deploy.md` as the operational source of truth for:
  - deployment paths,
  - compose files,
  - networks,
  - reverse proxy routing,
  - and deploy procedure.

---

## Collaboration transparency (must follow)

- The user must see the execution flow in real time.
- For every non-trivial request, the agent must provide:
  - a short `Plan` before running commands,
  - frequent progress updates while working (`step in progress`, then `step done`),
  - a final `Result` with what changed and where.
- Do not wait until the end to explain what is being done.
- If the user explicitly asks for step-by-step, keep updates continuous until completion.

---

## Restricted environment escalation (must follow)

- If a command, hook, test suite, or verification depends on Docker, docker compose, system services, local daemons, privileged sockets, or any resource that may be blocked by the current execution sandbox, the agent MUST:
  - detect that the current context may be insufficient,
  - request elevated permissions,
  - and rerun the command in the proper context before concluding that the dependency is unavailable.
- The agent must not treat `docker info` / Docker-based e2e as unavailable without first attempting the escalated check when the task depends on it.
- This applies in particular to:
  - pre-commit / pre-push hooks,
  - e2e suites using Dockerized databases or services,
  - local API/media/worker processes,
  - and any system-level dependency check.

---

## Non-negotiables (must follow)

1. **Never trust the client for school context**
   - Never accept `schoolId` from the client.
   - Always derive `schoolId` from the authenticated JWT payload.
   - Always enforce that `:schoolSlug` route param maps to the same `schoolId` in the JWT (except SUPER_ADMIN).

2. **Multi-tenant safety**
   - Every sensitive table includes `schoolId`.
   - Every query must scope by `schoolId` from JWT.
   - Implement a `SchoolScopeGuard` (NestJS) used in every school-scoped controller.

3. **Do not add new components if an existing shared component exists**
   - Before creating any new UI component, search in:
     - `apps/web/components`
     - `packages/ui`
   - If a similar component exists, reuse or extend it.
   - If you must create a new component, ensure it is generic and reusable and add it to `packages/ui` when appropriate.

4. **Backend is the source of truth**
   - Frontend role gating is only for UX; authorization must be enforced on the API.

5. **No duplicate business rules**
   - Business logic lives in the API (NestJS services).
   - Web/mobile only call API and render results.

6. **No over-engineering**
   - Prefer simple RBAC + ownership checks first.
   - Introduce advanced permission tables only when truly needed.

---

## Repository structure rules

- `apps/api` => NestJS API + Prisma
- `apps/web` => Next.js 16 (App Router)
- `apps/mobile`=> React Native / Expo
- `packages/types` => shared TS types (DTO interfaces if needed)
- `packages/ui` => shared UI components (optional, grows over time)

Do not create new top-level folders without a clear reason.

---

## API (NestJS) implementation rules

### Authentication

- JWT payload MUST contain:
  - `sub` (userId)
  - `schoolId`
  - `role`
- Provide endpoints:
  - `POST /api/schools/:schoolSlug/auth/login`
  - `GET  /api/schools/:schoolSlug/me`

### Authorization

- Use decorators + guards pattern:
  - `@Roles(...)` + `RolesGuard`
  - `SchoolScopeGuard` (schoolSlug must match JWT.schoolId)
  - `JwtAuthGuard`

### Ownership

Implement ownership checks in services (not controllers):

- TEACHER: can mutate grades only for assigned (classId, subjectId).
- PARENT: can read grades only for linked children.
- STUDENT: can read only own grades.
- SCHOOL_ADMIN: full access within their school.
- SUPER_ADMIN: cross-school access for platform operations.

### DTO + Validation

- Use class-validator or zod consistently for request validation.
- Reject unknown fields when possible.

### Error handling

- Use consistent HTTP errors:
  - 401 unauthenticated
  - 403 unauthorized
  - 404 not found (avoid leaking existence across schools)

---

## Web (Next.js) rules

- All school pages live under:
  - `apps/web/app/schools/[schoolSlug]/...`
- The layout at `apps/web/app/schools/[schoolSlug]/layout.tsx` should:
  - load school branding (name/logo/colors) by slug
  - provide a SchoolContext to children
- Mobile-first spacing must explicitly support `320px` width:
  - the site-wide horizontal gutter rule is `8px` at `320px`,
  - `12px` from `360px`,
  - `24px` from `768px`,
  - agents should reuse shared gutter utilities/classes instead of hardcoding large `p-6` / `px-6` mobile spacing on key page shells.
- Web forms standard:
  - use `react-hook-form` with `zod` validation by default,
  - validation mode must be `onChange`,
  - inline field errors are required,
  - primary submit actions stay disabled until the form is valid,
  - reuse shared form helpers/components before introducing local form wrappers.

### Frontend role gating

- Hide nav entries based on role for UX,
- but DO NOT rely on it for security.

---

## Mobile (React Native) rules

- Must support a `SchoolSelect` screen:
  - user inputs `schoolSlug` or selects from a list
  - persist `schoolSlug` (SecureStore/AsyncStorage)
- All API calls must be built with:
  - `/api/schools/${schoolSlug}/...`
- JWT stored in SecureStore (preferred).
- Provide a single API client wrapper that injects slug + token.

---

## Prisma schema organization (readability requirement)

Prisma natively expects a single `schema.prisma`.
To keep it readable, we will author the schema in multiple themed files and generate the final `schema.prisma`.

### Source files (themed “pages”)

Create these in `apps/api/prisma/schema/`:

1. `00_datasource.prisma`
   - generator + datasource + common enums (Role, Term, etc.)

2. `10_school_user.prisma`
   - School, User, authentication-related models

3. `20_people.prisma`
   - Student, Parent relationships, optional Teacher profile (if not in User)

4. `30_academics.prisma`
   - Class, Subject, Teacher assignments pivots

5. `40_grades_attendance.prisma`
   - Grade, Attendance (if present), Homework (optional)

6. `90_indexes_notes.prisma`
   - optional comments, shared indexes patterns, future additions

### Generation rule

- The committed, Prisma-consumed file is: `apps/api/prisma/schema.prisma`
- It is generated by concatenating the themed files in numeric order.
- Agents must update the themed files and then run the generation command.

### Required scripts (add to root package.json)

Add scripts to regenerate schema:

- `db:schema:gen` => concatenates files into `apps/api/prisma/schema.prisma`
- `db:migrate` => runs prisma migrate
- `db:generate` => prisma generate

### Important

- Do NOT manually edit `apps/api/prisma/schema.prisma` except when bootstrapping.
- Always edit files in `apps/api/prisma/schema/*.prisma` then regenerate.

---

## Code style & quality

- Prefer explicit, readable code over clever code.
- Keep functions small; put business rules in services.
- Always add/adjust tests for:
  - guards (SchoolScopeGuard, RolesGuard)
  - grade permissions/ownership logic
- Add indexes in Prisma for frequent filters (`schoolId`, `studentId`, `classId`, `subjectId`).

---

## Deliverables expectations for each change

Every PR must include:

- Updated API endpoints + DTO validation
- Updated access control (roles + school scope)
- Migration(s) if DB changes
- Minimal tests for critical authorization paths
- Updated docs if it changes routing or environment variables

---

## GitHub PR workflow (standard, must follow)

Use `gh` (GitHub CLI) for PR lifecycle when available.

### 1) Before creating PR

- Ensure working tree is clean.
- Push branch to remote.
- Check if an equivalent PR already exists.

### 2) Create PR

- Open PR from `dev` to `main` with clear title/body.
- Monitor checks until completion.
- If conflicts appear, merge `main` into `dev`, resolve conflicts, push `dev`, wait checks again.

### 3) Merge PR

- Merge only when PR is `MERGEABLE` and required checks are green.
- Confirm merge commit and merged timestamp.

### 4) Reset cycle after merge (important)

After `dev -> main` merge is done:

1. Checkout local `main`
2. Pull latest `origin/main` (fast-forward only)
3. Delete local `dev`
4. Delete remote `dev`
5. Create new local `dev` from updated local `main`
6. Push new `dev` and set upstream tracking

This keeps `dev` aligned with `main` and avoids long-lived drift.

---

## Timetable UI notes (student)

Reference implementation:

- `apps/web/src/app/schools/[schoolSlug]/(app)/emploi-du-temps/page.tsx`
- `apps/web/src/app/schools/[schoolSlug]/(app)/emploi-du-temps/page.ui.test.tsx`

Current UX rules:

- Student timetable has 3 views: `Jour`, `Semaine`, `Mois`.
- Period navigation is inside the active view controls:
  - previous/next icon buttons
  - center title button resets to current period (`Aujourd'hui`, `Cette semaine`, `Ce mois`).
- Course cards use subject color coding and include room (`salle`) information.

Mobile/tablet specific rules:

- Keep desktop behavior/layout intact when iterating mobile.
- `Semaine` mobile uses a compact timetable grid (rows=timeslots, cols=days).
- Week mobile cells show abbreviated subject label (3 letters) + color code.
- Clicking a week cell shows detailed course info below the grid (subject, day, time range, teacher, room).
- Week mobile sizing is viewport-adaptive (`clamp` with `vw`/`vh`) to improve visibility on larger screens.
- `Mois` mobile uses a classic month calendar grid; selecting a day shows its agenda below.

Quality gate:

- Any change in this area must keep `page.ui.test.tsx` green (desktop + mobile day/week/month coverage).
- Run repo checks before commit: `npm run check:repo`.

---

## Timetable status snapshot (2026-03-08)

Use this as operational memory before continuing timetable work.

### Backend/API status

- Dedicated timetable module exists in API:
  - `apps/api/src/timetable/timetable.controller.ts`
  - `apps/api/src/timetable/timetable.service.ts`
- Student/parent endpoint in place:
  - `GET /schools/:schoolSlug/timetable/me`
  - supports `childId`, `schoolYearId`, `fromDate`, `toDate`.
- Class timetable endpoints are school-year aware (active year used by default in UI).
- Calendar events (e.g. school vacations) are handled in timetable flows.

### Subject color model (business rule implemented)

- Color is scoped by `school + schoolYear + class + subject` (not global subject color).
- Prisma model: `ClassTimetableSubjectStyle`.
- Migration already added:
  - `apps/api/prisma/migrations/20260308230000_add_timetable_subject_styles/migration.sql`
- API supports manual color update per subject in class timetable context:
  - `PATCH /schools/:schoolSlug/timetable/classes/:classId/subjects/:subjectId/style`
- Service auto-assigns a distinct color when missing and validates distance to avoid too-similar colors in the same class/year.

### Web status (already wired)

- Student timetable page uses real API data:
  - `apps/web/src/app/schools/[schoolSlug]/(app)/emploi-du-temps/page.tsx`
- Class agenda page wired to timetable API + school year selector:
  - `apps/web/src/app/schools/[schoolSlug]/(app)/classes/[classId]/agenda/page.tsx`
- Classes page shows subject color column and allows editing color via modal palette:
  - `apps/web/src/app/classes/page.tsx`
  - used colors in class are excluded from suggestions; current color is visibly indicated.

### Tests in place

- Web UI/functional test for color display + click/update behavior:
  - `apps/web/src/app/classes/page.ui.test.tsx`
- API e2e for subject color update and timetable style propagation:
  - `apps/api/test/timetable-subject-style.e2e-spec.ts`

### Next-session checklist

Before new timetable changes:

1. Read this file section + timetable files above.
2. Run targeted tests first, then full checks before commit:
   - `npm run -w @school-live/web test -- src/app/classes/page.ui.test.tsx`
   - `npm run -w @school-live/api test:e2e -- test/timetable-subject-style.e2e-spec.ts`
   - `npm run check:repo`

---

## Identity & Auth continuity (multi-auth)

Business rule to preserve across modules (teachers, parents, users, auth):

- A single `User` can accumulate multiple authentication methods over time:
  - `phone + PIN`
  - `email + password`
  - `Google/Apple SSO`
- Contact resolution in management flows must always try to match an existing user first (by phone and/or email) before creating a new account.
- Never create duplicate users when a phone/email already maps to an existing account in school scope.
- Internal technical emails (`@noemail.scolive.local`) are implementation detail for phone-only bootstrap and must stay hidden in UI.
- If a user later adds/updates email and/or links Google auth, this extends the same account identity (no account split).
