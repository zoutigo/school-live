import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonValue = Record<string, unknown>;

describe("Exclusion complète d'un membre + réinvitation e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "StrongPass1";
  const email = (key: string) =>
    `e2e-ex-${key}-${runId}@example.test`.toLowerCase();

  const ids: Record<string, string> = {};
  let schoolId = "";
  let schoolSlug = "";
  let otherSchoolId = "";
  let otherSchoolSlug = "";
  let yearId = "";
  let classId = "";
  let subjectId = "";
  let homeworkId = "";
  const tokens: Record<string, string> = {};

  async function apiJson(path: string, init?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, init);
    const body = (await response.json().catch(() => null)) as JsonValue | null;
    return { response, body };
  }
  const authed = (token: string, method = "GET", body?: unknown) => ({
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  async function login(key: string) {
    const res = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email(key), password }),
    });
    if (res.response.status !== 201) {
      throw new Error(
        `login ${key} -> ${res.response.status} ${JSON.stringify(res.body)}`,
      );
    }
    tokens[key] = String(res.body?.accessToken);
    return tokens[key];
  }
  const url = (path: string) => `/api/schools/${schoolSlug}${path}`;
  const excludeUser = (userId: string, reason?: string, token = tokens.admin) =>
    apiJson(
      url(`/users/${userId}/exclude`),
      authed(token, "POST", reason ? { reason } : {}),
    );
  const reinviteUser = (userId: string, token = tokens.admin) =>
    apiJson(url(`/users/${userId}/reinvite`), authed(token, "POST"));
  const listUsers = (query: string, token = tokens.admin) =>
    apiJson(url(`/users?${query}`), authed(token));
  const idsIn = (body: JsonValue | null) =>
    ((body?.data as Array<{ id: string }>) ?? []).map((row) => row.id);
  const contains = (body: JsonValue | null, id: string) =>
    JSON.stringify(body).includes(id);

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: { name: `EX School ${runId}`, slug: `ex-school-${runId}` },
    });
    schoolId = school.id;
    schoolSlug = school.slug;
    const other = await prisma.school.create({
      data: { name: `EX Other ${runId}`, slug: `ex-other-${runId}` },
    });
    otherSchoolId = other.id;
    otherSchoolSlug = other.slug;

    const year = await prisma.schoolYear.create({
      data: { schoolId, label: `2026-2027 ${runId}` },
    });
    yearId = year.id;
    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: yearId },
    });
    classId = (
      await prisma.class.create({
        data: { schoolId, schoolYearId: yearId, name: "6e A" },
      })
    ).id;
    subjectId = (
      await prisma.subject.create({
        data: { schoolId, name: `Maths ${runId}` },
      })
    ).id;

    const mk = async (
      key: string,
      roles: string[],
      targetSchoolId = schoolId,
    ) => {
      const user = await prisma.user.create({
        data: {
          firstName: key,
          lastName: "E2E",
          email: email(key),
          passwordHash,
          mustChangePassword: false,
          profileCompleted: true,
          memberships: {
            create: roles.map((role) => ({
              schoolId: targetSchoolId,
              role: role as never,
            })),
          },
        },
      });
      ids[key] = user.id;
    };
    await mk("admin", ["SCHOOL_ADMIN"]);
    await mk("admin2", ["SCHOOL_ADMIN"]);
    await mk("otherAdmin", ["SCHOOL_ADMIN"], otherSchoolId);
    await mk("teacher", ["TEACHER"]);
    await mk("pupilA", ["STUDENT"]);
    await mk("pupilB", ["STUDENT"]);
    await mk("parentOnlyA", ["PARENT"]);
    await mk("parentAB", ["PARENT"]);
    await prisma.school.update({
      where: { id: schoolId },
      data: { primaryAdminUserId: ids.admin2 },
    });

    await prisma.teacher.create({ data: { schoolId, userId: ids.teacher } });
    await prisma.teacherClassSubject.create({
      data: {
        schoolId,
        schoolYearId: yearId,
        teacherUserId: ids.teacher,
        classId,
        subjectId,
      },
    });

    const mkStudent = async (key: string, userId: string | null) => {
      const student = await prisma.student.create({
        data: { schoolId, userId, firstName: key, lastName: "Pupil" },
      });
      await prisma.enrollment.create({
        data: {
          schoolId,
          schoolYearId: yearId,
          studentId: student.id,
          classId,
          status: "ACTIVE",
        },
      });
      ids[`${key}Student`] = student.id;
    };
    await mkStudent("pupilA", ids.pupilA);
    await mkStudent("pupilB", ids.pupilB);
    await mkStudent("noAccount", null);

    await prisma.parentStudent.createMany({
      data: [
        {
          schoolId,
          parentUserId: ids.parentOnlyA,
          studentId: ids.pupilAStudent,
        },
        { schoolId, parentUserId: ids.parentAB, studentId: ids.pupilAStudent },
        { schoolId, parentUserId: ids.parentAB, studentId: ids.pupilBStudent },
      ],
    });

    homeworkId = (
      await prisma.homework.create({
        data: {
          schoolId,
          schoolYearId: yearId,
          classId,
          subjectId,
          authorUserId: ids.teacher,
          title: "Exercices 1 à 5",
          expectedAt: new Date(Date.now() + 86_400_000),
        },
      })
    ).id;

    for (const key of [
      "admin",
      "otherAdmin",
      "teacher",
      "pupilA",
      "pupilB",
      "parentOnlyA",
      "parentAB",
    ]) {
      await login(key);
    }
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      await prisma.school.updateMany({
        where: { id: schoolId },
        data: { primaryAdminUserId: null },
      });
      await prisma.school.deleteMany({
        where: { id: { in: [schoolId, otherSchoolId] } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: "e2e-ex-" } },
      });
    }
    if (app) await app.close();
  });

  it("avant exclusion : l'élève figure dans les effectifs de l'enseignant", async () => {
    const ctx = await apiJson(
      url(`/classes/${classId}/evaluations/context`),
      authed(tokens.teacher),
    );
    expect(ctx.response.status).toBe(200);
    expect(contains(ctx.body, ids.pupilAStudent)).toBe(true);
    expect(contains(ctx.body, ids.pupilBStudent)).toBe(true);
    expect(contains(ctx.body, ids.noAccountStudent)).toBe(true);
  });

  describe("garde-fous de l'exclusion", () => {
    it("401 sans token, 403 pour un non-admin, 403 pour l'admin d'une autre école", async () => {
      const anon = await apiJson(url(`/users/${ids.pupilB}/exclude`), {
        method: "POST",
      });
      expect(anon.response.status).toBe(401);
      expect(
        (await excludeUser(ids.pupilB, "x", tokens.teacher)).response.status,
      ).toBe(403);
      expect(
        (await excludeUser(ids.pupilB, "x", tokens.pupilB)).response.status,
      ).toBe(403);
      expect(
        (await excludeUser(ids.pupilB, "x", tokens.otherAdmin)).response.status,
      ).toBe(403);
      expect(
        (await reinviteUser(ids.pupilB, tokens.otherAdmin)).response.status,
      ).toBe(403);
      const unchanged = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: ids.pupilBStudent },
      });
      expect(unchanged.status).toBe("ACTIVE");
    });

    it("403 auto-exclusion, 409 admin principal, 404 non membre, 400 motif trop long", async () => {
      expect((await excludeUser(ids.admin)).response.status).toBe(403);
      expect((await excludeUser(ids.admin2)).response.status).toBe(409);
      expect((await excludeUser(ids.otherAdmin)).response.status).toBe(404);
      expect(
        (await excludeUser(ids.pupilB, "x".repeat(501))).response.status,
      ).toBe(400);
      expect(
        await prisma.schoolMemberExclusion.count({ where: { schoolId } }),
      ).toBe(0);
    });

    it("404 en réinvitant quelqu'un qui n'est pas exclu", async () => {
      expect((await reinviteUser(ids.pupilB)).response.status).toBe(404);
    });
  });

  describe("élève avec compte", () => {
    it("l'exclusion passe l'inscription en WITHDRAWN, garde classe et membership, ouvre une trace", async () => {
      const res = await excludeUser(ids.pupilA, "Départ de l'établissement");
      expect(res.response.status).toBe(201);
      expect(res.body?.action).toBe("EXCLUDED");

      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: ids.pupilAStudent, schoolYearId: yearId },
      });
      expect(enrollment.status).toBe("WITHDRAWN");
      expect(enrollment.classId).toBe(classId);
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.pupilA, role: "STUDENT" },
        }),
      ).toBe(1);
      const trace = await prisma.schoolMemberExclusion.findFirstOrThrow({
        where: { schoolId, userId: ids.pupilA, reinvitedAt: null },
      });
      expect(trace.reason).toBe("Départ de l'établissement");
      expect(trace.studentId).toBe(ids.pupilAStudent);
      expect(trace.excludedByUserId).toBe(ids.admin);
    });

    it("refuse une seconde exclusion (409)", async () => {
      expect((await excludeUser(ids.pupilA)).response.status).toBe(409);
    });

    it("sort des effectifs de l'enseignant (saisie des notes, suivi des devoirs) sans toucher aux autres", async () => {
      const ctx = await apiJson(
        url(`/classes/${classId}/evaluations/context`),
        authed(tokens.teacher),
      );
      expect(ctx.response.status).toBe(200);
      expect(contains(ctx.body, ids.pupilAStudent)).toBe(false);
      expect(contains(ctx.body, ids.pupilBStudent)).toBe(true);
      expect(contains(ctx.body, ids.noAccountStudent)).toBe(true);

      const hw = await apiJson(
        url(`/classes/${classId}/homework/${homeworkId}`),
        authed(tokens.teacher),
      );
      expect(hw.response.status).toBe(200);
      expect(contains(hw.body, ids.pupilAStudent)).toBe(false);
    });

    it("n'est plus dans la salle d'attente des affectations ni listé comme actif", async () => {
      const active = await listUsers("role=STUDENT&limit=100");
      expect(active.response.status).toBe(200);
      expect(idsIn(active.body)).not.toContain(ids.pupilA);
      expect(idsIn(active.body)).toContain(ids.pupilB);

      const excluded = await listUsers("membershipStatus=excluded&limit=100");
      expect(excluded.response.status).toBe(200);
      const row = (excluded.body?.data as Array<Record<string, unknown>>).find(
        (r) => r.id === ids.pupilA,
      );
      expect(row).toEqual(
        expect.objectContaining({
          excluded: true,
          exclusionReason: "Départ de l'établissement",
          roles: ["STUDENT"],
          hasAccount: true,
        }),
      );
    });

    it("peut toujours se connecter et consulter l'historique, mais plus rien écrire", async () => {
      const token = await login("pupilA");

      const read = await apiJson(
        url(`/classes/${classId}/homework`),
        authed(token),
      );
      expect(read.response.status).toBe(200);
      expect(contains(read.body, homeworkId)).toBe(true);

      // L'historique de notes reste consultable par l'élève et par ses parents.
      const notes = await apiJson(
        url(`/students/${ids.pupilAStudent}/notes`),
        authed(token),
      );
      expect(notes.response.status).toBe(200);
      const parentNotes = await apiJson(
        url(`/students/${ids.pupilAStudent}/notes`),
        authed(tokens.parentOnlyA),
      );
      expect(parentNotes.response.status).toBe(200);

      const write = await apiJson(
        url(`/classes/${classId}/homework/${homeworkId}/completion`),
        authed(token, "PATCH", { done: true }),
      );
      expect(write.response.status).toBe(403);
      expect((write.body as JsonValue).code).toBe("SCHOOL_MEMBER_READ_ONLY");

      const message = await apiJson(
        url("/messages"),
        authed(token, "POST", { subject: "Bonjour", body: "<p>Hello</p>" }),
      );
      expect(message.response.status).toBe(403);
      expect((message.body as JsonValue).code).toBe("SCHOOL_MEMBER_READ_ONLY");
    });

    it("l'élève exclu peut encore gérer son compte (auth/me)", async () => {
      const pushToken = await apiJson(
        url("/me/push-tokens"),
        authed(tokens.pupilA, "DELETE", { token: "ExpoPushToken[x]" }),
      );
      expect((pushToken.body as JsonValue | null)?.code).not.toBe(
        "SCHOOL_MEMBER_READ_ONLY",
      );
    });

    it("un élève actif garde l'écriture (le garde ne s'applique qu'aux exclus)", async () => {
      const write = await apiJson(
        url(`/classes/${classId}/homework/${homeworkId}/completion`),
        authed(tokens.pupilB, "PATCH", { done: true }),
      );
      expect((write.body as JsonValue | null)?.code).not.toBe(
        "SCHOOL_MEMBER_READ_ONLY",
      );
    });
  });

  describe("parents d'un élève exclu", () => {
    it("parent dont le seul enfant est exclu : lecture oui, écriture non", async () => {
      const read = await apiJson(
        url(`/classes/${classId}/homework`),
        authed(tokens.parentOnlyA),
      );
      expect(read.response.status).toBe(200);
      expect(contains(read.body, homeworkId)).toBe(true);

      const write = await apiJson(
        url("/messages"),
        authed(tokens.parentOnlyA, "POST", {
          subject: "Question",
          body: "<p>?</p>",
        }),
      );
      expect(write.response.status).toBe(403);
      expect((write.body as JsonValue).code).toBe("SCHOOL_MEMBER_READ_ONLY");
    });

    it("parent ayant encore un enfant actif : garde l'écriture", async () => {
      const write = await apiJson(
        url("/messages"),
        authed(tokens.parentAB, "POST", {
          subject: "Question",
          body: "<p>?</p>",
        }),
      );
      expect((write.body as JsonValue | null)?.code).not.toBe(
        "SCHOOL_MEMBER_READ_ONLY",
      );
    });
  });

  describe("réintégration de l'élève", () => {
    it("redevient actif, retrouve les effectifs et l'écriture ; la trace est close", async () => {
      const res = await reinviteUser(ids.pupilA);
      expect(res.response.status).toBe(201);
      expect(res.body?.action).toBe("REINVITED");

      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: ids.pupilAStudent, schoolYearId: yearId },
      });
      expect(enrollment.status).toBe("ACTIVE");
      const trace = await prisma.schoolMemberExclusion.findFirstOrThrow({
        where: { schoolId, userId: ids.pupilA },
      });
      expect(trace.reinvitedAt).not.toBeNull();
      expect(trace.reinvitedByUserId).toBe(ids.admin);

      const ctx = await apiJson(
        url(`/classes/${classId}/evaluations/context`),
        authed(tokens.teacher),
      );
      expect(contains(ctx.body, ids.pupilAStudent)).toBe(true);

      const active = await listUsers("role=STUDENT&limit=100");
      expect(idsIn(active.body)).toContain(ids.pupilA);
      const excluded = await listUsers("membershipStatus=excluded&limit=100");
      expect(idsIn(excluded.body)).not.toContain(ids.pupilA);

      const write = await apiJson(
        url(`/classes/${classId}/homework/${homeworkId}/completion`),
        authed(tokens.pupilA, "PATCH", { done: true }),
      );
      expect((write.body as JsonValue | null)?.code).not.toBe(
        "SCHOOL_MEMBER_READ_ONLY",
      );
    });

    it("une seconde réinvitation est refusée (404) et une nouvelle exclusion rouvre une trace", async () => {
      expect((await reinviteUser(ids.pupilA)).response.status).toBe(404);
      expect((await excludeUser(ids.pupilA, "Récidive")).response.status).toBe(
        201,
      );
      expect(
        await prisma.schoolMemberExclusion.count({
          where: { schoolId, userId: ids.pupilA },
        }),
      ).toBe(2);
      expect(
        await prisma.schoolMemberExclusion.count({
          where: { schoolId, userId: ids.pupilA, reinvitedAt: null },
        }),
      ).toBe(1);
      await reinviteUser(ids.pupilA);
    });
  });

  describe("élève sans compte", () => {
    it("exclusion puis réintégration par studentId", async () => {
      const res = await apiJson(
        url(`/users/students/${ids.noAccountStudent}/exclude`),
        authed(tokens.admin, "POST", { reason: "Déménagement" }),
      );
      expect(res.response.status).toBe(201);

      const excluded = await listUsers("membershipStatus=excluded&limit=100");
      const row = (excluded.body?.data as Array<Record<string, unknown>>).find(
        (r) => r.id === ids.noAccountStudent,
      );
      expect(row).toEqual(
        expect.objectContaining({
          type: "student-only",
          hasAccount: false,
          excluded: true,
        }),
      );
      const active = await listUsers("role=STUDENT&limit=100");
      expect(idsIn(active.body)).not.toContain(ids.noAccountStudent);

      const ctx = await apiJson(
        url(`/classes/${classId}/evaluations/context`),
        authed(tokens.teacher),
      );
      expect(contains(ctx.body, ids.noAccountStudent)).toBe(false);

      const again = await apiJson(
        url(`/users/students/${ids.noAccountStudent}/exclude`),
        authed(tokens.admin, "POST", {}),
      );
      expect(again.response.status).toBe(409);

      const back = await apiJson(
        url(`/users/students/${ids.noAccountStudent}/reinvite`),
        authed(tokens.admin, "POST"),
      );
      expect(back.response.status).toBe(201);
      const ctx2 = await apiJson(
        url(`/classes/${classId}/evaluations/context`),
        authed(tokens.teacher),
      );
      expect(contains(ctx2.body, ids.noAccountStudent)).toBe(true);
    });

    it("404 pour un élève d'une autre école", async () => {
      const foreign = await prisma.student.create({
        data: {
          schoolId: otherSchoolId,
          firstName: "Foreign",
          lastName: "Pupil",
        },
      });
      const res = await apiJson(
        url(`/users/students/${foreign.id}/exclude`),
        authed(tokens.admin, "POST", {}),
      );
      expect(res.response.status).toBe(404);
      expect(otherSchoolSlug).toBeTruthy();
    });
  });

  describe("enseignant et parent", () => {
    it("enseignant exclu : plus aucun accès, compte conservé, réintégré sans ses affectations", async () => {
      const res = await excludeUser(ids.teacher, "Fin de contrat");
      expect(res.response.status).toBe(201);
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.teacher },
        }),
      ).toBe(0);
      expect(
        await prisma.user.findUnique({ where: { id: ids.teacher } }),
      ).not.toBeNull();

      const denied = await apiJson(
        url(`/classes/${classId}/evaluations/context`),
        authed(tokens.teacher),
      );
      expect(denied.response.status).toBe(403);

      const excluded = await listUsers(
        "membershipStatus=excluded&role=TEACHER&limit=100",
      );
      expect(idsIn(excluded.body)).toEqual([ids.teacher]);
      const active = await listUsers("role=TEACHER&limit=100");
      expect(idsIn(active.body)).not.toContain(ids.teacher);

      const back = await reinviteUser(ids.teacher);
      expect(back.response.status).toBe(201);
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.teacher, role: "TEACHER" },
        }),
      ).toBe(1);
      // Les affectations ne reviennent pas : à l'administration de les refaire.
      expect(
        await prisma.teacherClassSubject.count({
          where: { teacherUserId: ids.teacher },
        }),
      ).toBe(0);
      const activeAgain = await listUsers("role=TEACHER&limit=100");
      expect(idsIn(activeAgain.body)).toContain(ids.teacher);
    });

    it("parent exclu : membership retiré, liens parent-élève conservés, réintégrable", async () => {
      const res = await excludeUser(ids.parentOnlyA);
      expect(res.response.status).toBe(201);
      expect(
        await prisma.parentStudent.count({
          where: { parentUserId: ids.parentOnlyA },
        }),
      ).toBe(1);
      const denied = await apiJson(
        url(`/classes/${classId}/homework`),
        authed(tokens.parentOnlyA),
      );
      expect(denied.response.status).toBe(403);

      expect((await reinviteUser(ids.parentOnlyA)).response.status).toBe(201);
      const ok = await apiJson(
        url(`/classes/${classId}/homework`),
        authed(tokens.parentOnlyA),
      );
      expect(ok.response.status).toBe(200);
    });
  });

  describe("cohérence avec l'API des inscriptions", () => {
    it("passer une inscription en WITHDRAWN/ACTIVE tient la trace d'exclusion à jour", async () => {
      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: ids.pupilBStudent, schoolYearId: yearId },
      });
      const withdrawn = await apiJson(
        url(
          `/admin/students/${ids.pupilBStudent}/enrollments/${enrollment.id}`,
        ),
        authed(tokens.admin, "PATCH", { status: "WITHDRAWN" }),
      );
      expect(withdrawn.response.status).toBe(200);
      expect(
        await prisma.schoolMemberExclusion.count({
          where: {
            schoolId,
            studentId: ids.pupilBStudent,
            reinvitedAt: null,
          },
        }),
      ).toBe(1);
      const active = await listUsers("role=STUDENT&limit=100");
      expect(idsIn(active.body)).not.toContain(ids.pupilB);

      const restored = await apiJson(
        url(
          `/admin/students/${ids.pupilBStudent}/enrollments/${enrollment.id}`,
        ),
        authed(tokens.admin, "PATCH", { status: "ACTIVE" }),
      );
      expect(restored.response.status).toBe(200);
      expect(
        await prisma.schoolMemberExclusion.count({
          where: {
            schoolId,
            studentId: ids.pupilBStudent,
            reinvitedAt: null,
          },
        }),
      ).toBe(0);
      const activeAgain = await listUsers("role=STUDENT&limit=100");
      expect(idsIn(activeAgain.body)).toContain(ids.pupilB);
    });
  });
});
