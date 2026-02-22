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

describe("Inline media cleanup e2e (feed + messaging)", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-inline-media-${runId}`;
  const userEmail = `e2e-inline-user-${runId}@example.test`;
  const password = "StrongPass1";
  const mediaBase = "https://media.e2e.local";

  let schoolId = "";
  let userId = "";
  let accessToken = "";

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

  function managed(path: string) {
    return `${mediaBase}/messaging/inline-images/${path}`;
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

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `Inline media school ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const createdUser = await prisma.user.create({
      data: {
        firstName: "Inline",
        lastName: "Author",
        email: userEmail,
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
    userId = createdUser.id;

    accessToken = await login(userEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
    }
    if (app) {
      await app.close();
    }
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    delete process.env.MEDIA_SERVICE_URL;
  });

  it("covers create/patch/delete cleanup lifecycle for feed inline images", async () => {
    const urlA = managed(`feed-a-${runId}.webp`);
    const urlB = managed(`feed-b-${runId}.webp`);
    const urlC = managed(`feed-c-${runId}.webp`);
    const urlExpired = managed(`feed-expired-${runId}.webp`);

    await prisma.inlineMediaAsset.createMany({
      data: [
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "FEED",
          status: "TEMP",
          url: urlA,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "FEED",
          status: "TEMP",
          url: urlB,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "FEED",
          status: "TEMP",
          url: urlC,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "FEED",
          status: "TEMP",
          url: urlExpired,
          expiresAt: new Date(Date.now() - 60 * 1000),
        },
      ],
    });

    const created = await apiJson(`/api/schools/${schoolSlug}/feed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        type: "POST",
        title: "Feed inline create",
        bodyHtml: `<p><img src="${urlA}" /></p>`,
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'ecole",
      }),
    });
    expect(created.response.status).toBe(201);
    const postId = String(created.body?.id ?? "");
    expect(postId).toBeTruthy();

    const linkedAfterCreate = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlA },
      select: { status: true, entityType: true, entityId: true },
    });
    expect(linkedAfterCreate).toEqual({
      status: "LINKED",
      entityType: "FEED_POST",
      entityId: postId,
    });

    const tempStillThere = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlB },
      select: { status: true, entityType: true, entityId: true },
    });
    expect(tempStillThere).toEqual({
      status: "TEMP",
      entityType: null,
      entityId: null,
    });

    const expiredTemp = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlExpired },
      select: { id: true },
    });
    expect(expiredTemp).toBeNull();

    const patched = await apiJson(`/api/schools/${schoolSlug}/feed/${postId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: "Feed inline patch",
        bodyHtml: `<p><img src="${urlC}" /></p>`,
        attachments: [],
      }),
    });
    expect(patched.response.status).toBe(200);

    const removedA = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlA },
      select: { id: true },
    });
    expect(removedA).toBeNull();

    const linkedC = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlC },
      select: { status: true, entityType: true, entityId: true },
    });
    expect(linkedC).toEqual({
      status: "LINKED",
      entityType: "FEED_POST",
      entityId: postId,
    });

    const deleted = await apiJson(`/api/schools/${schoolSlug}/feed/${postId}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    expect(deleted.response.status).toBe(200);

    const remainingLinked = await prisma.inlineMediaAsset.findMany({
      where: {
        entityType: "FEED_POST",
        entityId: postId,
      },
      select: { id: true },
    });
    expect(remainingLinked).toHaveLength(0);
  });

  it("covers create/patch/delete cleanup lifecycle for messaging draft inline images", async () => {
    const urlM1 = managed(`msg-1-${runId}.webp`);
    const urlM2 = managed(`msg-2-${runId}.webp`);
    const urlM3 = managed(`msg-3-${runId}.webp`);

    await prisma.inlineMediaAsset.createMany({
      data: [
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "MESSAGING",
          status: "TEMP",
          url: urlM1,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "MESSAGING",
          status: "TEMP",
          url: urlM2,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          schoolId,
          uploadedByUserId: userId,
          scope: "MESSAGING",
          status: "TEMP",
          url: urlM3,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    });

    const createdDraft = await apiJson(`/api/schools/${schoolSlug}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subject: "Draft with inline image",
        body: `<p><img src="${urlM1}" /></p>`,
        recipientUserIds: [],
        isDraft: true,
      }),
    });
    expect(createdDraft.response.status).toBe(201);
    const messageId = String(createdDraft.body?.id ?? "");
    expect(messageId).toBeTruthy();

    const linkedM1 = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlM1 },
      select: { status: true, entityType: true, entityId: true },
    });
    expect(linkedM1).toEqual({
      status: "LINKED",
      entityType: "INTERNAL_MESSAGE",
      entityId: messageId,
    });

    const patchedDraft = await apiJson(
      `/api/schools/${schoolSlug}/messages/${messageId}/draft`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          body: `<p><img src="${urlM3}" /></p>`,
        }),
      },
    );
    expect(patchedDraft.response.status).toBe(200);

    const removedM1 = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlM1 },
      select: { id: true },
    });
    expect(removedM1).toBeNull();

    const linkedM3 = await prisma.inlineMediaAsset.findUnique({
      where: { url: urlM3 },
      select: { status: true, entityType: true, entityId: true },
    });
    expect(linkedM3).toEqual({
      status: "LINKED",
      entityType: "INTERNAL_MESSAGE",
      entityId: messageId,
    });

    const deletedDraft = await apiJson(
      `/api/schools/${schoolSlug}/messages/${messageId}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    expect(deletedDraft.response.status).toBe(200);

    const linkedAfterDelete = await prisma.inlineMediaAsset.findMany({
      where: {
        entityType: "INTERNAL_MESSAGE",
        entityId: messageId,
      },
      select: { id: true },
    });
    expect(linkedAfterDelete).toHaveLength(0);
  });
});
