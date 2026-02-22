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

describe("Feed PATCH e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-feed-patch-${runId}`;
  const password = "StrongPass1";

  const parentEmail = `e2e-feed-parent-${runId}@example.test`;
  const staffAEmail = `e2e-feed-staff-a-${runId}@example.test`;
  const staffBEmail = `e2e-feed-staff-b-${runId}@example.test`;
  const schoolAdminEmail = `e2e-feed-school-admin-${runId}@example.test`;

  let schoolId = "";
  let parentUserId = "";
  let staffAUserId = "";
  let staffBUserId = "";
  let schoolAdminUserId = "";

  let parentToken = "";
  let staffAToken = "";
  let staffBToken = "";
  let schoolAdminToken = "";

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
    return String(body?.accessToken ?? "");
  }

  async function createPostAs(
    token: string,
    input: {
      title: string;
      bodyHtml: string;
      attachments?: Array<{
        fileName: string;
        sizeLabel?: string;
        fileUrl?: string;
      }>;
    },
  ) {
    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "POST",
          title: input.title,
          bodyHtml: input.bodyHtml,
          audienceScope: "SCHOOL_ALL",
          audienceLabel: "Toute l'ecole",
          attachments: input.attachments,
        }),
      },
    );

    expect(response.status).toBe(201);
    return String(body?.id ?? "");
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

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Feed Patch ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const parent = await prisma.user.create({
      data: {
        firstName: "Parent",
        lastName: "One",
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

    const staffA = await prisma.user.create({
      data: {
        firstName: "Staff",
        lastName: "Alpha",
        email: staffAEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "SCHOOL_STAFF",
          },
        },
      },
      select: { id: true },
    });
    staffAUserId = staffA.id;

    const staffB = await prisma.user.create({
      data: {
        firstName: "Staff",
        lastName: "Beta",
        email: staffBEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "TEACHER",
          },
        },
      },
      select: { id: true },
    });
    staffBUserId = staffB.id;

    const schoolAdmin = await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: {
            schoolId,
            role: "SCHOOL_ADMIN",
          },
        },
      },
      select: { id: true },
    });
    schoolAdminUserId = schoolAdmin.id;

    parentToken = await login(parentEmail);
    staffAToken = await login(staffAEmail);
    staffBToken = await login(staffBEmail);
    schoolAdminToken = await login(schoolAdminEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }
      const userIds = [
        parentUserId,
        staffAUserId,
        staffBUserId,
        schoolAdminUserId,
      ].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it("allows author to patch own post", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Parent post",
      bodyHtml: "<p>Initial body</p>",
    });

    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          title: "Parent post updated",
          bodyHtml: "<p>Updated body</p>",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(body?.title).toBe("Parent post updated");
  });

  it("allows staff to patch a parent post", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Parent post for staff moderation",
      bodyHtml: "<p>Initial</p>",
    });

    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${staffAToken}`,
        },
        body: JSON.stringify({
          title: "Staff moderated parent post",
          bodyHtml: "<p>Moderated</p>",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(body?.title).toBe("Staff moderated parent post");
  });

  it("forbids staff patching another staff post", async () => {
    const postId = await createPostAs(staffBToken, {
      title: "Staff beta post",
      bodyHtml: "<p>Initial</p>",
    });

    const { response } = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${staffAToken}`,
        },
        body: JSON.stringify({
          title: "Should fail",
          bodyHtml: "<p>Should fail</p>",
        }),
      },
    );

    expect(response.status).toBe(403);
  });

  it("allows SCHOOL_ADMIN patching a staff post", async () => {
    const postId = await createPostAs(staffBToken, {
      title: "Staff beta post admin moderation",
      bodyHtml: "<p>Initial</p>",
    });

    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${schoolAdminToken}`,
        },
        body: JSON.stringify({
          title: "Admin moderated staff post",
          bodyHtml: "<p>Admin updated</p>",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(body?.title).toBe("Admin moderated staff post");
  });

  it("updates attachments on patch", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Post with old attachment",
      bodyHtml: "<p>Body</p>",
      attachments: [{ fileName: "old-attachment.pdf", sizeLabel: "10 Ko" }],
    });

    const beforePatch = await prisma.feedPostAttachment.findMany({
      where: { postId },
      select: { fileName: true },
      orderBy: { createdAt: "asc" },
    });
    expect(beforePatch.map((entry) => entry.fileName)).toEqual([
      "old-attachment.pdf",
    ]);

    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/feed/${postId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({
          title: "Post with new attachment",
          bodyHtml: "<p>Body updated</p>",
          attachments: [{ fileName: "new-attachment.pdf", sizeLabel: "24 Ko" }],
        }),
      },
    );

    expect(response.status).toBe(200);
    const attachments = Array.isArray(body?.attachments)
      ? (body?.attachments as Array<{ fileName: string }>)
      : [];
    expect(attachments.map((entry) => entry.fileName)).toEqual([
      "new-attachment.pdf",
    ]);

    const persistedAttachments = await prisma.feedPostAttachment.findMany({
      where: { postId },
      select: { fileName: true },
      orderBy: { createdAt: "asc" },
    });
    expect(persistedAttachments.map((entry) => entry.fileName)).toEqual([
      "new-attachment.pdf",
    ]);
  });
});
