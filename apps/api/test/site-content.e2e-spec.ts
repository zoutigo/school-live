import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Site content API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const runId = randomSuffix();
  const superAdminEmail = `e2e-site-content-super-${runId}@example.test`;
  const schoolAdminEmail = `e2e-site-content-school-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let superAdminUserId = "";
  let schoolAdminUserId = "";
  let superAdminToken = "";
  let schoolAdminToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
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
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: {
        slug: `e2e-site-content-school-${runId}`,
        name: `E2E Site Content School ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const superAdmin = await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        activeRole: "SUPER_ADMIN",
        platformRoles: { create: { role: "SUPER_ADMIN" } },
      },
      select: { id: true },
    });
    superAdminUserId = superAdmin.id;

    const schoolAdmin = await prisma.user.create({
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
      select: { id: true },
    });
    schoolAdminUserId = schoolAdmin.id;

    superAdminToken = jwtService.sign({ sub: superAdminUserId });
    schoolAdminToken = jwtService.sign({ sub: schoolAdminUserId });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.legalDocument.deleteMany({
        where: { createdById: { in: [superAdminUserId] } },
      });
      await prisma.siteSetting.deleteMany({
        where: { updatedById: { in: [superAdminUserId] } },
      });
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { id: { in: [superAdminUserId, schoolAdminUserId] } },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("expose le fallback de contact publiquement sans authentification", async () => {
    const result = await apiJson("/api/public/site-content/contact");

    expect(result.response.status).toBe(200);
    expect(result.body?.email).toBe("contact@scolive.cm");
  });

  it("expose le fallback légal publiquement pour un slug/locale inconnu", async () => {
    const result = await apiJson("/api/public/site-content/legal/cgu/fr");

    expect(result.response.status).toBe(200);
    expect(result.body?.title).toBe("Conditions générales d'utilisation");
  });

  it("refuse l'accès admin à un utilisateur non SUPER_ADMIN", async () => {
    const result = await apiJson("/api/site-content/admin/contact", {
      headers: { authorization: `Bearer ${schoolAdminToken}` },
    });

    expect(result.response.status).toBe(403);
  });

  it("permet à un SUPER_ADMIN de mettre à jour le contact puis le lit publiquement", async () => {
    const update = await apiJson("/api/site-content/admin/contact", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: `updated-${runId}@scolive.cm`,
        phone: "+237 690000000",
        address: `Douala ${runId}`,
      }),
    });

    expect(update.response.status).toBe(200);
    expect(update.body?.email).toBe(`updated-${runId}@scolive.cm`);

    const publicRead = await apiJson("/api/public/site-content/contact");
    expect(publicRead.body?.email).toBe(`updated-${runId}@scolive.cm`);
  });

  it("gère le cycle brouillon -> publication -> archivage d'un document légal", async () => {
    const create = await apiJson("/api/site-content/admin/legal-documents", {
      method: "POST",
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        slug: "confidentialite",
        locale: "fr",
        title: `Confidentialité E2E ${runId}`,
        contentHtml: "<p>v1</p>",
      }),
    });
    expect(create.response.status).toBe(201);
    const documentId = create.body?.id as string;
    expect(create.body?.status).toBe("DRAFT");
    expect(create.body?.version).toBe(1);

    const beforePublish = await apiJson(
      "/api/public/site-content/legal/confidentialite/fr",
    );
    expect(beforePublish.body?.title).toBe("Politique de confidentialité");

    const publish = await apiJson(
      `/api/site-content/admin/legal-documents/${documentId}/publish`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${superAdminToken}` },
      },
    );
    expect(publish.response.status).toBe(201);
    expect(publish.body?.status).toBe("PUBLISHED");

    const afterPublish = await apiJson(
      "/api/public/site-content/legal/confidentialite/fr",
    );
    expect(afterPublish.body?.title).toBe(`Confidentialité E2E ${runId}`);

    const createV2 = await apiJson("/api/site-content/admin/legal-documents", {
      method: "POST",
      headers: {
        authorization: `Bearer ${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        slug: "confidentialite",
        locale: "fr",
        title: `Confidentialité E2E v2 ${runId}`,
        contentHtml: "<p>v2</p>",
      }),
    });
    expect(createV2.body?.version).toBe(2);

    const publishV2 = await apiJson(
      `/api/site-content/admin/legal-documents/${createV2.body?.id}/publish`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${superAdminToken}` },
      },
    );
    expect(publishV2.response.status).toBe(201);

    const afterPublishV2 = await apiJson(
      "/api/public/site-content/legal/confidentialite/fr",
    );
    expect(afterPublishV2.body?.title).toBe(`Confidentialité E2E v2 ${runId}`);

    const list = await apiJson(
      "/api/site-content/admin/legal-documents?slug=confidentialite&locale=fr",
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );
    const statuses = (list.body as unknown as Array<{ status: string }>)
      .map((doc) => doc.status)
      .sort();
    expect(statuses).toEqual(["ARCHIVED", "PUBLISHED"]);
  });
});
