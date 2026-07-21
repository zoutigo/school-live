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
// jamais un SCHOOL_ADMIN. Enoncé et corrigé ont des statuts d'approbation indépendants,
// et passent chacun par leur propre circuit de soumissions (brouillon -> AWAITING ->
// APPROVED/REJECTED), pas par un champ direct sur la ressource.
describe("Resources API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const password = "StrongPass1";
  const mediaBase = "https://media.e2e-resources.local";
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
  let statementSubmissionId = "";
  let correctionSubmissionId = "";

  function managedImageUrl(label: string) {
    return `${mediaBase}/homework/inline-images/${label}-${runId}.webp`;
  }

  function managedAttachmentUrl(label: string) {
    return `${mediaBase}/resources/attachments/${label}-${runId}.pdf`;
  }

  const statementImageUrl = managedImageUrl("statement");
  const statementAttachmentUrl = managedAttachmentUrl("statement");
  const correctionImageUrl = managedImageUrl("correction");
  const correctionAttachmentUrl = managedAttachmentUrl("correction");

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
    process.env.MEDIA_PUBLIC_BASE_URL = mediaBase;
    process.env.MEDIA_SERVICE_URL = "";

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
        activeRole: "SUPER_ADMIN",
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
        activeRole: "SCHOOL_ADMIN",
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
        activeRole: "TEACHER",
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
        activeRole: "TEACHER",
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
        activeRole: "PARENT",
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

  it("creates a shell resource (metadata only, no content) as PENDING", async () => {
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

  it("lets the author draft and submit a statement with an inline image and an attachment", async () => {
    const draft = await apiJson(
      `/api/resources/${resourceId}/statement/submissions`,
      {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          content: `<p>Enonce</p><img src="${statementImageUrl}">`,
          attachments: [
            {
              fileName: "enonce.pdf",
              fileUrl: statementAttachmentUrl,
              mimeType: "application/pdf",
            },
          ],
        }),
      },
    );
    expect(draft.response.status).toBe(201);
    const submission = draft.body as { id: string; status: string };
    statementSubmissionId = submission.id;
    expect(submission.status).toBe("DRAFT");

    const submit = await apiJson(
      `/api/resources/${resourceId}/submissions/${statementSubmissionId}/submit`,
      { method: "PATCH", headers: authHeaders(teacherToken) },
    );
    expect(submit.response.status).toBe(200);
    expect((submit.body as { status: string }).status).toBe("AWAITING");
  });

  it("rejects SCHOOL_ADMIN from the admin moderation routes (platform-only circuit)", async () => {
    const { response } = await apiJson(
      `/api/admin/resources/submissions/${statementSubmissionId}/approve`,
      { method: "PATCH", headers: authHeaders(schoolAdminToken) },
    );
    expect(response.status).toBe(403);
  });

  it("lets SUPER_ADMIN approve the statement submission, preserving the inline image and the attachment", async () => {
    const { response, body } = await apiJson(
      `/api/admin/resources/submissions/${statementSubmissionId}/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(response.status).toBe(200);
    const approved = body as {
      statementStatus: string;
      statementContent: string;
      attachments: Array<{ part: string; fileUrl: string; fileName: string }>;
    };
    expect(approved.statementStatus).toBe("APPROVED");
    // Régression : l'image insérée dans l'éditeur devait survivre telle
    // quelle au passage brouillon -> soumission -> approbation.
    expect(approved.statementContent).toContain(statementImageUrl);
    expect(approved.attachments).toEqual([
      expect.objectContaining({
        part: "STATEMENT",
        fileUrl: statementAttachmentUrl,
        fileName: "enonce.pdf",
      }),
    ]);
  });

  it("re-scopes the approved statement's inline image from the submission entity to the resource entity for media GC bookkeeping", async () => {
    const asset = await prisma.inlineMediaAsset.findUnique({
      where: { url: statementImageUrl },
      select: { entityType: true, entityId: true, status: true },
    });
    expect(asset).toEqual(
      expect.objectContaining({
        entityType: "RESOURCE",
        entityId: `${resourceId}:statement`,
        status: "LINKED",
      }),
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

  it("lets the author draft and submit a correction with its own inline image and attachment", async () => {
    const draft = await apiJson(
      `/api/resources/${resourceId}/correction/submissions`,
      {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          content: `<p>Corrige</p><img src="${correctionImageUrl}">`,
          attachments: [
            {
              fileName: "corrige.pdf",
              fileUrl: correctionAttachmentUrl,
              mimeType: "application/pdf",
            },
          ],
        }),
      },
    );
    expect(draft.response.status).toBe(201);
    const submission = draft.body as { id: string; status: string };
    correctionSubmissionId = submission.id;
    expect(submission.status).toBe("DRAFT");

    const submit = await apiJson(
      `/api/resources/${resourceId}/submissions/${correctionSubmissionId}/submit`,
      { method: "PATCH", headers: authHeaders(teacherToken) },
    );
    expect(submit.response.status).toBe(200);
  });

  // Régression exacte du bug remonté par la recette mobile (Talla) : après
  // validation du corrigé par le modérateur, l'image et la pièce jointe
  // n'apparaissaient plus dans « Mes ressources ». Ce test verrouille le
  // comportement attendu côté API : le corrigé approuvé doit exposer son
  // image inline ET sa pièce jointe, sans faire disparaître celles de
  // l'énoncé déjà approuvé.
  it("lets SUPER_ADMIN approve the correction submission, preserving its inline image and attachment alongside the statement's", async () => {
    const approve = await apiJson(
      `/api/admin/resources/submissions/${correctionSubmissionId}/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(approve.response.status).toBe(200);

    const { response, body } = await apiJson(`/api/resources/${resourceId}`, {
      headers: authHeaders(parentToken),
    });
    expect(response.status).toBe(200);
    const detail = body as {
      statementContent: string;
      correctionContent: string;
      attachments: Array<{ part: string; fileUrl: string; fileName: string }>;
    };
    expect(detail.correctionContent).toContain(correctionImageUrl);
    // L'énoncé déjà approuvé reste intact : l'approbation du corrigé ne doit
    // ni l'écraser, ni faire disparaître sa pièce jointe.
    expect(detail.statementContent).toContain(statementImageUrl);
    expect(detail.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          part: "STATEMENT",
          fileUrl: statementAttachmentUrl,
        }),
        expect.objectContaining({
          part: "CORRECTION",
          fileUrl: correctionAttachmentUrl,
        }),
      ]),
    );
    expect(detail.attachments).toHaveLength(2);

    const asset = await prisma.inlineMediaAsset.findUnique({
      where: { url: correctionImageUrl },
      select: { entityType: true, entityId: true, status: true },
    });
    expect(asset).toEqual(
      expect.objectContaining({
        entityType: "RESOURCE",
        entityId: `${resourceId}:correction`,
        status: "LINKED",
      }),
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

  it("lets SUPER_ADMIN revoke an approved statement submission back to AWAITING and masks the statement again", async () => {
    const revoke = await apiJson(
      `/api/admin/resources/submissions/${statementSubmissionId}/revoke`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(revoke.response.status).toBe(200);
    expect((revoke.body as { statementStatus: string }).statementStatus).toBe(
      "PENDING",
    );

    // Re-approve so the resource stays in a consistent, publicly-visible
    // state for the remaining tests in this file.
    const reapprove = await apiJson(
      `/api/admin/resources/submissions/${statementSubmissionId}/approve`,
      { method: "PATCH", headers: authHeaders(superAdminToken) },
    );
    expect(reapprove.response.status).toBe(200);
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
      }),
    });
    expect(response.status).toBe(400);
  });

  it("lets the author see their own resource through /resources/mine", async () => {
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
