import { TimetableChangeProjectionService } from "../src/notifications/timetable-change-projection.service";

describe("TimetableChangeProjectionService", () => {
  const prisma = {
    school: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
    mobilePushToken: {
      findMany: jest.fn(),
    },
  };

  const feedService = {
    createSystemClassPost: jest.fn(),
  };

  const mailService = {
    sendTimetableChangeNotification: jest.fn(),
  };

  const pushService = {
    sendTimetableChangeNotification: jest.fn(),
  };

  const service = new TimetableChangeProjectionService(
    prisma as never,
    feedService as never,
    mailService as never,
    pushService as never,
  );

  beforeEach(() => {
    prisma.school.findUnique.mockReset();
    prisma.enrollment.findMany.mockReset();
    prisma.mobilePushToken.findMany.mockReset();
    feedService.createSystemClassPost.mockReset();
    mailService.sendTimetableChangeNotification.mockReset();
    pushService.sendTimetableChangeNotification.mockReset();
  });

  it("creates a class feed post, pushes to students, and emails students plus parents", async () => {
    prisma.school.findUnique.mockResolvedValue({
      name: "College Vogt",
      slug: "college-vogt",
    });
    prisma.enrollment.findMany.mockResolvedValue([
      {
        student: {
          firstName: "Alice",
          lastName: "Mone",
          user: {
            id: "student-user-1",
            email: "alice@student.test",
            firstName: "Alice",
            activationStatus: "ACTIVE",
          },
          parentLinks: [
            {
              parent: {
                id: "parent-1",
                email: "family@example.test",
                firstName: "Parent",
                activationStatus: "ACTIVE",
              },
            },
            {
              parent: {
                id: "parent-2",
                email: "family@example.test",
                firstName: "Parent 2",
                activationStatus: "ACTIVE",
              },
            },
          ],
        },
      },
      {
        student: {
          firstName: "Bob",
          lastName: "Nsa",
          user: {
            id: "student-user-2",
            email: null,
            firstName: "Bob",
            activationStatus: "ACTIVE",
          },
          parentLinks: [],
        },
      },
      {
        student: {
          firstName: "Carol",
          lastName: "Off",
          user: {
            id: "student-user-3",
            email: "disabled@student.test",
            firstName: "Carol",
            activationStatus: "INVITED",
          },
          parentLinks: [],
        },
      },
    ]);
    prisma.mobilePushToken.findMany.mockResolvedValue([
      { token: "ExponentPushToken[student-1]" },
      { token: "ExponentPushToken[student-2]" },
    ]);

    await service.project({
      schoolId: "school-1",
      classId: "class-1",
      className: "6e C",
      actorUserId: "teacher-1",
      actorFullName: "Albert M",
      kind: "OCCURRENCE_CANCELLED",
      before: {
        date: "2026-04-29",
        startMinute: 480,
        endMinute: 540,
        subjectId: "subject-1",
        subjectName: "Mathematiques",
        teacherUserId: "teacher-1",
        teacherName: "Albert M",
        room: "B12",
        status: "PLANNED",
        sourceKind: "OCCURRENCE",
      },
      reason: "Absence enseignant",
    });

    expect(feedService.createSystemClassPost).toHaveBeenCalledWith({
      schoolId: "school-1",
      authorUserId: "teacher-1",
      classId: "class-1",
      className: "6e C",
      title: expect.stringContaining("6e C"),
      bodyHtml: expect.stringContaining("Absence enseignant"),
    });

    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: { in: ["student-user-1", "student-user-2"] },
        isActive: true,
        OR: [{ schoolId: "school-1" }, { schoolId: null }],
      },
      select: { token: true },
      distinct: ["token"],
    });
    expect(pushService.sendTimetableChangeNotification).toHaveBeenCalledWith({
      tokens: ["ExponentPushToken[student-1]", "ExponentPushToken[student-2]"],
      title: "Séance annulée · 6e C",
      body: expect.stringContaining("annulée"),
      data: {
        type: "TIMETABLE_CHANGE",
        schoolSlug: "college-vogt",
        classId: "class-1",
      },
    });

    expect(mailService.sendTimetableChangeNotification).toHaveBeenCalledTimes(
      2,
    );
    expect(mailService.sendTimetableChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@student.test",
        recipientFirstName: "Alice",
        schoolName: "College Vogt",
        schoolSlug: "college-vogt",
        className: "6e C",
      }),
    );
    expect(mailService.sendTimetableChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "family@example.test",
        recipientFirstName: "Parent 2",
      }),
    );
  });

  it("stops quietly when the school no longer exists", async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await service.project({
      schoolId: "missing-school",
      classId: "class-1",
      className: "6e C",
      actorUserId: "teacher-1",
      actorFullName: "Albert M",
      kind: "ONE_OFF_CREATED",
      after: {
        date: "2026-04-29",
        startMinute: 480,
        endMinute: 540,
        subjectId: "subject-1",
        subjectName: "Mathematiques",
        teacherUserId: "teacher-1",
        teacherName: "Albert M",
        room: "B12",
        status: "PLANNED",
        sourceKind: "ONE_OFF",
      },
    });

    expect(feedService.createSystemClassPost).not.toHaveBeenCalled();
    expect(pushService.sendTimetableChangeNotification).not.toHaveBeenCalled();
    expect(mailService.sendTimetableChangeNotification).not.toHaveBeenCalled();
  });
});
