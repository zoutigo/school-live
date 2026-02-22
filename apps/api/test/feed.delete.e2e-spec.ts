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

describe("Feed DELETE e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-feed-delete-${runId}`;
  const password = "StrongPass1";

  const parentEmail = `e2e-feed-del-parent-${runId}@example.test`;
  const staffAEmail = `e2e-feed-del-staff-a-${runId}@example.test`;
  const staffBEmail = `e2e-feed-del-staff-b-${runId}@example.test`;
  const schoolAdminEmail = `e2e-feed-del-school-admin-${runId}@example.test`;

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
    input: { title: string; bodyHtml: string },
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
        }),
      },
    );

    expect(response.status).toBe(201);
    return String(body?.id ?? "");
  }

  async function deletePostAs(token: string, postId: string) {
    return apiJson(`/api/schools/${schoolSlug}/feed/${postId}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
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
        name: `E2E Feed Delete ${runId}`,
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

  it("allows author to delete own post", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Parent own post",
      bodyHtml: "<p>Body</p>",
    });

    const deleted = await deletePostAs(parentToken, postId);
    expect(deleted.response.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, postId });

    const deletedAgain = await deletePostAs(parentToken, postId);
    expect(deletedAgain.response.status).toBe(404);
  });

  it("removes feed attachments from DB when post is deleted", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Parent own post with attachment",
      bodyHtml: "<p>Body</p>",
    });

    await prisma.feedPostAttachment.create({
      data: {
        postId,
        fileName: "to-delete.pdf",
        sizeLabel: "20 Ko",
      },
    });

    const beforeDeleteCount = await prisma.feedPostAttachment.count({
      where: { postId },
    });
    expect(beforeDeleteCount).toBeGreaterThan(0);

    const deleted = await deletePostAs(parentToken, postId);
    expect(deleted.response.status).toBe(200);

    const postCount = await prisma.feedPost.count({ where: { id: postId } });
    const attachmentCount = await prisma.feedPostAttachment.count({
      where: { postId },
    });
    expect(postCount).toBe(0);
    expect(attachmentCount).toBe(0);
  });

  it("allows staff to delete a parent post", async () => {
    const postId = await createPostAs(parentToken, {
      title: "Parent post for staff delete",
      bodyHtml: "<p>Body</p>",
    });

    const deleted = await deletePostAs(staffAToken, postId);
    expect(deleted.response.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, postId });
  });

  it("forbids staff deleting another staff post", async () => {
    const postId = await createPostAs(staffBToken, {
      title: "Staff beta post",
      bodyHtml: "<p>Body</p>",
    });

    const deleted = await deletePostAs(staffAToken, postId);
    expect(deleted.response.status).toBe(403);
  });

  it("allows SCHOOL_ADMIN deleting a staff post", async () => {
    const postId = await createPostAs(staffBToken, {
      title: "Staff beta post for school admin",
      bodyHtml: "<p>Body</p>",
    });

    const deleted = await deletePostAs(schoolAdminToken, postId);
    expect(deleted.response.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, postId });
  });
});
