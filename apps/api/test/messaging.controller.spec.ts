import { BadRequestException } from "@nestjs/common";
import { MessagingController } from "../src/messaging/messaging.controller";

describe("MessagingController", () => {
  const messagingService = {
    listMessages: jest.fn(),
    getUnreadCount: jest.fn(),
    getMessage: jest.fn(),
    createMessage: jest.fn(),
    updateDraft: jest.fn(),
    sendDraft: jest.fn(),
    markRead: jest.fn(),
    archiveMessage: jest.fn(),
    deleteFromMailbox: jest.fn(),
  };

  const mediaClientService = {
    uploadImage: jest.fn(),
  };

  const controller = new MessagingController(
    messagingService as never,
    mediaClientService as never,
  );

  const user = {
    id: "u-1",
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
    profileCompleted: true,
    firstName: "Valery",
    lastName: "MBELE",
  };

  beforeEach(() => {
    Object.values(messagingService).forEach((fn) => fn.mockReset());
    mediaClientService.uploadImage.mockReset();
  });

  it("delegates list to messaging service", async () => {
    messagingService.listMessages.mockResolvedValue({ items: [], meta: {} });

    const query = { folder: "inbox" as const, page: 1, limit: 20, q: "test" };
    await controller.list(user, "school-1", query);

    expect(messagingService.listMessages).toHaveBeenCalledWith(
      user,
      "school-1",
      query,
    );
  });

  it("throws when inline image file is missing", () => {
    expect(() => controller.uploadInlineImage(undefined)).toThrow(
      BadRequestException,
    );
  });

  it("uploads inline image through media client", async () => {
    const file = {
      buffer: Buffer.from("img"),
      mimetype: "image/png",
      size: 123,
    };
    mediaClientService.uploadImage.mockResolvedValue({
      key: "messaging/inline/1.png",
      url: "https://cdn.example.com/messaging/inline/1.png",
    });

    await controller.uploadInlineImage(file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "messaging-inline-image",
      file,
    );
  });

  it("delegates write actions to messaging service", async () => {
    const createPayload = {
      recipientUserIds: ["u-2"],
      subject: "Sujet",
      body: "<p>Bonjour</p>",
      isDraft: false,
    };
    await controller.create(user, "school-1", createPayload);
    expect(messagingService.createMessage).toHaveBeenCalledWith(
      user,
      "school-1",
      createPayload,
    );

    const draftPayload = {
      recipientUserIds: ["u-2"],
      subject: "Draft",
      body: "<p>Brouillon</p>",
    };
    await controller.updateDraft(user, "school-1", "msg-1", draftPayload);
    expect(messagingService.updateDraft).toHaveBeenCalledWith(
      user,
      "school-1",
      "msg-1",
      draftPayload,
    );

    await controller.sendDraft(user, "school-1", "msg-1");
    expect(messagingService.sendDraft).toHaveBeenCalledWith(
      user,
      "school-1",
      "msg-1",
    );

    await controller.markRead(user, "school-1", "msg-1", { read: true });
    expect(messagingService.markRead).toHaveBeenCalledWith(
      user,
      "school-1",
      "msg-1",
      true,
    );

    await controller.archive(user, "school-1", "msg-1", { archived: true });
    expect(messagingService.archiveMessage).toHaveBeenCalledWith(
      user,
      "school-1",
      "msg-1",
      true,
    );

    await controller.remove(user, "school-1", "msg-1");
    expect(messagingService.deleteFromMailbox).toHaveBeenCalledWith(
      user,
      "school-1",
      "msg-1",
    );
  });
});
