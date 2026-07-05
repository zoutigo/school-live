import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { InlineMediaService } from "../media/inline-media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MessagingService } from "./messaging.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Alice",
    lastName: "Martin",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
    ...overrides,
  };
}

const makePrismaMock = () => {
  const client = {
    internalMessage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    internalMessageRecipient: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    internalMessageAttachment: { findMany: jest.fn() },
    schoolMembership: { findMany: jest.fn() },
    platformRoleAssignment: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  // Supports both array-form (`$transaction([...])`) and callback-form
  // (`$transaction(async (tx) => {...})`) usages — updateDraft() uses the
  // latter, passing the same mocked client through as `tx`.
  client.$transaction.mockImplementation(
    (arg: Promise<unknown>[] | ((tx: typeof client) => Promise<unknown>)) => {
      if (typeof arg === "function") {
        return arg(client);
      }
      return Promise.all(arg);
    },
  );

  return client;
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe("MessagingService", () => {
  let service: MessagingService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mediaClient: { uploadImage: jest.Mock; deleteImageByUrl: jest.Mock };
  let inlineMedia: {
    syncEntityImages: jest.Mock;
    removeEntityImages: jest.Mock;
  };

  beforeEach(async () => {
    prisma = makePrismaMock();
    mediaClient = { uploadImage: jest.fn(), deleteImageByUrl: jest.fn() };
    inlineMedia = {
      syncEntityImages: jest.fn(),
      removeEntityImages: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MailService,
          useValue: { sendInternalMessageNotification: jest.fn() },
        },
        { provide: MediaClientService, useValue: mediaClient },
        { provide: InlineMediaService, useValue: inlineMedia },
      ],
    }).compile();

    service = module.get(MessagingService);
  });

  // ── archiveMessage — réception ──────────────────────────────────────────────

  describe("archiveMessage() — destinataire", () => {
    const recipientUser = makeUser({ id: "recipient-1" });
    const message = { id: "msg-1", senderUserId: "sender-1" };
    const recipientRow = { id: "rec-1" };

    it("archive le message en positionnant archivedAt", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      const result = await service.archiveMessage(
        recipientUser,
        "school-1",
        "msg-1",
        true,
      );

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { archivedAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true });
    });

    it("désarchive le message en remettant archivedAt à null", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.archiveMessage(recipientUser, "school-1", "msg-1", false);

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { archivedAt: null },
      });
    });

    it("double désarchivage idempotent : remet archivedAt à null sans erreur", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.archiveMessage(recipientUser, "school-1", "msg-1", false);
      await service.archiveMessage(recipientUser, "school-1", "msg-1", false);

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledTimes(2);
      const lastCall = prisma.internalMessageRecipient.update.mock.calls[1][0];
      expect(lastCall.data.archivedAt).toBeNull();
    });

    it("lance NotFoundException si le message n'existe pas", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.archiveMessage(recipientUser, "school-1", "msg-missing", false),
      ).rejects.toThrow(NotFoundException);
    });

    it("lance NotFoundException si l'utilisateur n'est pas destinataire", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(null);

      await expect(
        service.archiveMessage(recipientUser, "school-1", "msg-1", false),
      ).rejects.toThrow(NotFoundException);
    });

    it("ne touche pas internalMessage (table émetteur) pour un destinataire", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.archiveMessage(recipientUser, "school-1", "msg-1", false);

      expect(prisma.internalMessage.update).not.toHaveBeenCalled();
    });
  });

  // ── archiveMessage — émetteur ───────────────────────────────────────────────

  describe("archiveMessage() — émetteur", () => {
    const senderUser = makeUser({ id: "sender-1" });
    const message = { id: "msg-1", senderUserId: "sender-1" };

    it("archive via senderArchivedAt sur le message", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.archiveMessage(senderUser, "school-1", "msg-1", true);

      expect(prisma.internalMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { senderArchivedAt: expect.any(Date) },
      });
    });

    it("désarchive l'émetteur en remettant senderArchivedAt à null", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.archiveMessage(senderUser, "school-1", "msg-1", false);

      expect(prisma.internalMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { senderArchivedAt: null },
      });
    });

    it("ne touche pas internalMessageRecipient pour l'émetteur", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.archiveMessage(senderUser, "school-1", "msg-1", false);

      expect(prisma.internalMessageRecipient.update).not.toHaveBeenCalled();
    });

    it("lance NotFoundException si le message n'existe pas", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.archiveMessage(senderUser, "school-1", "msg-missing", false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── archiveMessage — couverture tous types d'utilisateurs ─────────────────

  describe("archiveMessage() — rôles et types d'utilisateurs", () => {
    const roles = [
      "PARENT",
      "TEACHER",
      "SCHOOL_ADMIN",
      "SCHOOL_MANAGER",
      "SCHOOL_STAFF",
      "STUDENT",
    ] as const;

    for (const role of roles) {
      it(`désarchive correctement pour un ${role} destinataire`, async () => {
        const user = makeUser({
          id: `${role.toLowerCase()}-user`,
          memberships: [{ schoolId: "school-1", role }],
        });
        const message = { id: "msg-1", senderUserId: "sender-other" };
        const recipientRow = { id: "rec-1" };

        prisma.internalMessage.findFirst.mockResolvedValue(message);
        prisma.internalMessageRecipient.findFirst.mockResolvedValue(
          recipientRow,
        );
        prisma.internalMessageRecipient.update.mockResolvedValue({});

        const result = await service.archiveMessage(
          user,
          "school-1",
          "msg-1",
          false,
        );

        expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
          where: { id: "rec-1" },
          data: { archivedAt: null },
        });
        expect(result).toEqual({ success: true });
      });

      it(`archive correctement pour un ${role} destinataire`, async () => {
        const user = makeUser({
          id: `${role.toLowerCase()}-user`,
          memberships: [{ schoolId: "school-1", role }],
        });
        const message = { id: "msg-1", senderUserId: "sender-other" };
        const recipientRow = { id: "rec-1" };

        prisma.internalMessage.findFirst.mockResolvedValue(message);
        prisma.internalMessageRecipient.findFirst.mockResolvedValue(
          recipientRow,
        );
        prisma.internalMessageRecipient.update.mockResolvedValue({});

        const result = await service.archiveMessage(
          user,
          "school-1",
          "msg-1",
          true,
        );

        expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
          where: { id: "rec-1" },
          data: { archivedAt: expect.any(Date) },
        });
        expect(result).toEqual({ success: true });
      });
    }

    it("un TEACHER peut archiver ses propres messages envoyés", async () => {
      const teacher = makeUser({
        id: "teacher-1",
        memberships: [{ schoolId: "school-1", role: "TEACHER" }],
      });
      const sentMessage = { id: "msg-1", senderUserId: "teacher-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(sentMessage);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.archiveMessage(teacher, "school-1", "msg-1", true);

      expect(prisma.internalMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { senderArchivedAt: expect.any(Date) },
      });
    });

    it("un TEACHER peut désarchiver ses propres messages envoyés", async () => {
      const teacher = makeUser({
        id: "teacher-1",
        memberships: [{ schoolId: "school-1", role: "TEACHER" }],
      });
      const sentMessage = { id: "msg-1", senderUserId: "teacher-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(sentMessage);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.archiveMessage(teacher, "school-1", "msg-1", false);

      expect(prisma.internalMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { senderArchivedAt: null },
      });
    });

    it("un membre d'une école ne peut pas agir sur une autre école (ForbiddenException)", async () => {
      const user = makeUser({
        id: "user-1",
        memberships: [{ schoolId: "school-A", role: "PARENT" }],
      });

      await expect(
        service.archiveMessage(user, "school-B", "msg-1", false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("un utilisateur sans aucun membership lance ForbiddenException", async () => {
      const noMemberUser = makeUser({ id: "user-1", memberships: [] });

      await expect(
        service.archiveMessage(noMemberUser, "school-1", "msg-1", false),
      ).rejects.toThrow(ForbiddenException);
    });

    it("un SUPER_ADMIN peut agir sur n'importe quelle école sans membership", async () => {
      const superAdmin = makeUser({
        id: "super-1",
        platformRoles: ["SUPER_ADMIN"],
        memberships: [],
      });
      const message = { id: "msg-1", senderUserId: "other-user" };
      const recipientRow = { id: "rec-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await expect(
        service.archiveMessage(superAdmin, "school-X", "msg-1", false),
      ).resolves.toEqual({ success: true });
    });

    it("un ADMIN peut agir sur n'importe quelle école sans membership", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["ADMIN"],
        memberships: [],
      });
      const message = { id: "msg-1", senderUserId: "other-user" };
      const recipientRow = { id: "rec-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await expect(
        service.archiveMessage(admin, "school-X", "msg-1", false),
      ).resolves.toEqual({ success: true });
    });
  });

  // ── listMessages — inbox exclut les messages archivés ──────────────────────

  describe("listMessages() — inbox", () => {
    it("exclut les messages archivés de la boîte de réception", async () => {
      const user = makeUser();
      prisma.internalMessageRecipient.count.mockResolvedValue(0);
      prisma.internalMessageRecipient.findMany.mockResolvedValue([]);

      await service.listMessages(user, "school-1", { folder: "inbox" });

      const whereArg =
        prisma.internalMessageRecipient.findMany.mock.calls[0][0].where;
      expect(whereArg.archivedAt).toBeNull();
      expect(whereArg.deletedAt).toBeNull();
    });
  });

  // ── listMessages — archive inclut uniquement les archivés ──────────────────

  describe("listMessages() — archive", () => {
    it("inclut seulement les messages avec archivedAt non null pour le destinataire", async () => {
      const user = makeUser();

      // Transaction mock : archive retourne [] pour les deux requêtes
      prisma.$transaction.mockResolvedValue([[], []]);

      await service.listMessages(user, "school-1", { folder: "archive" });

      // La transaction est appelée avec les deux requêtes (reçus + envoyés)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── markRead ───────────────────────────────────────────────────────────────

  describe("markRead()", () => {
    it("marque le message comme lu", async () => {
      const user = makeUser();
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({
        id: "rec-1",
      });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.markRead(user, "school-1", "msg-1", true);

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { readAt: expect.any(Date) },
      });
    });

    it("marque le message comme non lu (readAt=null)", async () => {
      const user = makeUser();
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({
        id: "rec-1",
      });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.markRead(user, "school-1", "msg-1", false);

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { readAt: null },
      });
    });

    it("lance NotFoundException si le destinataire n'existe pas", async () => {
      const user = makeUser();
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(null);

      await expect(
        service.markRead(user, "school-1", "msg-1", true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteFromMailbox ──────────────────────────────────────────────────────

  describe("deleteFromMailbox()", () => {
    it("soft-delete le recipient row pour un destinataire", async () => {
      const user = makeUser({ id: "recipient-1" });
      const message = { id: "msg-1", status: "SENT", senderUserId: "sender-1" };
      const recipientRow = { id: "rec-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      const result = await service.deleteFromMailbox(user, "school-1", "msg-1");

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true });
    });

    it("archive l'émetteur (SENT) au lieu de supprimer physiquement", async () => {
      const senderUser = makeUser({ id: "sender-1" });
      const message = { id: "msg-1", status: "SENT", senderUserId: "sender-1" };

      prisma.internalMessage.findFirst.mockResolvedValue(message);
      prisma.internalMessage.update.mockResolvedValue({});

      await service.deleteFromMailbox(senderUser, "school-1", "msg-1");

      expect(prisma.internalMessage.update).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { senderArchivedAt: expect.any(Date) },
      });
    });

    it("lance NotFoundException si le message n'existe pas", async () => {
      const user = makeUser();
      prisma.internalMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteFromMailbox(user, "school-1", "msg-missing"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createMessage — pièces jointes multiples ───────────────────────────────

  const makeGetMessageResponse = (overrides: Record<string, unknown> = {}) => ({
    id: "msg-new",
    schoolId: "school-1",
    senderUserId: "user-1",
    status: "DRAFT",
    subject: "Sujet test",
    body: "<p>Bonjour</p>",
    createdAt: new Date(),
    sentAt: null,
    senderArchivedAt: null,
    senderUser: {
      id: "user-1",
      firstName: "Alice",
      lastName: "Martin",
      email: null,
    },
    attachments: [],
    recipients: [],
    ...overrides,
  });

  const makeUploadResult = (url: string, mimeType = "application/pdf") => ({
    url,
    size: 1024,
    width: null,
    height: null,
    mimeType,
  });

  const makeFile = (name: string, mimeType = "application/pdf") => ({
    originalname: name,
    buffer: Buffer.from("content"),
    mimetype: mimeType,
    size: 1024,
  });

  describe("createMessage() — pièces jointes multiples", () => {
    it("uploade chaque pièce jointe et les persiste toutes via createMany", async () => {
      const user = makeUser({ id: "user-1" });
      const files = [
        makeFile("doc1.pdf", "application/pdf"),
        makeFile("doc2.png", "image/png"),
        makeFile(
          "doc3.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      ];

      mediaClient.uploadImage
        .mockResolvedValueOnce(
          makeUploadResult("https://cdn/1.pdf", "application/pdf"),
        )
        .mockResolvedValueOnce(
          makeUploadResult("https://cdn/2.png", "image/png"),
        )
        .mockResolvedValueOnce(
          makeUploadResult(
            "https://cdn/3.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ),
        );

      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse(),
      );

      await service.createMessage(
        user,
        "school-1",
        {
          subject: "Sujet test",
          body: "<p>Bonjour</p>",
          recipientUserIds: [],
          isDraft: true,
        },
        files,
      );

      expect(mediaClient.uploadImage).toHaveBeenCalledTimes(3);

      const createCall = prisma.internalMessage.create.mock.calls[0][0] as {
        data: {
          attachments: {
            createMany: { data: Array<{ fileUrl: string; mimeType: string }> };
          };
        };
      };
      expect(createCall.data.attachments.createMany.data).toHaveLength(3);
      expect(createCall.data.attachments.createMany.data[0].fileUrl).toBe(
        "https://cdn/1.pdf",
      );
      expect(createCall.data.attachments.createMany.data[1].fileUrl).toBe(
        "https://cdn/2.png",
      );
      expect(createCall.data.attachments.createMany.data[2].fileUrl).toBe(
        "https://cdn/3.xlsx",
      );
    });

    it("préserve le nom de fichier original dans la base de données", async () => {
      const user = makeUser({ id: "user-1" });
      const files = [
        makeFile("bulletin-scolaire.pdf"),
        makeFile("photo.jpg", "image/jpeg"),
      ];

      mediaClient.uploadImage
        .mockResolvedValueOnce(makeUploadResult("https://cdn/1.pdf"))
        .mockResolvedValueOnce(
          makeUploadResult("https://cdn/2.jpg", "image/jpeg"),
        );

      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse(),
      );

      await service.createMessage(
        user,
        "school-1",
        {
          subject: "Sujet",
          body: "<p>Bonjour</p>",
          recipientUserIds: [],
          isDraft: true,
        },
        files,
      );

      const createCall = prisma.internalMessage.create.mock.calls[0][0] as {
        data: {
          attachments: { createMany: { data: Array<{ fileName: string }> } };
        };
      };
      expect(createCall.data.attachments.createMany.data[0].fileName).toBe(
        "bulletin-scolaire.pdf",
      );
      expect(createCall.data.attachments.createMany.data[1].fileName).toBe(
        "photo.jpg",
      );
    });

    it("supprime tous les fichiers uploadés si la création DB échoue", async () => {
      const user = makeUser({ id: "user-1" });
      const files = [makeFile("a.pdf"), makeFile("b.pdf"), makeFile("c.pdf")];

      mediaClient.uploadImage
        .mockResolvedValueOnce(makeUploadResult("https://cdn/a.pdf"))
        .mockResolvedValueOnce(makeUploadResult("https://cdn/b.pdf"))
        .mockResolvedValueOnce(makeUploadResult("https://cdn/c.pdf"));

      prisma.internalMessage.create.mockRejectedValue(new Error("DB failure"));

      await expect(
        service.createMessage(
          user,
          "school-1",
          {
            subject: "Sujet",
            body: "<p>Bonjour</p>",
            recipientUserIds: [],
            isDraft: true,
          },
          files,
        ),
      ).rejects.toThrow("DB failure");

      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledWith(
        "https://cdn/a.pdf",
      );
      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledWith(
        "https://cdn/b.pdf",
      );
      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledWith(
        "https://cdn/c.pdf",
      );
      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledTimes(3);
    });

    it("crée le message sans attachments si aucune pièce jointe n'est fournie", async () => {
      const user = makeUser({ id: "user-1" });

      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse(),
      );

      await service.createMessage(
        user,
        "school-1",
        {
          subject: "Sujet",
          body: "<p>Bonjour</p>",
          recipientUserIds: [],
          isDraft: true,
        },
        [],
      );

      expect(mediaClient.uploadImage).not.toHaveBeenCalled();
      const createCall = prisma.internalMessage.create.mock.calls[0][0] as {
        data: { attachments: undefined | { createMany: unknown } };
      };
      expect(createCall.data.attachments).toBeUndefined();
    });

    it("forward de plusieurs pièces jointes existantes sans nouvel upload", async () => {
      const user = makeUser({ id: "user-1" });

      const forwardRows = [
        {
          id: "att-1",
          fileName: "original1.pdf",
          fileUrl: "https://cdn/original1.pdf",
          mimeType: "application/pdf",
          sizeBytes: 500,
          message: {
            senderUserId: "other-user",
            recipients: [{ recipientUserId: "user-1", deletedAt: null }],
          },
        },
        {
          id: "att-2",
          fileName: "original2.png",
          fileUrl: "https://cdn/original2.png",
          mimeType: "image/png",
          sizeBytes: 300,
          message: {
            senderUserId: "other-user",
            recipients: [{ recipientUserId: "user-1", deletedAt: null }],
          },
        },
      ];
      prisma.internalMessageAttachment.findMany.mockResolvedValue(forwardRows);
      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse(),
      );

      await service.createMessage(
        user,
        "school-1",
        {
          subject: "FW: Sujet",
          body: "<p>Bonjour</p>",
          recipientUserIds: [],
          isDraft: true,
          forwardAttachmentIds: ["att-1", "att-2"],
        },
        [],
      );

      expect(mediaClient.uploadImage).not.toHaveBeenCalled();
      const createCall = prisma.internalMessage.create.mock.calls[0][0] as {
        data: {
          attachments: { createMany: { data: Array<{ fileUrl: string }> } };
        };
      };
      expect(createCall.data.attachments.createMany.data).toHaveLength(2);
      expect(createCall.data.attachments.createMany.data[0].fileUrl).toBe(
        "https://cdn/original1.pdf",
      );
      expect(createCall.data.attachments.createMany.data[1].fileUrl).toBe(
        "https://cdn/original2.png",
      );
    });

    it("lance BadRequestException lors du forward si l'utilisateur n'a pas accès à une PJ", async () => {
      const user = makeUser({ id: "user-1" });

      prisma.internalMessageAttachment.findMany.mockResolvedValue([
        {
          id: "att-1",
          fileName: "secret.pdf",
          fileUrl: "https://cdn/secret.pdf",
          mimeType: "application/pdf",
          sizeBytes: 500,
          message: { senderUserId: "other-user", recipients: [] },
        },
      ]);

      await expect(
        service.createMessage(
          user,
          "school-1",
          {
            subject: "FW: Sujet",
            body: "<p>Bonjour</p>",
            recipientUserIds: [],
            isDraft: true,
            forwardAttachmentIds: ["att-1"],
          },
          [],
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mediaClient.uploadImage).not.toHaveBeenCalled();
      expect(prisma.internalMessage.create).not.toHaveBeenCalled();
    });

    it("combine nouvelles PJ uploadées et PJ forwardées dans un seul createMany", async () => {
      const user = makeUser({ id: "user-1" });
      const files = [makeFile("nouveau.pdf")];

      mediaClient.uploadImage.mockResolvedValue(
        makeUploadResult("https://cdn/nouveau.pdf"),
      );

      prisma.internalMessageAttachment.findMany.mockResolvedValue([
        {
          id: "att-fwd",
          fileName: "existant.pdf",
          fileUrl: "https://cdn/existant.pdf",
          mimeType: "application/pdf",
          sizeBytes: 300,
          message: { senderUserId: "user-1", recipients: [] },
        },
      ]);

      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse(),
      );

      await service.createMessage(
        user,
        "school-1",
        {
          subject: "Sujet",
          body: "<p>Bonjour</p>",
          recipientUserIds: [],
          isDraft: true,
          forwardAttachmentIds: ["att-fwd"],
        },
        files,
      );

      const createCall = prisma.internalMessage.create.mock.calls[0][0] as {
        data: {
          attachments: { createMany: { data: Array<{ fileUrl: string }> } };
        };
      };
      expect(createCall.data.attachments.createMany.data).toHaveLength(2);
      const urls = createCall.data.attachments.createMany.data.map(
        (d) => d.fileUrl,
      );
      expect(urls).toContain("https://cdn/nouveau.pdf");
      expect(urls).toContain("https://cdn/existant.pdf");
    });
  });

  // ── updateDraft — pièces jointes ────────────────────────────────────────────

  const makeDraftRow = (overrides: Record<string, unknown> = {}) => ({
    id: "draft-1",
    body: "<p>Bonjour</p>",
    attachments: [],
    ...overrides,
  });

  describe("updateDraft() — pièces jointes", () => {
    it("ne touche pas les attachments si le champ n'est pas fourni", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst
        .mockResolvedValueOnce(
          makeDraftRow({
            attachments: [{ fileUrl: "https://cdn/keep.pdf" }],
          }),
        )
        .mockResolvedValueOnce(makeGetMessageResponse({ status: "DRAFT" }));
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);

      await service.updateDraft(user, "school-1", "draft-1", {
        subject: "Nouveau sujet",
      });

      expect(mediaClient.deleteImageByUrl).not.toHaveBeenCalled();
      const updateCall = prisma.internalMessage.update.mock.calls[0][0] as {
        data: { attachments: unknown };
      };
      expect(updateCall.data.attachments).toBeUndefined();
    });

    it("ajoute des pièces jointes à un brouillon qui n'en avait aucune", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst
        .mockResolvedValueOnce(makeDraftRow({ attachments: [] }))
        .mockResolvedValueOnce(makeGetMessageResponse({ status: "DRAFT" }));
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);

      await service.updateDraft(user, "school-1", "draft-1", {
        attachments: [
          {
            fileName: "nouveau.pdf",
            fileUrl: "https://cdn/nouveau.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1000,
          },
        ],
      });

      expect(mediaClient.deleteImageByUrl).not.toHaveBeenCalled();
      const updateCall = prisma.internalMessage.update.mock.calls[0][0] as {
        data: {
          attachments: {
            deleteMany: object;
            create: Array<{ fileUrl: string; fileName: string }>;
          };
        };
      };
      expect(updateCall.data.attachments.deleteMany).toEqual({});
      expect(updateCall.data.attachments.create).toHaveLength(1);
      expect(updateCall.data.attachments.create[0].fileUrl).toBe(
        "https://cdn/nouveau.pdf",
      );
    });

    it("supprime physiquement les pièces jointes retirées, garde celles listées", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst
        .mockResolvedValueOnce(
          makeDraftRow({
            attachments: [
              { fileUrl: "https://cdn/keep.pdf" },
              { fileUrl: "https://cdn/remove.pdf" },
            ],
          }),
        )
        .mockResolvedValueOnce(makeGetMessageResponse({ status: "DRAFT" }));
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);

      await service.updateDraft(user, "school-1", "draft-1", {
        attachments: [
          {
            fileName: "keep.pdf",
            fileUrl: "https://cdn/keep.pdf",
            mimeType: "application/pdf",
            sizeBytes: 500,
          },
        ],
      });

      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledTimes(1);
      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledWith(
        "https://cdn/remove.pdf",
      );
    });

    it("vide toutes les pièces jointes et nettoie les fichiers média quand attachments=[]", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst
        .mockResolvedValueOnce(
          makeDraftRow({
            attachments: [
              { fileUrl: "https://cdn/a.pdf" },
              { fileUrl: "https://cdn/b.pdf" },
            ],
          }),
        )
        .mockResolvedValueOnce(makeGetMessageResponse({ status: "DRAFT" }));
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);

      await service.updateDraft(user, "school-1", "draft-1", {
        attachments: [],
      });

      expect(mediaClient.deleteImageByUrl).toHaveBeenCalledTimes(2);
      const updateCall = prisma.internalMessage.update.mock.calls[0][0] as {
        data: { attachments: { create: unknown[] } };
      };
      expect(updateCall.data.attachments.create).toHaveLength(0);
    });

    it("continue même si la suppression média échoue (best effort, ne bloque pas la sauvegarde)", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst
        .mockResolvedValueOnce(
          makeDraftRow({
            attachments: [{ fileUrl: "https://cdn/remove.pdf" }],
          }),
        )
        .mockResolvedValueOnce(makeGetMessageResponse({ status: "DRAFT" }));
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      mediaClient.deleteImageByUrl.mockRejectedValue(
        new Error("media service down"),
      );

      await expect(
        service.updateDraft(user, "school-1", "draft-1", { attachments: [] }),
      ).resolves.toBeDefined();

      expect(prisma.internalMessage.update).toHaveBeenCalled();
    });

    it("lance NotFoundException si le brouillon n'existe pas ou n'appartient pas à l'utilisateur", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateDraft(user, "school-1", "draft-missing", {
          attachments: [],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.internalMessage.update).not.toHaveBeenCalled();
    });

    it("lance BadRequestException si aucun champ n'est fourni (subject/body/recipients/attachments)", async () => {
      const user = makeUser({ id: "user-1" });
      prisma.internalMessage.findFirst.mockResolvedValueOnce(makeDraftRow());

      await expect(
        service.updateDraft(user, "school-1", "draft-1", {}),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.internalMessage.update).not.toHaveBeenCalled();
    });
  });

  // ── *AcrossSchools — mailbox agrégée des rôles plateforme ──────────────────

  describe("listMessagesAcrossSchools()", () => {
    it("n'applique aucun filtre schoolId sur la requête inbox", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["SUPER_ADMIN"],
        memberships: [],
      });
      prisma.internalMessageRecipient.count.mockResolvedValue(0);
      prisma.internalMessageRecipient.findMany.mockResolvedValue([]);

      await service.listMessagesAcrossSchools(admin, { folder: "inbox" });

      const whereArg =
        prisma.internalMessageRecipient.findMany.mock.calls[0][0].where;
      expect(whereArg.schoolId).toBeUndefined();
      expect(whereArg.recipientUserId).toBe("admin-1");
    });

    it("agrège les messages reçus de plusieurs écoles distinctes", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["SUPER_ADMIN"],
        memberships: [],
      });
      const rowSchoolA = {
        id: "rec-a",
        readAt: null,
        message: {
          id: "msg-a",
          status: "SENT",
          subject: "De l'école A",
          body: "<p>a</p>",
          createdAt: new Date(),
          sentAt: new Date(),
          senderUser: {
            id: "s-a",
            firstName: "A",
            lastName: "A",
            email: null,
          },
          school: { slug: "ecole-a", name: "École A" },
          attachments: [],
          _count: { recipients: 1 },
        },
      };
      const rowSchoolB = {
        ...rowSchoolA,
        id: "rec-b",
        message: {
          ...rowSchoolA.message,
          id: "msg-b",
          subject: "De l'école B",
          school: { slug: "ecole-b", name: "École B" },
        },
      };
      prisma.internalMessageRecipient.count.mockResolvedValue(2);
      prisma.internalMessageRecipient.findMany.mockResolvedValue([
        rowSchoolA,
        rowSchoolB,
      ]);

      const result = await service.listMessagesAcrossSchools(admin, {
        folder: "inbox",
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((item) => item.subject)).toEqual([
        "De l'école A",
        "De l'école B",
      ]);
    });
  });

  describe("getUnreadCountAcrossSchools()", () => {
    it("compte sans filtre schoolId", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["ADMIN"],
        memberships: [],
      });
      prisma.internalMessageRecipient.count.mockResolvedValue(3);

      const result = await service.getUnreadCountAcrossSchools(admin);

      expect(result).toEqual({ unread: 3 });
      const whereArg = prisma.internalMessageRecipient.count.mock.calls[0][0]
        .where as Record<string, unknown>;
      expect(whereArg.schoolId).toBeUndefined();
      expect(whereArg.recipientUserId).toBe("admin-1");
    });
  });

  describe("getMessageAcrossSchools()", () => {
    it("retourne le message si l'utilisateur est destinataire, quelle que soit l'école", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["ADMIN"],
        memberships: [],
      });
      prisma.internalMessage.findFirst.mockResolvedValue({
        id: "msg-1",
        schoolId: "school-X",
        senderUserId: "other-user",
        status: "SENT",
        subject: "Sujet",
        body: "<p>Bonjour</p>",
        createdAt: new Date(),
        sentAt: new Date(),
        senderArchivedAt: null,
        school: { slug: "ecole-x", name: "École X" },
        senderUser: {
          id: "other-user",
          firstName: "O",
          lastName: "U",
          email: null,
        },
        attachments: [],
        recipients: [
          {
            id: "rec-1",
            recipientUserId: "admin-1",
            readAt: null,
            archivedAt: null,
            deletedAt: null,
            createdAt: new Date(),
            recipientUser: {
              id: "admin-1",
              firstName: "Admin",
              lastName: "Root",
              email: null,
            },
          },
        ],
      });

      const result = await service.getMessageAcrossSchools(admin, "msg-1");

      expect(result.id).toBe("msg-1");
      expect(result.school).toEqual({ slug: "ecole-x", name: "École X" });
    });

    it("lance ForbiddenException si l'utilisateur n'est ni émetteur ni destinataire (pas de fuite inter-école)", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["ADMIN"],
        memberships: [],
      });
      prisma.internalMessage.findFirst.mockResolvedValue({
        id: "msg-1",
        schoolId: "school-X",
        senderUserId: "other-user",
        status: "SENT",
        subject: "Sujet",
        body: "<p>Bonjour</p>",
        createdAt: new Date(),
        sentAt: new Date(),
        senderArchivedAt: null,
        school: { slug: "ecole-x", name: "École X" },
        senderUser: {
          id: "other-user",
          firstName: "O",
          lastName: "U",
          email: null,
        },
        attachments: [],
        recipients: [],
      });

      await expect(
        service.getMessageAcrossSchools(admin, "msg-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lance NotFoundException si le message n'existe pas", async () => {
      const admin = makeUser({
        id: "admin-1",
        platformRoles: ["ADMIN"],
        memberships: [],
      });
      prisma.internalMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.getMessageAcrossSchools(admin, "msg-missing"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("markReadAcrossSchools() / archiveMessageAcrossSchools() / deleteFromMailboxAcrossSchools()", () => {
    const admin = makeUser({
      id: "admin-1",
      platformRoles: ["ADMIN"],
      memberships: [],
    });

    it("markReadAcrossSchools ne filtre pas par schoolId", async () => {
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({
        id: "rec-1",
      });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.markReadAcrossSchools(admin, "msg-1", true);

      const whereArg = prisma.internalMessageRecipient.findFirst.mock
        .calls[0][0].where as Record<string, unknown>;
      expect(whereArg.schoolId).toBeUndefined();
    });

    it("archiveMessageAcrossSchools archive côté destinataire sans schoolId", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue({
        id: "msg-1",
        senderUserId: "someone-else",
      });
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({
        id: "rec-1",
      });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      const result = await service.archiveMessageAcrossSchools(
        admin,
        "msg-1",
        true,
      );

      expect(result).toEqual({ success: true });
    });

    it("deleteFromMailboxAcrossSchools soft-delete côté destinataire", async () => {
      prisma.internalMessage.findFirst.mockResolvedValue({
        id: "msg-1",
        status: "SENT",
        senderUserId: "someone-else",
      });
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({
        id: "rec-1",
      });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      const result = await service.deleteFromMailboxAcrossSchools(
        admin,
        "msg-1",
      );

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("groupRecipientsBySchool()", () => {
    it("regroupe les destinataires par école", async () => {
      prisma.schoolMembership.findMany.mockResolvedValue([
        { userId: "user-a", schoolId: "school-A" },
        { userId: "user-b", schoolId: "school-B" },
      ]);

      const groups = await service.groupRecipientsBySchool(
        ["user-a", "user-b"],
        "fr",
      );

      expect(groups.get("school-A")).toEqual(["user-a"]);
      expect(groups.get("school-B")).toEqual(["user-b"]);
    });

    it("ne fait apparaître un utilisateur multi-écoles que dans un seul groupe (le plus ancien)", async () => {
      prisma.schoolMembership.findMany.mockResolvedValue([
        { userId: "user-a", schoolId: "school-A" },
        { userId: "user-a", schoolId: "school-B" },
      ]);

      const groups = await service.groupRecipientsBySchool(["user-a"], "fr");

      const totalOccurrences = Array.from(groups.values()).flat().length;
      expect(totalOccurrences).toBe(1);
      expect(groups.get("school-A")).toEqual(["user-a"]);
    });

    it("lance BadRequestException si un destinataire n'appartient à aucune école", async () => {
      prisma.schoolMembership.findMany.mockResolvedValue([]);

      await expect(
        service.groupRecipientsBySchool(["ghost-user"], "fr"),
      ).rejects.toThrow(BadRequestException);
    });

    it("lance BadRequestException si la liste de destinataires est vide", async () => {
      await expect(service.groupRecipientsBySchool([], "fr")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("ensureRecipientsInSchool() — via createMessage() — destinataire admin sans membership", () => {
    it("accepte un platform admin comme destinataire même sans SchoolMembership", async () => {
      const user = makeUser({ id: "sender-1" });
      prisma.schoolMembership.findMany.mockResolvedValue([]);
      prisma.platformRoleAssignment.findMany.mockResolvedValue([
        { userId: "admin-1" },
      ]);
      prisma.internalMessage.create.mockResolvedValue({ id: "msg-new" });
      inlineMedia.syncEntityImages.mockResolvedValue(undefined);
      prisma.internalMessage.findFirst.mockResolvedValue(
        makeGetMessageResponse({ senderUserId: "sender-1", recipients: [] }),
      );

      await expect(
        service.createMessage(
          user,
          "school-1",
          {
            subject: "Besoin d'aide",
            body: "<p>Bonjour</p>",
            recipientUserIds: ["admin-1"],
            isDraft: false,
          },
          [],
        ),
      ).resolves.toBeDefined();

      expect(prisma.internalMessage.create).toHaveBeenCalled();
    });

    it("rejette un destinataire qui n'a ni membership ni rôle plateforme", async () => {
      const user = makeUser({ id: "sender-1" });
      prisma.schoolMembership.findMany.mockResolvedValue([]);
      prisma.platformRoleAssignment.findMany.mockResolvedValue([]);

      await expect(
        service.createMessage(
          user,
          "school-1",
          {
            subject: "Sujet",
            body: "<p>Bonjour</p>",
            recipientUserIds: ["ghost-user"],
            isDraft: false,
          },
          [],
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.internalMessage.create).not.toHaveBeenCalled();
    });
  });
});
