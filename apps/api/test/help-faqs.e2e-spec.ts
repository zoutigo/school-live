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

describe("Help faqs API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-faq-school-${runId}`;
  const parentEmail = `e2e-faq-parent-${runId}@example.test`;
  const adminEmail = `e2e-faq-admin-${runId}@example.test`;
  const hybridEmail = `e2e-faq-hybrid-${runId}@example.test`;
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
        name: `E2E FAQ School ${runId}`,
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

    const globalFaq = await prisma.helpFaq.create({
      data: {
        schoolId: null,
        audience: "PARENT",
        title: "FAQ parent Scolive",
        slug: `faq-parent-global-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      select: { id: true },
    });

    const faq = await prisma.helpFaq.create({
      data: {
        schoolId,
        audience: "PARENT",
        title: "FAQ parent College Vogt",
        slug: `faq-parent-school-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      select: { id: true },
    });

    await prisma.helpFaqTheme.create({
      data: {
        faqId: globalFaq.id,
        title: "Notes",
        slug: `notes-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
    });

    const theme = await prisma.helpFaqTheme.create({
      data: {
        faqId: faq.id,
        title: "Connexion",
        slug: `connexion-${runId}`,
        status: "PUBLISHED",
        createdById: adminUserId,
        updatedById: adminUserId,
      },
      select: { id: true },
    });

    await prisma.helpFaqItem.createMany({
      data: [
        {
          themeId: theme.id,
          orderIndex: 1,
          question: "Comment me connecter ?",
          answerHtml: "<p>Utilisez vos identifiants parent.</p>",
          answerText: "Utilisez vos identifiants parent.",
          status: "PUBLISHED",
          createdById: adminUserId,
          updatedById: adminUserId,
        },
        {
          themeId: theme.id,
          orderIndex: 2,
          question: "J'ai oublié mon mot de passe",
          answerHtml: "<p>Utilisez le parcours mot de passe oublié.</p>",
          answerText: "Utilisez le parcours mot de passe oublié.",
          status: "PUBLISHED",
          createdById: adminUserId,
          updatedById: adminUserId,
        },
      ],
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.helpFaqItem.deleteMany({
        where: {
          createdById: { in: [parentUserId, adminUserId, hybridUserId] },
        },
      });
      await prisma.helpFaqTheme.deleteMany({
        where: {
          createdById: { in: [parentUserId, adminUserId, hybridUserId] },
        },
      });
      await prisma.helpFaq.deleteMany({
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

  it("retourne une faq et ses thèmes pour un parent", async () => {
    const current = await apiJson("/api/help-faqs/current", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(current.response.status).toBe(200);
    expect(Array.isArray(current.body?.sources)).toBe(true);
    expect((current.body?.sources as unknown[]).length).toBeGreaterThanOrEqual(
      2,
    );
    expect(current.body?.resolvedAudience).toBe("PARENT");
    expect(current.body?.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });

    const themes = await apiJson("/api/help-faqs/current/themes", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(themes.response.status).toBe(200);
    expect(Array.isArray(themes.body?.sources)).toBe(true);
    expect((themes.body?.sources as unknown[]).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("autorise un super admin à lister les faqs admin", async () => {
    const result = await apiJson("/api/help-faqs/admin/global/faqs", {
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(result.response.status).toBe(200);
    expect(Array.isArray(result.body?.items)).toBe(true);
    expect((result.body?.items as unknown[]).length).toBeGreaterThan(0);
  });

  it("interdit à un non-platform d'accéder aux endpoints admin", async () => {
    const result = await apiJson("/api/help-faqs/admin/global/faqs", {
      headers: { authorization: `Bearer ${parentToken}` },
    });

    expect(result.response.status).toBe(403);
  });

  it("désactive la gestion quand le role actif est scolaire", async () => {
    const current = await apiJson("/api/help-faqs/current", {
      headers: { authorization: `Bearer ${hybridToken}` },
    });

    expect(current.response.status).toBe(200);
    expect(current.body?.permissions).toEqual({
      canManageGlobal: false,
      canManageSchool: false,
    });

    const admin = await apiJson("/api/help-faqs/admin/global/faqs", {
      headers: { authorization: `Bearer ${hybridToken}` },
    });
    expect(admin.response.status).toBe(403);
  });
});
