import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { MessagingService } from "../src/messaging/messaging.service";

describe("MessagingService", () => {
  const prisma = {
    internalMessageRecipient: {
      count: jest.fn(),
    },
    internalMessage: {
      create: jest.fn(),
    },
  };

  const mailService = {
    sendInternalMessageNotification: jest.fn(),
  };

  const service = new MessagingService(prisma as never, mailService as never);

  const baseUser = {
    id: "user-1",
    platformRoles: [] as Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">,
    memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
    profileCompleted: true,
    firstName: "Valery",
    lastName: "MBELE",
  };

  beforeEach(() => {
    prisma.internalMessageRecipient.count.mockReset();
    prisma.internalMessage.create.mockReset();
    mailService.sendInternalMessageNotification.mockReset();
  });

  it("returns unread count for a user in school scope", async () => {
    prisma.internalMessageRecipient.count.mockResolvedValue(7);

    const result = await service.getUnreadCount(baseUser, "school-1");

    expect(result).toEqual({ unread: 7 });
    expect(prisma.internalMessageRecipient.count).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        recipientUserId: "user-1",
        readAt: null,
        archivedAt: null,
        deletedAt: null,
        message: {
          status: "SENT",
        },
      },
    });
  });

  it("blocks access when user has no membership on target school", async () => {
    await expect(
      service.getUnreadCount(baseUser, "school-2"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.internalMessageRecipient.count).not.toHaveBeenCalled();
  });

  it("rejects sending non-draft message without recipients", async () => {
    await expect(
      service.createMessage(baseUser, "school-1", {
        recipientUserIds: [],
        subject: "Sujet",
        body: "<p>Bonjour</p>",
        isDraft: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.internalMessage.create).not.toHaveBeenCalled();
  });

  it("allows admin platform role across schools", async () => {
    prisma.internalMessageRecipient.count.mockResolvedValue(1);

    const adminUser = {
      ...baseUser,
      platformRoles: ["ADMIN" as const],
      memberships: [],
    };

    const result = await service.getUnreadCount(adminUser, "school-42");

    expect(result).toEqual({ unread: 1 });
    expect(prisma.internalMessageRecipient.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: "school-42" }),
      }),
    );
  });
});
