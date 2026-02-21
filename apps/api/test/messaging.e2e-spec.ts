import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

type LoginPayload = {
  accessToken: string;
};

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("Messaging API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-msg-school-${runId}`;
  const senderEmail = `e2e-msg-sender-${runId}@example.test`;
  const recipientEmail = `e2e-msg-recipient-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let senderUserId = "";
  let recipientUserId = "";
  let createdMessageId = "";

  let senderToken = "";
  let recipientToken = "";

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
      headers: {
        "content-type": "application/json",
      },
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

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Messaging School ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const sender = await prisma.user.create({
      data: {
        firstName: "Sender",
        lastName: "E2E",
        email: senderEmail,
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
    senderUserId = sender.id;

    const recipient = await prisma.user.create({
      data: {
        firstName: "Recipient",
        lastName: "E2E",
        email: recipientEmail,
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
    recipientUserId = recipient.id;

    senderToken = await login(senderEmail);
    recipientToken = await login(recipientEmail);
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }

      const createdUserIds = [senderUserId, recipientUserId].filter(Boolean);
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: {
              in: createdUserIds,
            },
          },
        });
      }
    }

    if (app) {
      await app.close();
    }
  });

  it("covers messaging HTTP lifecycle (create/list/read/archive/delete)", async () => {
    const create = await apiJson(`/api/schools/${schoolSlug}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${senderToken}`,
      },
      body: JSON.stringify({
        subject: "E2E - Demande de suivi",
        body: "<p>Bonjour, ceci est un message e2e.</p>",
        recipientUserIds: [recipientUserId],
      }),
    });

    expect(create.response.status).toBe(201);
    createdMessageId = String(create.body?.id ?? "");
    expect(createdMessageId).toBeTruthy();

    const sent = await apiJson(
      `/api/schools/${schoolSlug}/messages?folder=sent&page=1&limit=20`,
      {
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
      },
    );

    expect(sent.response.status).toBe(200);
    expect(Array.isArray(sent.body?.items)).toBe(true);
    expect(
      (sent.body?.items as Array<{ id: string }>).some(
        (item) => item.id === createdMessageId,
      ),
    ).toBe(true);

    const inbox = await apiJson(
      `/api/schools/${schoolSlug}/messages?folder=inbox&page=1&limit=20`,
      {
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(inbox.response.status).toBe(200);
    expect(Array.isArray(inbox.body?.items)).toBe(true);
    expect(
      (inbox.body?.items as Array<{ id: string; unread: boolean }>).some(
        (item) => item.id === createdMessageId && item.unread === true,
      ),
    ).toBe(true);

    const unreadBefore = await apiJson(
      `/api/schools/${schoolSlug}/messages/unread-count`,
      {
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(unreadBefore.response.status).toBe(200);
    expect(Number(unreadBefore.body?.unread)).toBeGreaterThanOrEqual(1);

    const markRead = await apiJson(
      `/api/schools/${schoolSlug}/messages/${createdMessageId}/read`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${recipientToken}`,
        },
        body: JSON.stringify({ read: true }),
      },
    );

    expect(markRead.response.status).toBe(200);
    expect(markRead.body).toEqual({ success: true });

    const unreadAfter = await apiJson(
      `/api/schools/${schoolSlug}/messages/unread-count`,
      {
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(unreadAfter.response.status).toBe(200);
    expect(Number(unreadAfter.body?.unread)).toBe(0);

    const archive = await apiJson(
      `/api/schools/${schoolSlug}/messages/${createdMessageId}/archive`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${recipientToken}`,
        },
        body: JSON.stringify({ archived: true }),
      },
    );

    expect(archive.response.status).toBe(200);
    expect(archive.body).toEqual({ success: true });

    const archivedList = await apiJson(
      `/api/schools/${schoolSlug}/messages?folder=archive&page=1&limit=20`,
      {
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(archivedList.response.status).toBe(200);
    expect(Array.isArray(archivedList.body?.items)).toBe(true);
    expect(
      (archivedList.body?.items as Array<{ id: string }>).some(
        (item) => item.id === createdMessageId,
      ),
    ).toBe(true);

    const deleteFromInbox = await apiJson(
      `/api/schools/${schoolSlug}/messages/${createdMessageId}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(deleteFromInbox.response.status).toBe(200);
    expect(deleteFromInbox.body).toEqual({ success: true });

    const recipientDetailsAfterDelete = await api(
      `/api/schools/${schoolSlug}/messages/${createdMessageId}`,
      {
        headers: {
          authorization: `Bearer ${recipientToken}`,
        },
      },
    );

    expect(recipientDetailsAfterDelete.status).toBe(404);

    const senderDetails = await apiJson(
      `/api/schools/${schoolSlug}/messages/${createdMessageId}`,
      {
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
      },
    );

    expect(senderDetails.response.status).toBe(200);
    expect(senderDetails.body?.id).toBe(createdMessageId);
  });
});
