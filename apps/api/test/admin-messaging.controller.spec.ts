import { AdminMessagingController } from "../src/messaging/admin-messaging.controller";

describe("AdminMessagingController", () => {
  const messagingService = {
    listMessagesAcrossSchools: jest.fn(),
    getUnreadCountAcrossSchools: jest.fn(),
    getMessageAcrossSchools: jest.fn(),
    groupRecipientsBySchool: jest.fn(),
    createMessage: jest.fn(),
    updateDraftAcrossSchools: jest.fn(),
    sendDraftAcrossSchools: jest.fn(),
    markReadAcrossSchools: jest.fn(),
    archiveMessageAcrossSchools: jest.fn(),
    deleteFromMailboxAcrossSchools: jest.fn(),
  };

  const mediaClientService = {
    uploadImage: jest.fn(),
  };
  const inlineMediaService = {
    registerTempUpload: jest.fn(),
  };

  const controller = new AdminMessagingController(
    messagingService as never,
    mediaClientService as never,
    inlineMediaService as never,
  );

  const admin = {
    id: "admin-1",
    platformRoles: ["SUPER_ADMIN" as const],
    memberships: [],
    profileCompleted: true,
    firstName: "Root",
    lastName: "Admin",
  };

  beforeEach(() => {
    Object.values(messagingService).forEach((fn) => fn.mockReset());
    mediaClientService.uploadImage.mockReset();
    inlineMediaService.registerTempUpload.mockReset();
  });

  it("delegates list to the aggregated service method", async () => {
    messagingService.listMessagesAcrossSchools.mockResolvedValue({
      items: [],
      meta: {},
    });

    const query = { folder: "inbox" as const };
    await controller.list(admin, query);

    expect(messagingService.listMessagesAcrossSchools).toHaveBeenCalledWith(
      admin,
      query,
    );
  });

  it("delegates unread-count to the aggregated service method", async () => {
    messagingService.getUnreadCountAcrossSchools.mockResolvedValue({
      unread: 4,
    });

    const result = await controller.unreadCount(admin);

    expect(messagingService.getUnreadCountAcrossSchools).toHaveBeenCalledWith(
      admin,
    );
    expect(result).toEqual({ unread: 4 });
  });

  it("delegates message details to the aggregated service method", async () => {
    await controller.details(admin, "msg-1");

    expect(messagingService.getMessageAcrossSchools).toHaveBeenCalledWith(
      admin,
      "msg-1",
    );
  });

  it("uploads inline image without registering a temp upload (no school known yet)", async () => {
    const file = { buffer: Buffer.from("img"), mimetype: "image/png", size: 1 };
    mediaClientService.uploadImage.mockResolvedValue({
      url: "https://cdn.example.com/img.png",
    });

    const result = await controller.uploadInlineImage(file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "messaging-inline-image",
      file,
    );
    expect(result).toEqual({ url: "https://cdn.example.com/img.png" });
    expect(inlineMediaService.registerTempUpload).not.toHaveBeenCalled();
  });

  it("uploads an attachment through the media client", async () => {
    const file = {
      buffer: Buffer.from("doc"),
      mimetype: "application/pdf",
      size: 2,
    };
    await controller.uploadAttachment(file);

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "messaging-attachment",
      file,
    );
  });

  it("creates a single message when every recipient belongs to one school", async () => {
    messagingService.groupRecipientsBySchool.mockResolvedValue(
      new Map([["school-A", ["user-1"]]]),
    );
    messagingService.createMessage.mockResolvedValue({ id: "msg-1" });

    const payload = {
      subject: "Sujet",
      body: "<p>Bonjour</p>",
      recipientUserIds: ["user-1"],
      isDraft: true,
    };

    const result = await controller.create(admin, payload, []);

    expect(messagingService.groupRecipientsBySchool).toHaveBeenCalledWith(
      ["user-1"],
      "fr",
    );
    expect(messagingService.createMessage).toHaveBeenCalledTimes(1);
    expect(messagingService.createMessage).toHaveBeenCalledWith(
      admin,
      "school-A",
      expect.objectContaining({ subject: "Sujet", isDraft: true }),
      [],
    );
    expect(result).toEqual({ id: "msg-1" });
  });

  it("broadcasts to every school involved when recipients span several schools", async () => {
    messagingService.groupRecipientsBySchool.mockResolvedValue(
      new Map([
        ["school-A", ["admin-a"]],
        ["school-B", ["admin-b"]],
      ]),
    );
    messagingService.createMessage
      .mockResolvedValueOnce({ id: "msg-a" })
      .mockResolvedValueOnce({ id: "msg-b" });

    const payload = {
      subject: "À tous les school admins",
      body: "<p>Bonjour</p>",
      recipientUserIds: ["admin-a", "admin-b"],
      isDraft: true,
    };

    const result = await controller.create(admin, payload, []);

    expect(messagingService.createMessage).toHaveBeenCalledTimes(2);
    expect(messagingService.createMessage).toHaveBeenCalledWith(
      admin,
      "school-A",
      expect.objectContaining({
        recipientUserIds: ["admin-a"],
        isDraft: false,
      }),
      [],
    );
    expect(messagingService.createMessage).toHaveBeenCalledWith(
      admin,
      "school-B",
      expect.objectContaining({
        recipientUserIds: ["admin-b"],
        isDraft: false,
      }),
      [],
    );
    expect(result).toEqual({
      broadcast: true,
      schools: 2,
      messages: [{ id: "msg-a" }, { id: "msg-b" }],
    });
  });

  it("delegates draft/send/read/archive/delete to the aggregated service methods", async () => {
    const draftPayload = { subject: "Draft" };
    await controller.updateDraft(admin, "msg-1", draftPayload);
    expect(messagingService.updateDraftAcrossSchools).toHaveBeenCalledWith(
      admin,
      "msg-1",
      draftPayload,
    );

    await controller.sendDraft(admin, "msg-1");
    expect(messagingService.sendDraftAcrossSchools).toHaveBeenCalledWith(
      admin,
      "msg-1",
    );

    await controller.markRead(admin, "msg-1", { read: true });
    expect(messagingService.markReadAcrossSchools).toHaveBeenCalledWith(
      admin,
      "msg-1",
      true,
    );

    await controller.archive(admin, "msg-1", { archived: true });
    expect(messagingService.archiveMessageAcrossSchools).toHaveBeenCalledWith(
      admin,
      "msg-1",
      true,
    );

    await controller.remove(admin, "msg-1");
    expect(
      messagingService.deleteFromMailboxAcrossSchools,
    ).toHaveBeenCalledWith(admin, "msg-1");
  });
});
