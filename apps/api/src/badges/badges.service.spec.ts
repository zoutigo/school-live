import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { BadgesService } from "./badges.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  internalMessageRecipient: { count: jest.fn() },
  feedPost: { count: jest.fn() },
  ticket: { count: jest.fn(), findMany: jest.fn() },
  ticketResponse: { count: jest.fn() },
  userReadMarker: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  parentStudent: { findMany: jest.fn() },
  student: { findUnique: jest.fn() },
  enrollment: { findFirst: jest.fn(), count: jest.fn() },
  homework: { findMany: jest.fn() },
  homeworkCompletion: { findMany: jest.fn() },
  studentEvaluationScore: { count: jest.fn() },
  studentLifeEvent: { count: jest.fn() },
  teacherClassSubject: { findMany: jest.fn() },
  evaluation: { findMany: jest.fn() },
});

describe("BadgesService", () => {
  let service: BadgesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    // Defaults so getUnreadSummary doesn't throw when a path isn't under test.
    prisma.internalMessageRecipient.count.mockResolvedValue(0);
    prisma.feedPost.count.mockResolvedValue(0);
    prisma.ticket.count.mockResolvedValue(0);
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.userReadMarker.findMany.mockResolvedValue([]);
    prisma.userReadMarker.findUnique.mockResolvedValue(null);
    prisma.parentStudent.findMany.mockResolvedValue([]);
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    prisma.enrollment.findFirst.mockResolvedValue(null);
    prisma.homework.findMany.mockResolvedValue([]);
    prisma.homeworkCompletion.findMany.mockResolvedValue([]);
    prisma.studentEvaluationScore.count.mockResolvedValue(0);
    prisma.studentLifeEvent.count.mockResolvedValue(0);

    const module = await Test.createTestingModule({
      providers: [BadgesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(BadgesService);
  });

  describe("getUnreadSummary", () => {
    it("sums messages, feed, tickets, children and teacher classes into total", async () => {
      prisma.internalMessageRecipient.count.mockResolvedValue(3);
      prisma.feedPost.count.mockResolvedValue(2);
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.findMany.mockResolvedValue([]);

      prisma.parentStudent.findMany.mockResolvedValue([
        {
          student: { id: "student-1", firstName: "Léo", lastName: "Martin" },
        },
      ]);
      prisma.enrollment.findFirst.mockResolvedValue({
        classId: "class-1",
        schoolYearId: "year-1",
      });
      prisma.homework.findMany.mockResolvedValue([
        { id: "hw-1" },
        { id: "hw-2" },
      ]);
      prisma.homeworkCompletion.findMany.mockResolvedValue([
        { homeworkId: "hw-1" },
      ]);
      prisma.studentEvaluationScore.count.mockResolvedValue(4);
      prisma.studentLifeEvent.count.mockResolvedValue(1);

      const user = makeUser();
      const result = await service.getUnreadSummary(user, "school-1");

      expect(result.messagesUnread).toBe(3);
      expect(result.feedUnread).toBe(2);
      expect(result.ticketsNeedingResponse).toBe(0);
      expect(result.ticketsUnreadReplies).toBe(0);
      expect(result.children).toEqual([
        {
          studentId: "student-1",
          firstName: "Léo",
          lastName: "Martin",
          homeworkPending: 1,
          notesUnread: 4,
          disciplineUnread: 1,
        },
      ]);
      expect(result.teacherClasses).toEqual([]);
      // 3 + 2 + 0 + 0 + (1 + 4 + 1) + 0
      expect(result.total).toBe(11);
    });

    it("returns zeroed summary when the user has no children, tickets or classes", async () => {
      const user = makeUser({ platformRoles: [] });
      const result = await service.getUnreadSummary(user, "school-1");

      expect(result).toEqual({
        messagesUnread: 0,
        feedUnread: 0,
        ticketsNeedingResponse: 0,
        ticketsUnreadReplies: 0,
        children: [],
        teacherClasses: [],
        total: 0,
      });
    });
  });

  describe("messages unread", () => {
    it("counts unread, non-archived, non-deleted recipient rows for sent messages", async () => {
      const user = makeUser();
      await service.getUnreadSummary(user, "school-1");

      expect(prisma.internalMessageRecipient.count).toHaveBeenCalledWith({
        where: {
          schoolId: "school-1",
          recipientUserId: "user-1",
          readAt: null,
          archivedAt: null,
          deletedAt: null,
          message: { status: "SENT" },
        },
      });
    });
  });

  describe("feed unread", () => {
    it("counts posts created after the user's feed read marker", async () => {
      const since = new Date("2026-01-01T00:00:00Z");
      prisma.userReadMarker.findUnique.mockResolvedValueOnce({
        lastReadAt: since,
      });

      const user = makeUser();
      await service.getUnreadSummary(user, "school-1");

      expect(prisma.feedPost.count).toHaveBeenCalledWith({
        where: { schoolId: "school-1", createdAt: { gt: since } },
      });
    });

    it("falls back to epoch when there is no marker yet", async () => {
      prisma.userReadMarker.findUnique.mockResolvedValueOnce(null);

      const user = makeUser();
      await service.getUnreadSummary(user, "school-1");

      expect(prisma.feedPost.count).toHaveBeenCalledWith({
        where: { schoolId: "school-1", createdAt: { gt: new Date(0) } },
      });
    });
  });

  describe("ticket counts", () => {
    it("only computes needingResponse for staff platform roles", async () => {
      prisma.ticket.count.mockResolvedValue(7);

      const staffUser = makeUser({ platformRoles: ["SUPPORT"] });
      const staffResult = await service.getUnreadSummary(staffUser, "school-1");
      expect(staffResult.ticketsNeedingResponse).toBe(7);

      const regularUser = makeUser({ platformRoles: [] });
      const regularResult = await service.getUnreadSummary(
        regularUser,
        "school-1",
      );
      expect(regularResult.ticketsNeedingResponse).toBe(0);
    });

    it("sums unread replies across the author's own tickets using per-ticket markers", async () => {
      prisma.ticket.findMany.mockResolvedValue([
        { id: "ticket-1" },
        { id: "ticket-2" },
      ]);
      const since = new Date("2026-02-01T00:00:00Z");
      prisma.userReadMarker.findMany.mockResolvedValue([
        { scopeRefId: "ticket-1", lastReadAt: since },
      ]);
      prisma.ticketResponse.count
        .mockResolvedValueOnce(2) // ticket-1, since marker
        .mockResolvedValueOnce(5); // ticket-2, no marker -> epoch

      const user = makeUser();
      const result = await service.getUnreadSummary(user, "school-1");

      expect(prisma.ticketResponse.count).toHaveBeenNthCalledWith(1, {
        where: {
          ticketId: "ticket-1",
          authorId: { not: "user-1" },
          createdAt: { gt: since },
        },
      });
      expect(prisma.ticketResponse.count).toHaveBeenNthCalledWith(2, {
        where: {
          ticketId: "ticket-2",
          authorId: { not: "user-1" },
          createdAt: { gt: new Date(0) },
        },
      });
      expect(result.ticketsUnreadReplies).toBe(7);
    });
  });

  describe("resolveChildStudents", () => {
    it("falls back to the user's own student profile when no parent links exist", async () => {
      prisma.parentStudent.findMany.mockResolvedValue([]);
      prisma.student.findUnique.mockResolvedValue({
        id: "student-self",
        firstName: "Sam",
        lastName: "Dupont",
      });
      prisma.enrollment.findFirst.mockResolvedValue(null);

      const user = makeUser({
        memberships: [{ schoolId: "school-1", role: "STUDENT" }],
      });
      const result = await service.getUnreadSummary(user, "school-1");

      expect(prisma.student.findUnique).toHaveBeenCalledWith({
        where: { schoolId_userId: { schoolId: "school-1", userId: "user-1" } },
        select: { id: true, firstName: true, lastName: true },
      });
      expect(result.children).toEqual([
        {
          studentId: "student-self",
          firstName: "Sam",
          lastName: "Dupont",
          homeworkPending: 0,
          notesUnread: 0,
          disciplineUnread: 0,
        },
      ]);
    });
  });

  describe("homework pending", () => {
    it("returns 0 when the student has no active enrollment", async () => {
      prisma.parentStudent.findMany.mockResolvedValue([
        { student: { id: "student-1", firstName: "Léo", lastName: "Martin" } },
      ]);
      prisma.enrollment.findFirst.mockResolvedValue(null);

      const user = makeUser();
      const result = await service.getUnreadSummary(user, "school-1");

      expect(prisma.homework.findMany).not.toHaveBeenCalled();
      expect(result.children[0].homeworkPending).toBe(0);
    });
  });

  describe("teacher class evaluations to grade", () => {
    it("sums roster minus existing score rows across evaluations, caching roster per school year", async () => {
      const user = makeUser({
        memberships: [{ schoolId: "school-1", role: "TEACHER" }],
      });
      prisma.teacherClassSubject.findMany.mockResolvedValue([
        { classId: "class-1", class: { id: "class-1", name: "6e A" } },
      ]);
      prisma.evaluation.findMany.mockResolvedValue([
        { schoolYearId: "year-1", _count: { scores: 18 } },
        { schoolYearId: "year-1", _count: { scores: 20 } },
      ]);
      prisma.enrollment.count.mockResolvedValue(20);

      const result = await service.getUnreadSummary(user, "school-1");

      expect(prisma.enrollment.count).toHaveBeenCalledTimes(1);
      expect(result.teacherClasses).toEqual([
        { classId: "class-1", className: "6e A", evaluationsToGrade: 2 },
      ]);
      expect(result.total).toBe(2);
    });
  });

  describe("markRead", () => {
    it("upserts a read marker scoped to the user, scope and ref id", async () => {
      const user = makeUser();
      await service.markRead(user, "DISCIPLINE", "student-1");

      expect(prisma.userReadMarker.upsert).toHaveBeenCalledWith({
        where: {
          userId_scope_scopeRefId: {
            userId: "user-1",
            scope: "DISCIPLINE",
            scopeRefId: "student-1",
          },
        },
        update: { lastReadAt: expect.any(Date) },
        create: {
          userId: "user-1",
          scope: "DISCIPLINE",
          scopeRefId: "student-1",
          lastReadAt: expect.any(Date),
        },
      });
    });
  });
});
