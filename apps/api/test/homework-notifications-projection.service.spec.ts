import { HomeworkNotificationsProjectionService } from "../src/notifications/homework-notifications-projection.service";

describe("HomeworkNotificationsProjectionService", () => {
  const HOMEWORK = {
    id: "hw-1",
    title: "Exercices de grammaire",
    expectedAt: new Date("2026-05-06T17:00:00.000Z"),
    classId: "class-1",
    schoolYearId: "sy-1",
    subject: { name: "Francais" },
    class: { name: "6e C" },
    authorUser: { firstName: "Albert", lastName: "Mvondo" },
    school: { name: "Lycee Test", slug: "lycee-test" },
  };

  function buildPrisma(overrides?: {
    enrollments?: unknown[];
    pushTokens?: Array<{ token: string }>;
  }) {
    return {
      homework: {
        findUnique: jest.fn().mockResolvedValue(HOMEWORK),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue(overrides?.enrollments ?? []),
      },
      mobilePushToken: {
        findMany: jest.fn().mockResolvedValue(overrides?.pushTokens ?? []),
      },
    };
  }

  function buildServices() {
    const mailService = {
      sendHomeworkCreatedNotification: jest.fn().mockResolvedValue(undefined),
    };
    const pushService = {
      sendHomeworkCreatedNotification: jest.fn().mockResolvedValue(undefined),
    };
    return { mailService, pushService };
  }

  it("does nothing when the homework cannot be found", async () => {
    const prisma = {
      homework: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const { mailService, pushService } = buildServices();
    const service = new HomeworkNotificationsProjectionService(
      prisma as never,
      mailService as never,
      pushService as never,
    );

    await service.project({
      schoolId: "school-1",
      classId: "class-1",
      homeworkId: "hw-1",
    });

    expect(mailService.sendHomeworkCreatedNotification).not.toHaveBeenCalled();
    expect(pushService.sendHomeworkCreatedNotification).not.toHaveBeenCalled();
  });

  it("notifies the active student and active parents with an email by mail, and active push tokens", async () => {
    const prisma = buildPrisma({
      enrollments: [
        {
          student: {
            user: {
              id: "student-user-1",
              email: "eleve@example.test",
              firstName: "Lisa",
              activationStatus: "ACTIVE",
            },
            parentLinks: [
              {
                parent: {
                  id: "parent-1",
                  email: "parent@example.test",
                  firstName: "Robert",
                  activationStatus: "ACTIVE",
                },
              },
              {
                parent: {
                  id: "parent-suspended",
                  email: "suspendu@example.test",
                  firstName: "Suspendu",
                  activationStatus: "SUSPENDED",
                },
              },
            ],
          },
        },
        {
          student: {
            user: {
              id: "student-user-2",
              email: null,
              firstName: "Jean",
              activationStatus: "ACTIVE",
            },
            parentLinks: [],
          },
        },
      ],
      pushTokens: [{ token: "ExponentPushToken[abc]" }],
    });
    const { mailService, pushService } = buildServices();
    const service = new HomeworkNotificationsProjectionService(
      prisma as never,
      mailService as never,
      pushService as never,
    );

    await service.project({
      schoolId: "school-1",
      classId: "class-1",
      homeworkId: "hw-1",
    });

    expect(mailService.sendHomeworkCreatedNotification).toHaveBeenCalledTimes(
      2,
    );
    expect(mailService.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "eleve@example.test" }),
    );
    expect(mailService.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "parent@example.test" }),
    );
    expect(
      mailService.sendHomeworkCreatedNotification,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: "suspendu@example.test" }),
    );

    expect(pushService.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["ExponentPushToken[abc]"],
        data: expect.objectContaining({
          type: "HOMEWORK_CREATED",
          schoolSlug: "lycee-test",
          classId: "class-1",
          homeworkId: "hw-1",
        }),
      }),
    );

    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["student-user-1", "parent-1", "student-user-2"] },
          isActive: true,
        }),
      }),
    );
  });
});
