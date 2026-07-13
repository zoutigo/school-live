import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

// Le module Ressources est global à l'application (comme les Tests) : une ressource
// approuvée est visible par n'importe quelle école/niveau, filtrée par les critères de
// recherche ; seul un platform role (ADMIN/SUPER_ADMIN) peut approuver/rejeter/révoquer,
// jamais un SCHOOL_ADMIN. Enoncé et corrigé ont des statuts d'approbation indépendants.
describe("Resources API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const password = "StrongPass1";
  const superAdminEmail = `e2e-resources-superadmin-${runId}@example.test`;
  const superAdminPhone = `+337${String(
    Math.floor(Math.random() * 1e8),
  ).padStart(8, "0")}`;
  const schoolAdminEmail = `e2e-resources-schooladmin-${runId}@example.test`;
  const teacherEmail = `e2e-resources-teacher-${runId}@example.test`;
  const otherTeacherEmail = `e2e-resources-teacher2-${runId}@example.test`;
  const parentEmail = `e2e-resources-parent-${runId}@example.test`;
  const schoolSlug = `e2e-resources-school-${runId}`;

  let schoolId = "";
  let academicLevelId = "";
  let subjectId = "";
  let superAdminToken = "";
  let schoolAdminToken = "";
  let teacherToken = "";
  let otherTeacherToken = "";
  let parentToken = "";

  let resourceId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  function authHeaders(token: string) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
  }

  async function login(email: string) {
    const { response, body } = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(201);
    return String((body as { accessToken: string }).accessToken);
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
    const pinHash = await bcrypt.hash("123456", 10);

    const school = await prisma.school.create({
      data: { slug: schoolSlug, name: `E2E Resources School ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const level = await prisma.academicLevel.create({
      data: { schoolId: null, code: `LVL-${runId}`, label: `Niveau ${runId}` },
      select: { id: true },
    });
    academicLevelId = level.id;

    const subject = await prisma.subject.create({
      data: { schoolId: null, code: `SUB-${runId}`, name: `Matiere ${runId}` },
      select: { id: true },
    });
    subjectId = subject.id;

    await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        phone: superAdminPhone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        platformRoles: { create: [{ role: "SUPER_ADMIN" }] },
        phoneCredential: {
          create: {
            phoneE164: superAdminPhone,
            pinHash,
            verifiedAt: new Date(),
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "SCHOOL_ADMIN" } },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "Ens",
        lastName: "Seignant",
        email: teacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "Autre",
        lastName: "Enseignant",
        email: otherTeacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "Jean",
        lastName: "Parent",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "PARENT" } },
      },
    });

    superAdminToken = await login(superAdminEmail);
    schoolAdminToken = await login(schoolAdminEmail);
    teacherToken = await login(teacherEmail);
    otherTeacherToken = await login(otherTeacherEmail);
    parentToken = await login(parentEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (resourceId) {
        await prisma.resource
          .delete({ where: { id: resourceId } })
          .catch(() => {});
      }
      if (academicLevelId) {
        await prisma.academicLevel
          .delete({ where: { id: academicLevelId } })
          .catch(() => {});
      }
      if (subjectId) {
        await prisma.subject
          .delete({ where: { id: subjectId } })
          .catch(() => {});
      }
      if (schoolId) {
        await prisma.school.delete({ where: { id: schoolId } }).catch(() => {});
      }
      await prisma.user.deleteMany({
        where: { email: { startsWith: "e2e-resources-" } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it("lets a PARENT create a resource (national module, no privileged school role)", async () => {
    const { response, body } = await apiJson("/api/resources", {
      method: "POST",
      headers: authHeaders(parentToken),
      body: JSON.stringify({
        kind: "ASSESSMENT",
        schoolId,
        academicLevelId,
        subjectId,
        examType: "SEQUENCE_TEST",
        sequence: "SEQ_1",
        academicYearLabel: "2025-2026",
        title: "Controle e2e parent",
        statementContent: "<p>Enonce</p>",
      }),
    });
    expect(response.status).toBe(201);
    const created = body as { id: string; statementStatus: string };
    expect(created.statementStatus).toBe("PENDING");
    await prisma.resource.delete({ where: { id: created.id } }).catch(() => {});
  });

  it("lets a TEACHER submit an ASSESSMENT resource, pending by default", async () => {
    const { response, body } = await apiJson("/api/resources", {
      method: "POST",
      headers: authHeaders(teacherToken),
      body: JSON.stringify({
        kind: "ASSESSMENT",
        schoolId,
        academicLevelId,
        subjectId,
        examType: "SEQUENCE_TEST",
        sequence: "SEQ_1",
        academicYearLabel: "2025-2026",
        title: "Controle e2e",
        statementContent: "<p>Enonce</p>",
        correctionContent: "<p>Corrige</p>",
      }),
    });
    expect(response.status).toBe(201);
    const created = body as {
      id: string;
      statementStatus: string;
      correctionStatus: string;
    };
    resourceId = created.id;
    expect(created.statementStatus).toBe("PENDING");
    expect(created.correctionStatus).toBe("PENDING");
  });

  it("hides the pending resource from the public listing", async () => {
    const { response, body } = await apiJson(
      `/api/resources?kind=ASSESSMENT&academicLevelId=${academicLevelId}`,
      { headers: authHeaders(parentToken) },
    );
    expect(response.status).toBe(200);
    const result = body as { items: Array<{ id: string }> };
    expect(result.items.some((item) => item.id === resourceId)).toBe(false);
  });

  it("rejects SCHOOL_ADMIN from the admin moderation routes (platform-only circuit)", async () => {
    const { response } = await apiJson(
      `/api/admin/resources/${resourceId}/statement/approve`,
      { method: "PATCH", headers: authHeaders(schoolAdminToken) },
    );
    expect(response.status).toBe(403);
  });

  it("lets SUPER_ADMIN approve the statement", async () => {
    const { response, body } = await apiJson(
      `/api/admin/resources/${resourceId}/statement/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(response.status).toBe(200);
    expect((body as { statementStatus: string }).statementStatus).toBe(
      "APPROVED",
    );
  });

  it("shows the resource nationally once its statement is approved, but still masks the pending correction", async () => {
    const { response, body } = await apiJson(
      `/api/resources?kind=ASSESSMENT&academicLevelId=${academicLevelId}`,
      { headers: authHeaders(parentToken) },
    );
    expect(response.status).toBe(200);
    const result = body as {
      items: Array<{ id: string; correctionContent: string | null }>;
    };
    const found = result.items.find((item) => item.id === resourceId);
    expect(found).toBeTruthy();
    expect(found?.correctionContent).toBeNull();
  });

  it("lets SUPER_ADMIN approve the correction independently, then reveals it", async () => {
    const approve = await apiJson(
      `/api/admin/resources/${resourceId}/correction/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(approve.response.status).toBe(200);

    const { response, body } = await apiJson(`/api/resources/${resourceId}`, {
      headers: authHeaders(parentToken),
    });
    expect(response.status).toBe(200);
    expect((body as { correctionContent: string }).correctionContent).toBe(
      "<p>Corrige</p>",
    );
  });

  it("forbids a different author from editing the resource", async () => {
    const { response } = await apiJson(`/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: authHeaders(otherTeacherToken),
      body: JSON.stringify({ title: "Hacked title" }),
    });
    expect(response.status).toBe(403);
  });

  // Régression : le formulaire d'édition mobile envoyait `kind` même en update,
  // provoquant "property kind should not exist" (whitelist/forbidNonWhitelisted).
  // `kind` est immuable après création et n'a jamais fait partie d'UpdateResourceDto.
  // Ressource créée directement via Prisma (indépendante du flux POST /resources,
  // pour ne pas dépendre des autres cas de ce fichier) puis nettoyée après coup.
  it("rejects a PATCH payload that still carries kind (immutable after creation)", async () => {
    const teacher = await prisma.user.findUniqueOrThrow({
      where: { email: teacherEmail },
      select: { id: true },
    });
    const seeded = await prisma.resource.create({
      data: {
        kind: "ASSESSMENT",
        schoolId,
        academicLevelId,
        subjectId,
        examType: "SEQUENCE_TEST",
        sequence: "SEQ_1",
        academicYearLabel: "2025-2026",
        title: "Ressource e2e kind-regression",
        authorUserId: teacher.id,
      },
      select: { id: true },
    });

    try {
      const { response, body } = await apiJson(`/api/resources/${seeded.id}`, {
        method: "PATCH",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({ kind: "ASSESSMENT", title: "Titre inchangé" }),
      });
      expect(response.status).toBe(400);
      expect((body as { message: string[] }).message).toEqual(
        expect.arrayContaining([expect.stringContaining("kind")]),
      );
    } finally {
      await prisma.resource
        .delete({ where: { id: seeded.id } })
        .catch(() => {});
    }
  });

  it("re-editing the approved statement resets it to PENDING and hides it again from the public listing", async () => {
    const update = await apiJson(`/api/resources/${resourceId}`, {
      method: "PATCH",
      headers: authHeaders(teacherToken),
      body: JSON.stringify({ statementContent: "<p>Enonce corrige</p>" }),
    });
    expect(update.response.status).toBe(200);
    expect((update.body as { statementStatus: string }).statementStatus).toBe(
      "PENDING",
    );

    const { body } = await apiJson(
      `/api/resources?kind=ASSESSMENT&academicLevelId=${academicLevelId}`,
      { headers: authHeaders(parentToken) },
    );
    const result = body as { items: Array<{ id: string }> };
    expect(result.items.some((item) => item.id === resourceId)).toBe(false);

    // re-approve so subsequent tests (favorites) can rely on an APPROVED statement
    const reapprove = await apiJson(
      `/api/admin/resources/${resourceId}/statement/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(reapprove.response.status).toBe(200);
  });

  it("lets a reader favorite and unfavorite an approved resource", async () => {
    const fav = await apiJson(`/api/resources/${resourceId}/favorite`, {
      method: "POST",
      headers: authHeaders(parentToken),
    });
    expect(fav.response.status).toBe(201);

    const list = await apiJson("/api/resources/favorites", {
      headers: authHeaders(parentToken),
    });
    expect(list.response.status).toBe(200);
    const favorites = list.body as unknown as Array<{ id: string }>;
    expect(favorites.some((item) => item.id === resourceId)).toBe(true);

    const unfav = await apiJson(`/api/resources/${resourceId}/favorite`, {
      method: "DELETE",
      headers: authHeaders(parentToken),
    });
    expect(unfav.response.status).toBe(200);
  });

  it("lets SUPER_ADMIN revoke an approved statement back to PENDING", async () => {
    const revoke = await apiJson(
      `/api/admin/resources/${resourceId}/statement/revoke`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(revoke.response.status).toBe(200);
    expect((revoke.body as { statementStatus: string }).statementStatus).toBe(
      "PENDING",
    );
  });

  it("rejects an ASSESSMENT payload missing its school", async () => {
    const { response } = await apiJson("/api/resources", {
      method: "POST",
      headers: authHeaders(teacherToken),
      body: JSON.stringify({
        kind: "ASSESSMENT",
        academicLevelId,
        subjectId,
        examType: "SEQUENCE_TEST",
        sequence: "SEQ_1",
        academicYearLabel: "2025-2026",
        title: "Sans ecole",
        statementContent: "<p>Enonce</p>",
      }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects an EXAM payload that carries a school", async () => {
    const { response } = await apiJson("/api/resources", {
      method: "POST",
      headers: authHeaders(teacherToken),
      body: JSON.stringify({
        kind: "EXAM",
        schoolId,
        academicLevelId,
        subjectId,
        examType: "MOCK_EXAM",
        academicYearLabel: "2025-2026",
        title: "Examen invalide",
        statementContent: "<p>Enonce</p>",
      }),
    });
    expect(response.status).toBe(400);
  });

  it("lets the author see their own submissions of any status through /resources/mine", async () => {
    const { response, body } = await apiJson("/api/resources/mine", {
      headers: authHeaders(teacherToken),
    });
    expect(response.status).toBe(200);
    const result = body as { items: Array<{ id: string }> };
    expect(result.items.some((item) => item.id === resourceId)).toBe(true);
  });

  it("lets any authenticated role (not just platform roles) read the national catalog for filters/forms", async () => {
    const { response, body } = await apiJson("/api/resources/catalog", {
      headers: authHeaders(parentToken),
    });
    expect(response.status).toBe(200);
    const catalog = body as {
      academicLevels: Array<{ id: string }>;
      subjects: Array<{ id: string }>;
    };
    expect(
      catalog.academicLevels.some((level) => level.id === academicLevelId),
    ).toBe(true);
    expect(catalog.subjects.some((subject) => subject.id === subjectId)).toBe(
      true,
    );
  });
});
