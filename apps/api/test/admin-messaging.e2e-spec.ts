import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;
type LoginPayload = { accessToken: string };

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Admin messaging API e2e — mailbox agrégée SUPER_ADMIN/ADMIN", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolASlug = `e2e-admin-msg-a-${runId}`;
  const schoolBSlug = `e2e-admin-msg-b-${runId}`;
  const superAdminEmail = `e2e-admin-msg-super-${runId}@example.test`;
  const schoolAdminAEmail = `e2e-admin-msg-schooladmin-a-${runId}@example.test`;
  const schoolAdminBEmail = `e2e-admin-msg-schooladmin-b-${runId}@example.test`;
  const parentAEmail = `e2e-admin-msg-parent-a-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolAId = "";
  let schoolBId = "";
  let superAdminId = "";
  let schoolAdminAId = "";
  let schoolAdminBId = "";
  let parentAId = "";

  let superAdminToken = "";
  let schoolAdminAToken = "";
  let parentAToken = "";

  const userIdsToCleanup: string[] = [];

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  async function login(email: string) {
    const { response, body } = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(response.status).toBe(201);
    return String((body as LoginPayload).accessToken);
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
    const superAdminPhone = `+336${String(
      Math.floor(Math.random() * 1e8),
    ).padStart(8, "0")}`;

    const schoolA = await prisma.school.create({
      data: { slug: schoolASlug, name: `E2E Admin Msg School A ${runId}` },
      select: { id: true },
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: { slug: schoolBSlug, name: `E2E Admin Msg School B ${runId}` },
      select: { id: true },
    });
    schoolBId = schoolB.id;

    const superAdmin = await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        phone: superAdminPhone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        platformRoles: { create: { role: "SUPER_ADMIN" } },
        phoneCredential: {
          create: {
            phoneE164: superAdminPhone,
            pinHash,
            verifiedAt: new Date(),
          },
        },
      },
      select: { id: true },
    });
    superAdminId = superAdmin.id;
    userIdsToCleanup.push(superAdminId);

    const schoolAdminA = await prisma.user.create({
      data: {
        firstName: "Directeur",
        lastName: "EcoleA",
        email: schoolAdminAEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId: schoolAId, role: "SCHOOL_ADMIN" } },
      },
      select: { id: true },
    });
    schoolAdminAId = schoolAdminA.id;
    userIdsToCleanup.push(schoolAdminAId);

    const schoolAdminB = await prisma.user.create({
      data: {
        firstName: "Directeur",
        lastName: "EcoleB",
        email: schoolAdminBEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId: schoolBId, role: "SCHOOL_ADMIN" } },
      },
      select: { id: true },
    });
    schoolAdminBId = schoolAdminB.id;
    userIdsToCleanup.push(schoolAdminBId);

    const parentA = await prisma.user.create({
      data: {
        firstName: "Parent",
        lastName: "EcoleA",
        email: parentAEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId: schoolAId, role: "PARENT" } },
      },
      select: { id: true },
    });
    parentAId = parentA.id;
    userIdsToCleanup.push(parentAId);

    superAdminToken = await login(superAdminEmail);
    schoolAdminAToken = await login(schoolAdminAEmail);
    parentAToken = await login(parentAEmail);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.school.deleteMany({
        where: { id: { in: [schoolAId, schoolBId].filter(Boolean) } },
      });
      if (userIdsToCleanup.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIdsToCleanup } },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it("rejects a non-platform role on /admin/messages", async () => {
    const { response } = await apiJson(`/api/admin/messages?folder=inbox`, {
      headers: { authorization: `Bearer ${schoolAdminAToken}` },
    });

    expect(response.status).toBe(403);
  });

  it("lets a school admin send a message to the super admin, and the super admin sees it in the aggregated inbox", async () => {
    const create = await apiJson(`/api/schools/${schoolASlug}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${schoolAdminAToken}`,
      },
      body: JSON.stringify({
        subject: "E2E - Question pour la plateforme",
        body: "<p>Bonjour, besoin d'aide.</p>",
        recipientUserIds: [superAdminId],
      }),
    });

    expect(create.response.status).toBe(201);

    const adminInbox = await apiJson(
      `/api/admin/messages?folder=inbox&page=1&limit=50`,
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );

    expect(adminInbox.response.status).toBe(200);
    const subjects = (adminInbox.body?.items as Array<{ subject: string }>).map(
      (item) => item.subject,
    );
    expect(subjects).toContain("E2E - Question pour la plateforme");
  });

  it("lets the super admin reply to a parent in a different school, delivered to that school's mailbox", async () => {
    const create = await apiJson(`/api/admin/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        subject: "E2E - Message de la plateforme",
        body: "<p>Bonjour, voici une information.</p>",
        recipientUserIds: [parentAId],
      }),
    });

    expect(create.response.status).toBe(201);

    const parentInbox = await apiJson(
      `/api/schools/${schoolASlug}/messages?folder=inbox&page=1&limit=50`,
      { headers: { authorization: `Bearer ${parentAToken}` } },
    );

    expect(parentInbox.response.status).toBe(200);
    const subjects = (
      parentInbox.body?.items as Array<{ subject: string }>
    ).map((item) => item.subject);
    expect(subjects).toContain("E2E - Message de la plateforme");
  });

  it("broadcasts a single compose action across every school involved (one copy per school)", async () => {
    const broadcast = await apiJson(`/api/admin/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        subject: "E2E - À tous les directeurs",
        body: "<p>Message groupé.</p>",
        recipientUserIds: [schoolAdminAId, schoolAdminBId],
      }),
    });

    expect(broadcast.response.status).toBe(201);
    expect(broadcast.body?.broadcast).toBe(true);
    expect(broadcast.body?.schools).toBe(2);

    const schoolAAdminInbox = await apiJson(
      `/api/schools/${schoolASlug}/messages?folder=inbox&page=1&limit=50`,
      { headers: { authorization: `Bearer ${schoolAdminAToken}` } },
    );
    const schoolAAdminSubjects = (
      schoolAAdminInbox.body?.items as Array<{ subject: string }>
    ).map((item) => item.subject);
    expect(schoolAAdminSubjects).toContain("E2E - À tous les directeurs");
  });

  it("lists platform admins as selectable recipients from a school's messaging/recipients endpoint", async () => {
    const { response, body } = await apiJson(
      `/api/schools/${schoolASlug}/messaging/recipients`,
      { headers: { authorization: `Bearer ${schoolAdminAToken}` } },
    );

    expect(response.status).toBe(200);
    const platformAdmins = body?.platformAdmins as Array<{ value: string }>;
    expect(platformAdmins.some((entry) => entry.value === superAdminId)).toBe(
      true,
    );
  });

  it("never exposes a message between two school users the platform admin isn't a party to", async () => {
    const create = await apiJson(`/api/schools/${schoolASlug}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${schoolAdminAToken}`,
      },
      body: JSON.stringify({
        subject: "E2E - Prive entre ecole A",
        body: "<p>Ceci ne concerne pas la plateforme.</p>",
        recipientUserIds: [parentAId],
      }),
    });

    expect(create.response.status).toBe(201);

    const adminInbox = await apiJson(
      `/api/admin/messages?folder=inbox&page=1&limit=100`,
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );

    const subjects = (adminInbox.body?.items as Array<{ subject: string }>).map(
      (item) => item.subject,
    );
    expect(subjects).not.toContain("E2E - Prive entre ecole A");
  });
});
