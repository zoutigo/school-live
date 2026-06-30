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

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
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

const makePrismaMock = () => ({
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
  $transaction: jest.fn((arr: Promise<unknown>[]) => Promise.all(arr)),
});

// ── Setup ─────────────────────────────────────────────────────────────────────

describe("MessagingService", () => {
  let service: MessagingService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: { sendInternalMessageNotification: jest.fn() } },
        { provide: MediaClientService, useValue: { uploadImage: jest.fn(), deleteImageByUrl: jest.fn() } },
        { provide: InlineMediaService, useValue: { syncEntityImages: jest.fn(), removeEntityImages: jest.fn() } },
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
        prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
        prisma.internalMessageRecipient.update.mockResolvedValue({});

        const result = await service.archiveMessage(user, "school-1", "msg-1", false);

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
        prisma.internalMessageRecipient.findFirst.mockResolvedValue(recipientRow);
        prisma.internalMessageRecipient.update.mockResolvedValue({});

        const result = await service.archiveMessage(user, "school-1", "msg-1", true);

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
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({ id: "rec-1" });
      prisma.internalMessageRecipient.update.mockResolvedValue({});

      await service.markRead(user, "school-1", "msg-1", true);

      expect(prisma.internalMessageRecipient.update).toHaveBeenCalledWith({
        where: { id: "rec-1" },
        data: { readAt: expect.any(Date) },
      });
    });

    it("marque le message comme non lu (readAt=null)", async () => {
      const user = makeUser();
      prisma.internalMessageRecipient.findFirst.mockResolvedValue({ id: "rec-1" });
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
});
