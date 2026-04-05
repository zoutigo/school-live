import "reflect-metadata";
import { BadGatewayException, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { MediaClientService } from "../src/media-client/media-client.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

type LoginPayload = {
  accessToken: string;
};

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Messaging API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let mediaClientService: MediaClientService;
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
    process.env.MEDIA_PUBLIC_BASE_URL = "https://cdn.example.test";

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
    mediaClientService = app.get(MediaClientService);

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

    delete process.env.MEDIA_PUBLIC_BASE_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("uploads inline images through multipart endpoint and persists temp media metadata", async () => {
    const uploadSpy = jest
      .spyOn(mediaClientService, "uploadImage")
      .mockResolvedValue({
        url: `https://cdn.example.test/messaging-inline-${runId}.webp`,
        size: 2048,
        width: 1200,
        height: 800,
        mimeType: "image/webp",
      });

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.from("fake-image-binary")], { type: "image/png" }),
      "inline.png",
    );

    const response = await api(
      `/api/schools/${schoolSlug}/messages/uploads/inline-image`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        body: formData,
      },
    );

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(201);
    expect(uploadSpy).toHaveBeenCalledWith(
      "messaging-inline-image",
      expect.objectContaining({
        mimetype: "image/png",
      }),
    );
    expect(body).toMatchObject({
      url: `https://cdn.example.test/messaging-inline-${runId}.webp`,
      mimeType: "image/webp",
    });

    const tempAsset = await prisma.inlineMediaAsset.findUnique({
      where: { url: `https://cdn.example.test/messaging-inline-${runId}.webp` },
      select: {
        schoolId: true,
        uploadedByUserId: true,
        scope: true,
        status: true,
      },
    });

    expect(tempAsset).toEqual({
      schoolId,
      uploadedByUserId: senderUserId,
      scope: "MESSAGING",
      status: "TEMP",
    });
  });

  it("rejects inline image upload when file is missing", async () => {
    const response = await api(
      `/api/schools/${schoolSlug}/messages/uploads/inline-image`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        body: new FormData(),
      },
    );

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(400);
    expect(String(body.message)).toBe("Fichier image manquant");
  });

  it("surfaces media service failures for inline image uploads", async () => {
    jest
      .spyOn(mediaClientService, "uploadImage")
      .mockRejectedValue(new BadGatewayException("Type upload non supporte"));

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.from("bad-image")], { type: "image/png" }),
      "inline.png",
    );

    const response = await api(
      `/api/schools/${schoolSlug}/messages/uploads/inline-image`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${senderToken}`,
        },
        body: formData,
      },
    );

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(502);
    expect(String(body.message)).toBe("Type upload non supporte");
  });

  it("creates a message from multipart/form-data with attachment metadata", async () => {
    const attachmentUrl = `https://cdn.example.test/messaging-attachment-${runId}.pdf`;
    const uploadSpy = jest
      .spyOn(mediaClientService, "uploadImage")
      .mockResolvedValue({
        url: attachmentUrl,
        size: 4096,
        width: null,
        height: null,
        mimeType: "application/pdf",
      });

    const formData = new FormData();
    formData.append("subject", "E2E multipart attachment");
    formData.append("body", "<p>Bonjour avec piece jointe</p>");
    formData.append("recipientUserIds", recipientUserId);
    formData.append(
      "attachments",
      new Blob([Buffer.from("fake-pdf")], { type: "application/pdf" }),
      "bulletin.pdf",
    );

    const response = await api(`/api/schools/${schoolSlug}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${senderToken}`,
      },
      body: formData,
    });

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(201);
    expect(uploadSpy).toHaveBeenCalledWith(
      "messaging-attachment",
      expect.objectContaining({
        originalname: "bulletin.pdf",
        mimetype: "application/pdf",
      }),
    );
    expect(Array.isArray(body.attachments)).toBe(true);
    expect(body.attachments).toEqual([
      expect.objectContaining({
        fileName: "bulletin.pdf",
        url: attachmentUrl,
        mimeType: "application/pdf",
        sizeBytes: 4096,
      }),
    ]);

    const persisted = await prisma.internalMessageAttachment.findFirst({
      where: {
        messageId: String(body.id),
      },
      select: {
        fileName: true,
        fileUrl: true,
        mimeType: true,
        sizeBytes: true,
      },
    });

    expect(persisted).toEqual({
      fileName: "bulletin.pdf",
      fileUrl: attachmentUrl,
      mimeType: "application/pdf",
      sizeBytes: 4096,
    });
  });

  it("returns multipart validation errors before persisting a message", async () => {
    const formData = new FormData();
    formData.append("subject", "Sans destinataire");
    formData.append("body", "<p>Bonjour</p>");

    const response = await api(`/api/schools/${schoolSlug}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${senderToken}`,
      },
      body: formData,
    });

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(400);
    expect(String(body.message)).toBe("At least one recipient is required");
  });

  it("surfaces attachment upload failures from the media service", async () => {
    jest
      .spyOn(mediaClientService, "uploadImage")
      .mockRejectedValue(new BadGatewayException("Type upload non supporte"));

    const formData = new FormData();
    formData.append("subject", "Multipart failure");
    formData.append("body", "<p>Bonjour</p>");
    formData.append("recipientUserIds", recipientUserId);
    formData.append(
      "attachments",
      new Blob([Buffer.from("bad-pdf")], { type: "application/pdf" }),
      "bulletin.pdf",
    );

    const response = await api(`/api/schools/${schoolSlug}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${senderToken}`,
      },
      body: formData,
    });

    const body = (await response.json()) as JsonObject;

    expect(response.status).toBe(502);
    expect(String(body.message)).toBe("Type upload non supporte");
  });
});
