import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonValue = Record<string, unknown>;

describe("Admin principal d'ecole + exclusion de membres e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "StrongPass1";
  const email = (key: string) => `e2e-pa-${key}-${runId}@example.test`;

  const ids: Record<string, string> = {};
  let schoolId = "";
  let schoolSlug = "";
  let yearId = "";
  let classId = "";
  let superToken = "";
  let schoolAdminToken = "";

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
  async function login(addr: string) {
    const res = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: addr, password }),
    });
    expect(res.response.status).toBe(201);
    return String(res.body?.accessToken);
  }

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
    const mk = async (
      key: string,
      extra: Record<string, unknown> = {},
    ): Promise<string> => {
      const user = await prisma.user.create({
        data: {
          firstName: key,
          lastName: "E2E",
          email: email(key),
          passwordHash,
          mustChangePassword: false,
          profileCompleted: true,
          ...extra,
        },
      });
      ids[key] = user.id;
      return user.id;
    };

    const superPhone = `+23769977${Math.floor(Math.random() * 9000 + 1000)}`;
    await mk("super", {
      phone: superPhone,
      phoneCredential: {
        create: {
          phoneE164: superPhone,
          pinHash: await bcrypt.hash("123456", 10),
          verifiedAt: new Date(),
        },
      },
      platformRoles: { create: [{ role: "SUPER_ADMIN" }] },
    });
    await mk("supportA", { platformRoles: { create: [{ role: "SUPPORT" }] } });
    await mk("supportB", { platformRoles: { create: [{ role: "SALES" }] } });
    await mk("plain");
    superToken = await login(email("super"));
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { email: { startsWith: "e2e-pa-" } },
      });
    }
    if (app) await app.close();
  });

  it("liste uniquement les platform users et filtre par recherche", async () => {
    const all = await apiJson(
      "/api/system/platform-users?search=support",
      authed(superToken),
    );
    expect(all.response.status).toBe(200);
    const list = all.body as unknown as Array<{ id: string }>;
    expect(list.map((u) => u.id)).toContain(ids.supportA);
    expect(list.map((u) => u.id)).not.toContain(ids.plain);
  });

  it("refuse la creation d'ecole sans admin principal, avec un non-platform user ou un id inconnu", async () => {
    const missing = await apiJson(
      "/api/system/schools",
      authed(superToken, "POST", { name: `PA none ${runId}` }),
    );
    expect(missing.response.status).toBe(400);

    const plain = await apiJson(
      "/api/system/schools",
      authed(superToken, "POST", {
        name: `PA plain ${runId}`,
        primaryAdminUserId: ids.plain,
      }),
    );
    expect(plain.response.status).toBe(400);

    const ghost = await apiJson(
      "/api/system/schools",
      authed(superToken, "POST", {
        name: `PA ghost ${runId}`,
        primaryAdminUserId: "ghost-id",
      }),
    );
    expect(ghost.response.status).toBe(404);
  });

  it("cree l'ecole avec un platform user comme admin principal (membership SCHOOL_ADMIN)", async () => {
    const created = await apiJson(
      "/api/system/schools",
      authed(superToken, "POST", {
        name: `PA School ${runId}`,
        primaryAdminUserId: ids.supportA,
      }),
    );
    expect(created.response.status).toBe(201);
    const school = created.body?.school as JsonValue;
    schoolId = String(school.id);
    schoolSlug = String(school.slug);
    expect(school.primaryAdminUserId).toBe(ids.supportA);

    const membership = await prisma.schoolMembership.findFirst({
      where: { schoolId, userId: ids.supportA, role: "SCHOOL_ADMIN" },
    });
    expect(membership).not.toBeNull();

    const details = await apiJson(
      `/api/system/schools/${schoolId}`,
      authed(superToken),
    );
    const admins = details.body?.schoolAdmins as Array<{
      id: string;
      isPrimary: boolean;
    }>;
    expect(admins).toEqual([
      expect.objectContaining({ id: ids.supportA, isPrimary: true }),
    ]);

    const year = await prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });
    yearId = String(year.activeSchoolYearId);
    const klass = await prisma.class.create({
      data: { schoolId, schoolYearId: yearId, name: "6e A" },
    });
    classId = klass.id;
  });

  it("interdit de retirer l'admin principal via /admins (409) et de supprimer son compte (409)", async () => {
    const removed = await apiJson(
      `/api/system/schools/${schoolId}/admins/${ids.supportA}`,
      authed(superToken, "DELETE"),
    );
    expect(removed.response.status).toBe(409);

    const deleted = await apiJson(
      `/api/system/users/${ids.supportA}`,
      authed(superToken, "DELETE"),
    );
    expect(deleted.response.status).toBe(409);

    const rolesChange = await apiJson(
      `/api/system/users/${ids.supportA}`,
      authed(superToken, "PATCH", { platformRoles: [] }),
    );
    expect(rolesChange.response.status).toBe(409);
    expect(
      await prisma.platformRoleAssignment.count({
        where: { userId: ids.supportA },
      }),
    ).toBe(1);
  });

  it("remplace l'admin principal : l'ancien perd SCHOOL_ADMIN mais garde ses autres roles", async () => {
    await prisma.schoolMembership.create({
      data: { schoolId, userId: ids.supportA, role: "TEACHER" },
    });

    const same = await apiJson(
      `/api/system/schools/${schoolId}/primary-admin`,
      authed(superToken, "PATCH", { userId: ids.supportA }),
    );
    expect(same.response.status).toBe(400);

    const notPlatform = await apiJson(
      `/api/system/schools/${schoolId}/primary-admin`,
      authed(superToken, "PATCH", { userId: ids.plain }),
    );
    expect(notPlatform.response.status).toBe(400);

    const replaced = await apiJson(
      `/api/system/schools/${schoolId}/primary-admin`,
      authed(superToken, "PATCH", { userId: ids.supportB }),
    );
    expect(replaced.response.status).toBe(200);

    const school = await prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
    });
    expect(school.primaryAdminUserId).toBe(ids.supportB);
    const oldRoles = await prisma.schoolMembership.findMany({
      where: { schoolId, userId: ids.supportA },
    });
    expect(oldRoles.map((m) => m.role)).toEqual(["TEACHER"]);
    const newRoles = await prisma.schoolMembership.findMany({
      where: { schoolId, userId: ids.supportB },
    });
    expect(newRoles.map((m) => m.role)).toEqual(["SCHOOL_ADMIN"]);

    // L'ancien admin principal n'est plus protege.
    const nowFree = await apiJson(
      `/api/system/users/${ids.supportA}`,
      authed(superToken, "PATCH", { firstName: "Renamed" }),
    );
    expect(nowFree.response.status).toBe(200);
  });

  it("remplacement sans aucun autre role : l'ancien n'est plus membre de l'ecole", async () => {
    const replaced = await apiJson(
      `/api/system/schools/${schoolId}/primary-admin`,
      authed(superToken, "PATCH", { userId: ids.supportA }),
    );
    expect(replaced.response.status).toBe(200);
    // supportB n'avait que SCHOOL_ADMIN.
    expect(
      await prisma.schoolMembership.count({
        where: { schoolId, userId: ids.supportB },
      }),
    ).toBe(0);
    // retour a supportB pour la suite (supportA garde TEACHER + SCHOOL_ADMIN)
    await apiJson(
      `/api/system/schools/${schoolId}/primary-admin`,
      authed(superToken, "PATCH", { userId: ids.supportB }),
    );
    expect(
      (
        await prisma.schoolMembership.findMany({
          where: { schoolId, userId: ids.supportA },
        })
      ).map((m) => m.role),
    ).toEqual(["TEACHER"]);
  });

  describe("exclusion d'un membre par le school admin", () => {
    beforeAll(async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      const mkMember = async (key: string, roles: string[]) => {
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
                schoolId,
                role: role as never,
              })),
            },
          },
        });
        ids[key] = user.id;
      };
      await mkMember("sadmin2", ["SCHOOL_ADMIN"]);
      await mkMember("teacher", ["TEACHER"]);
      await mkMember("parent", ["PARENT"]);
      await mkMember("pupil", ["STUDENT"]);
      await mkMember("pupilNoClass", ["STUDENT"]);
      schoolAdminToken = await login(email("sadmin2"));

      await prisma.teacher.create({ data: { schoolId, userId: ids.teacher } });
      const subject = await prisma.subject.create({
        data: { schoolId, name: `Maths ${runId}` },
      });
      await prisma.teacherClassSubject.create({
        data: {
          schoolId,
          schoolYearId: yearId,
          teacherUserId: ids.teacher,
          classId,
          subjectId: subject.id,
        },
      });
      const student = await prisma.student.create({
        data: {
          schoolId,
          userId: ids.pupil,
          firstName: "Pupil",
          lastName: "E2E",
        },
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
      await prisma.student.create({
        data: {
          schoolId,
          userId: ids.pupilNoClass,
          firstName: "NoClass",
          lastName: "E2E",
        },
      });
      await prisma.parentStudent.create({
        data: { schoolId, parentUserId: ids.parent, studentId: student.id },
      });
      ids.studentRecord = student.id;
    });

    const del = (userId: string, token = schoolAdminToken) =>
      apiJson(
        `/api/schools/${schoolSlug}/users/${userId}`,
        authed(token, "DELETE"),
      );

    it("403 auto-exclusion, 409 admin principal, 404 non membre", async () => {
      expect((await del(ids.sadmin2)).response.status).toBe(403);
      expect((await del(ids.supportB)).response.status).toBe(409);
      expect((await del(ids.plain)).response.status).toBe(404);
    });

    it("refuse l'acces sans role school admin (parent)", async () => {
      const parentToken = await login(email("parent"));
      expect((await del(ids.teacher, parentToken)).response.status).toBe(403);
    });

    it("exclut l'enseignant : plus de membership, de fiche ni d'affectation active ; le compte reste", async () => {
      const res = await del(ids.teacher);
      expect(res.response.status).toBe(200);
      expect(res.body?.action).toBe("EXCLUDED");
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.teacher },
        }),
      ).toBe(0);
      expect(
        await prisma.teacher.count({
          where: { schoolId, userId: ids.teacher },
        }),
      ).toBe(0);
      expect(
        await prisma.teacherClassSubject.count({
          where: { teacherUserId: ids.teacher },
        }),
      ).toBe(0);
      expect(
        await prisma.user.findUnique({ where: { id: ids.teacher } }),
      ).not.toBeNull();
    });

    it("exclut le parent en conservant le lien parent-eleve", async () => {
      const res = await del(ids.parent);
      expect(res.response.status).toBe(200);
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.parent },
        }),
      ).toBe(0);
      expect(
        await prisma.parentStudent.count({
          where: { parentUserId: ids.parent },
        }),
      ).toBe(1);
    });

    it("eleve : perd sa classe de l'annee active, reste eleve, historique conserve", async () => {
      const res = await del(ids.pupil);
      expect(res.response.status).toBe(200);
      expect(res.body).toEqual({
        action: "UNASSIGNED_FROM_CLASS",
        remainingRoles: ["STUDENT"],
      });
      const enrollment = await prisma.enrollment.findFirstOrThrow({
        where: { studentId: ids.studentRecord, schoolYearId: yearId },
      });
      expect(enrollment.classId).toBeNull();
      expect(enrollment.status).toBe("ACTIVE");
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.pupil, role: "STUDENT" },
        }),
      ).toBe(1);
      expect(
        await prisma.student.count({ where: { id: ids.studentRecord } }),
      ).toBe(1);

      // Deuxieme appel : deja sans classe.
      expect((await del(ids.pupil)).response.status).toBe(409);
      expect((await del(ids.pupilNoClass)).response.status).toBe(409);
    });

    it("exclut un school admin secondaire, puis refuse d'exclure le dernier admin non principal", async () => {
      await prisma.schoolMembership.create({
        data: { schoolId, userId: ids.plain, role: "SCHOOL_ADMIN" },
      });
      const res = await del(ids.plain);
      expect(res.response.status).toBe(200);
      expect(
        await prisma.schoolMembership.count({
          where: { schoolId, userId: ids.plain },
        }),
      ).toBe(0);
    });

    it("updateRoles ne peut pas retirer SCHOOL_ADMIN a l'admin principal", async () => {
      const res = await apiJson(
        `/api/schools/${schoolSlug}/users/${ids.supportB}/roles`,
        authed(schoolAdminToken, "PATCH", { roles: ["TEACHER"] }),
      );
      expect(res.response.status).toBe(409);
    });
  });
});
