import { RoomStatusChangeProjectionService } from "../src/notifications/room-status-change-projection.service";

describe("RoomStatusChangeProjectionService", () => {
  const prisma = {
    school: {
      findUnique: jest.fn(),
    },
    classTimetableSlot: {
      findMany: jest.fn(),
    },
    classTimetableOneOffSlot: {
      findMany: jest.fn(),
    },
    classTimetableSlotException: {
      findMany: jest.fn(),
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
    sendRoomStatusChangeNotification: jest.fn(),
  };

  const pushService = {
    sendRoomStatusChangeNotification: jest.fn(),
  };

  const service = new RoomStatusChangeProjectionService(
    prisma as never,
    feedService as never,
    mailService as never,
    pushService as never,
  );

  const event = {
    schoolId: "school-1",
    roomId: "room-1",
    roomName: "B14",
    previousStatus: "AVAILABLE" as const,
    newStatus: "MAINTENANCE" as const,
    actorUserId: "admin-1",
    actorFullName: "Aline Admin",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([]);
  });

  it("stops quietly when the school no longer exists", async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await service.project(event);

    expect(prisma.classTimetableSlot.findMany).not.toHaveBeenCalled();
    expect(feedService.createSystemClassPost).not.toHaveBeenCalled();
  });

  it("does nothing when the room has no future-affected class", async () => {
    prisma.school.findUnique.mockResolvedValue({
      name: "College Vogt",
      slug: "college-vogt",
    });

    await service.project(event);

    expect(feedService.createSystemClassPost).not.toHaveBeenCalled();
    expect(pushService.sendRoomStatusChangeNotification).not.toHaveBeenCalled();
    expect(mailService.sendRoomStatusChangeNotification).not.toHaveBeenCalled();
  });

  it("only queries future-relevant slots (recurring not-yet-ended, planned one-offs, future overrides)", async () => {
    prisma.school.findUnique.mockResolvedValue({
      name: "College Vogt",
      slug: "college-vogt",
    });

    await service.project(event);

    expect(prisma.classTimetableSlot.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        roomId: "room-1",
        OR: [
          { activeToDate: null },
          { activeToDate: { gte: expect.any(Date) } },
        ],
      },
      select: { classId: true, class: { select: { name: true } } },
    });
    expect(prisma.classTimetableOneOffSlot.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        roomId: "room-1",
        status: "PLANNED",
        occurrenceDate: { gte: expect.any(Date) },
      },
      select: { classId: true, class: { select: { name: true } } },
    });
    expect(prisma.classTimetableSlotException.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        roomId: "room-1",
        type: "OVERRIDE",
        occurrenceDate: { gte: expect.any(Date) },
      },
      select: { classId: true, class: { select: { name: true } } },
    });
  });

  it("notifies students and parents (excluding auto-generated emails) for each future-affected class", async () => {
    prisma.school.findUnique.mockResolvedValue({
      name: "College Vogt",
      slug: "college-vogt",
    });
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      { classId: "class-1", class: { name: "6e C" } },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([
      { classId: "class-2", class: { name: "5e B" } },
    ]);
    prisma.enrollment.findMany.mockImplementation(({ where }) => {
      if (where.classId === "class-1") {
        return Promise.resolve([
          {
            student: {
              user: {
                id: "student-1",
                email: "alice@student.test",
                firstName: "Alice",
                activationStatus: "ACTIVE",
              },
              parentLinks: [
                {
                  parent: {
                    id: "parent-1",
                    email: "parent-655-ab12@noemail.scolive.local",
                    firstName: "Parent",
                    activationStatus: "ACTIVE",
                  },
                },
              ],
            },
          },
        ]);
      }
      return Promise.resolve([
        {
          student: {
            user: {
              id: "student-2",
              email: null,
              firstName: "Bob",
              activationStatus: "ACTIVE",
            },
            parentLinks: [],
          },
        },
      ]);
    });
    prisma.mobilePushToken.findMany.mockResolvedValue([
      { token: "ExponentPushToken[a]" },
    ]);

    await service.project(event);

    expect(feedService.createSystemClassPost).toHaveBeenCalledTimes(2);
    expect(feedService.createSystemClassPost).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: "school-1",
        authorUserId: "admin-1",
        classId: "class-1",
        className: "6e C",
        title: expect.stringContaining("6e C"),
      }),
    );

    expect(pushService.sendRoomStatusChangeNotification).toHaveBeenCalledTimes(
      2,
    );
    expect(pushService.sendRoomStatusChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["ExponentPushToken[a]"],
        data: {
          type: "ROOM_STATUS_CHANGE",
          schoolSlug: "college-vogt",
          classId: "class-1",
          roomId: "room-1",
        },
      }),
    );

    expect(mailService.sendRoomStatusChangeNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@student.test",
        recipientFirstName: "Alice",
        className: "6e C",
        roomName: "B14",
      }),
    );
    expect(
      mailService.sendRoomStatusChangeNotification,
    ).not.toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining("@noemail.scolive.local"),
      }),
    );
  });

  it("deduplicates classes affected by multiple slot kinds", async () => {
    prisma.school.findUnique.mockResolvedValue({
      name: "College Vogt",
      slug: "college-vogt",
    });
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      { classId: "class-1", class: { name: "6e C" } },
    ]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([
      { classId: "class-1", class: { name: "6e C" } },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.mobilePushToken.findMany.mockResolvedValue([]);

    await service.project(event);

    expect(feedService.createSystemClassPost).toHaveBeenCalledTimes(1);
  });
});
