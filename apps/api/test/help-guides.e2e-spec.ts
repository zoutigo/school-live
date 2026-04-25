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

describe("Help guides API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-help-school-${runId}`;
  const parentEmail = `e2e-help-parent-${runId}@example.test`;
  const adminEmail = `e2e-help-admin-${runId}@example.test`;
  const hybridEmail = `e2e-help-hybrid-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let parentUserId = "";
  let adminUserId = "";
  let hybridUserId = "";
  let parentToken = "";
  let adminToken = "";
  let hybridToken = "";

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
        slug: schoolSlug,
        name: `E2E Help School ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const parent = await prisma.user.create({
      data: {
        firstName: "Parent",
        lastName: "E2E",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "PARENT",
          },
        },
      },
      select: { id: true },
    });
    parentUserId = parent.id;

    const admin = await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "E2E",
        email: adminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "SCHOOL_ADMIN",
          },
        },
        platformRoles: {
          create: {
            role: "SUPER_ADMIN",
          },
        },
      },
      select: { id: true },
    });
    adminUserId = admin.id;

    const hybrid = await prisma.user.create({
      data: {
        firstName: "Hybrid",
        lastName: "TeacherAdmin",
        email: hybridEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        activeRole: "TEACHER",
        memberships: {
          create: {
            schoolId,
            role: "TEACHER",
          },
        },
        platformRoles: {
          create: {
            role: "ADMIN",
          },
        },
      },
      select: { id: true },
    });
    hybridUserId = hybrid.id;

    parentToken = jwtService.sign({ sub: parentUserId });
    adminToken = jwtService.sign({ sub: adminUserId });
    hybridToken = jwtService.sign({ sub: hybridUserId });

    const globalGuide = await prisma.helpGuide.create({
      data: {
        schoolId: null,
        audience: "PARENT",
        title: "Guide parent Scolive",
        slug: `guide-parent-scolive-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      select: { id: true },
    });

    const schoolGuide = await prisma.helpGuide.create({
      data: {
        schoolId,
        audience: "PARENT",
        title: "Guide parent College",
        slug: `guide-parent-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      select: { id: true },
    });

    await prisma.helpChapter.createMany({
      data: [
        {
          guideId: globalGuide.id,
          orderIndex: 1,
          title: "Messagerie Scolive",
          slug: `messagerie-scolive-${runId}`,
          contentType: "RICH_TEXT",
          contentHtml: "<p>Guide global messagerie</p>",
          contentText: "Guide global messagerie",
          status: "PUBLISHED",
          createdById: adminUserId,
          updatedById: adminUserId,
        },
        {
          guideId: schoolGuide.id,
          orderIndex: 1,
          title: "Messagerie",
          slug: `messagerie-${runId}`,
          contentType: "RICH_TEXT",
          contentHtml: "<p>Guide messagerie</p>",
          contentText: "Guide messagerie",
          status: "PUBLISHED",
          createdById: adminUserId,
          updatedById: adminUserId,
        },
        {
          guideId: schoolGuide.id,
          orderIndex: 2,
          title: "Tutoriel vidéo",
          slug: `video-${runId}`,
          contentType: "VIDEO",
          videoUrl: "https://example.test/video.mp4",
          contentText: "",
          status: "PUBLISHED",
          createdById: adminUserId,
          updatedById: adminUserId,
        },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.helpChapter.deleteMany({
        where: {
          createdById: { in: [parentUserId, adminUserId, hybridUserId] },
        },
      });
      await prisma.helpGuide.deleteMany({
        where: {
          createdById: { in: [parentUserId, adminUserId, hybridUserId] },
        },
      });
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { id: { in: [parentUserId, adminUserId, hybridUserId] } },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("retourne un guide et son plan pour un parent", async () => {
    const current = await apiJson("/api/help-guides/current", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(current.response.status).toBe(200);
    expect(Array.isArray(current.body?.sources)).toBe(true);
    expect((current.body?.sources as unknown[]).length).toBe(2);
    expect(current.body?.resolvedAudience).toBe("PARENT");
    expect(current.body?.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });
    expect(
      new Set(
        (current.body?.sources as Array<{ scopeType: string }>).map(
          (source) => source.scopeType,
        ),
      ),
    ).toEqual(new Set(["GLOBAL", "SCHOOL"]));

    const plan = await apiJson("/api/help-guides/current/plan", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(plan.response.status).toBe(200);
    expect(Array.isArray(plan.body?.sources)).toBe(true);
    expect((plan.body?.sources as unknown[]).length).toBe(2);
  });

  it("autorise un super admin à lister les guides admin", async () => {
    const result = await apiJson("/api/help-guides/admin/global/guides", {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(result.response.status).toBe(200);
    expect(Array.isArray(result.body?.items)).toBe(true);
    expect((result.body?.items as unknown[]).length).toBeGreaterThan(0);
  });

  it("interdit à un non-platform d'accéder aux endpoints admin", async () => {
    const result = await apiJson("/api/help-guides/admin/global/guides", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(result.response.status).toBe(403);
  });

  it("désactive la gestion quand le role actif est scolaire", async () => {
    const current = await apiJson("/api/help-guides/current", {
      headers: { authorization: `Bearer ${hybridToken}` },
    });

    expect(current.response.status).toBe(200);
    expect(current.body?.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });

    const admin = await apiJson("/api/help-guides/admin/global/guides", {
      headers: { authorization: `Bearer ${hybridToken}` },
    });
    expect(admin.response.status).toBe(403);
  });
});
