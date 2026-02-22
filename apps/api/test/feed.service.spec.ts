import { ForbiddenException } from "@nestjs/common";
import { FeedService } from "../src/feed/feed.service";

describe("FeedService permissions + media cleanup on PATCH/DELETE", () => {
  const prisma = {
    school: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
    teacherClassSubject: {
      findMany: jest.fn(),
    },
    feedPost: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    feedPostAttachment: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mediaClientService = {
    deleteImageByUrl: jest.fn(),
  };
  const inlineMediaService = {
    syncEntityImages: jest.fn(),
    removeEntityImages: jest.fn(),
  };

  const service = new FeedService(
    prisma as never,
    mediaClientService as never,
    inlineMediaService as never,
  );

  const schoolId = "school-1";
  const managedBase = "https://media.school-live.local";
  const baseUser = {
    id: "viewer-1",
    platformRoles: [] as Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">,
    memberships: [{ schoolId, role: "SCHOOL_STAFF" as const }],
    profileCompleted: true,
    firstName: "Viewer",
    lastName: "User",
  };

  function mockViewerContextLookups() {
    prisma.school.findUnique.mockResolvedValue({ activeSchoolYearId: null });
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg({
          feedPost: {
            update: prisma.feedPost.update,
          },
          feedPostAttachment: {
            deleteMany: prisma.feedPostAttachment.deleteMany,
            createMany: prisma.feedPostAttachment.createMany,
          },
        });
      }
      return Promise.all(arg as Array<Promise<unknown>>);
    });
  }

  function mockPostForPermission(authorUserId: string, authorRoles: string[]) {
    prisma.feedPost.findFirst.mockResolvedValueOnce({
      id: "post-1",
      authorUserId,
      type: "POST",
      authorUser: {
        memberships: authorRoles.map((role) => ({ role })),
      },
    });
  }

  beforeEach(() => {
    prisma.school.findUnique.mockReset();
    prisma.enrollment.findMany.mockReset();
    prisma.teacherClassSubject.findMany.mockReset();
    prisma.feedPost.findFirst.mockReset();
    prisma.feedPost.delete.mockReset();
    prisma.feedPost.update.mockReset();
    prisma.feedPostAttachment.deleteMany.mockReset();
    prisma.feedPostAttachment.createMany.mockReset();
    prisma.$transaction.mockReset();
    mediaClientService.deleteImageByUrl.mockReset();
    inlineMediaService.syncEntityImages.mockReset();
    inlineMediaService.removeEntityImages.mockReset();
    process.env.MEDIA_PUBLIC_BASE_URL = managedBase;
    process.env.MEDIA_SERVICE_URL = "http://media.local";
  });

  afterAll(() => {
    delete process.env.MEDIA_PUBLIC_BASE_URL;
    delete process.env.MEDIA_SERVICE_URL;
  });

  it("allows staff to delete a parent post", async () => {
    mockViewerContextLookups();
    mockPostForPermission("parent-1", ["PARENT"]);
    prisma.feedPost.findFirst.mockResolvedValueOnce({
      id: "post-1",
      bodyHtml: `<p><img src="${managedBase}/messaging/inline-images/old.png" /></p>`,
      attachments: [
        { fileUrl: `${managedBase}/messaging/inline-images/old-file.pdf` },
      ],
    });

    await service.deletePost(baseUser, schoolId, "post-1");

    expect(mediaClientService.deleteImageByUrl).toHaveBeenCalledTimes(2);
    expect(inlineMediaService.removeEntityImages).toHaveBeenCalledWith({
      entityType: "FEED_POST",
      entityId: "post-1",
      deletePhysically: false,
    });
    expect(prisma.feedPost.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
  });

  it("forbids staff deleting another staff post", async () => {
    mockViewerContextLookups();
    mockPostForPermission("staff-2", ["TEACHER"]);

    await expect(
      service.deletePost(baseUser, schoolId, "post-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.feedPost.delete).not.toHaveBeenCalled();
    expect(mediaClientService.deleteImageByUrl).not.toHaveBeenCalled();
    expect(inlineMediaService.removeEntityImages).not.toHaveBeenCalled();
  });

  it("allows SCHOOL_ADMIN to delete a staff post", async () => {
    const schoolAdmin = {
      ...baseUser,
      memberships: [{ schoolId, role: "SCHOOL_ADMIN" as const }],
    };
    mockViewerContextLookups();
    mockPostForPermission("staff-2", ["SCHOOL_STAFF"]);
    prisma.feedPost.findFirst.mockResolvedValueOnce({
      id: "post-1",
      bodyHtml: "<p>sans media</p>",
      attachments: [],
    });

    await service.deletePost(schoolAdmin, schoolId, "post-1");

    expect(prisma.feedPost.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
  });

  it("on update removes old managed media no longer referenced", async () => {
    mockViewerContextLookups();
    mockPostForPermission("parent-1", ["PARENT"]);

    const oldInline = `${managedBase}/messaging/inline-images/old-inline.png`;
    const oldAttachment = `${managedBase}/messaging/inline-images/old-attachment.pdf`;
    const keptInline = `${managedBase}/messaging/inline-images/kept-inline.png`;

    prisma.feedPost.findFirst.mockResolvedValueOnce({
      id: "post-1",
      bodyHtml: `<p><img src="${oldInline}" /><img src="${keptInline}" /></p>`,
      attachments: [
        { fileUrl: oldAttachment },
        { fileUrl: "https://external.example/file.pdf" },
      ],
    });

    prisma.feedPost.update.mockResolvedValue({});
    prisma.feedPostAttachment.deleteMany.mockResolvedValue({});
    prisma.feedPostAttachment.createMany.mockResolvedValue({ count: 1 });

    prisma.feedPost.findFirst.mockResolvedValueOnce({
      id: "post-1",
      type: "POST",
      title: "Titre",
      bodyHtml: `<p><img src="${keptInline}" /></p>`,
      createdAt: new Date(),
      featuredUntil: null,
      audienceScope: "SCHOOL_ALL",
      audienceLabel: "Toute l'ecole",
      audienceLevelId: null,
      audienceClassId: null,
      pollQuestion: null,
      pollOptionsJson: null,
      authorUser: {
        id: "parent-1",
        firstName: "Parent",
        lastName: "One",
        memberships: [{ role: "PARENT" }],
      },
      attachments: [
        {
          id: "att-1",
          fileName: "new.pdf",
          fileUrl: `${managedBase}/messaging/inline-images/new.pdf`,
          sizeLabel: "42 Ko",
        },
      ],
      comments: [],
      likes: [],
      _count: { likes: 0, comments: 0 },
    });

    await service.updatePost(baseUser, schoolId, "post-1", {
      title: "Titre maj",
      bodyHtml: `<p><img src="${keptInline}" /></p>`,
      attachments: [
        {
          fileName: "new.pdf",
          fileUrl: `${managedBase}/messaging/inline-images/new.pdf`,
          sizeLabel: "42 Ko",
        },
      ],
    });

    expect(mediaClientService.deleteImageByUrl).toHaveBeenCalledTimes(2);
    expect(inlineMediaService.syncEntityImages).toHaveBeenCalledWith({
      schoolId,
      uploadedByUserId: "viewer-1",
      scope: "FEED",
      entityType: "FEED_POST",
      entityId: "post-1",
      previousBodyHtml: expect.stringContaining("old-inline.png"),
      nextBodyHtml: expect.stringContaining("kept-inline.png"),
      deleteRemovedPhysically: false,
    });
    expect(mediaClientService.deleteImageByUrl).toHaveBeenCalledWith(oldInline);
    expect(mediaClientService.deleteImageByUrl).toHaveBeenCalledWith(
      oldAttachment,
    );

    expect(prisma.feedPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({
        title: "Titre maj",
      }),
    });
    expect(prisma.feedPostAttachment.deleteMany).toHaveBeenCalledWith({
      where: { postId: "post-1" },
    });
    expect(prisma.feedPostAttachment.createMany).toHaveBeenCalledWith({
      data: [
        {
          postId: "post-1",
          fileName: "new.pdf",
          fileUrl: `${managedBase}/messaging/inline-images/new.pdf`,
          sizeLabel: "42 Ko",
        },
      ],
    });
  });
});
