import { Injectable } from "@nestjs/common";
import type { BadgeScope } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  ChildBadgeSummary,
  TeacherClassBadgeSummary,
  UnreadSummaryResponse,
} from "./badges.types.js";

const EPOCH = new Date(0);
const STAFF_PLATFORM_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT"] as const;

type StudentRef = { id: string; firstName: string; lastName: string };

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnreadSummary(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<UnreadSummaryResponse> {
    const [messagesUnread, feedUnread, ticketCounts, children, teacherClasses] =
      await Promise.all([
        this.getMessagesUnread(user, schoolId),
        this.getFeedUnread(user, schoolId),
        this.getTicketCounts(user),
        this.getChildrenBadges(user, schoolId),
        this.getTeacherClassBadges(user, schoolId),
      ]);

    const childrenTotal = children.reduce(
      (sum, child) =>
        sum +
        child.homeworkPending +
        child.notesUnread +
        child.disciplineUnread,
      0,
    );
    const teacherTotal = teacherClasses.reduce(
      (sum, klass) => sum + klass.evaluationsToGrade,
      0,
    );

    const total =
      messagesUnread +
      feedUnread +
      ticketCounts.needingResponse +
      ticketCounts.unreadReplies +
      childrenTotal +
      teacherTotal;

    return {
      messagesUnread,
      feedUnread,
      ticketsNeedingResponse: ticketCounts.needingResponse,
      ticketsUnreadReplies: ticketCounts.unreadReplies,
      children,
      teacherClasses,
      total,
    };
  }

  async markRead(
    user: AuthenticatedUser,
    scope: BadgeScope,
    scopeRefId: string,
  ): Promise<{ ok: true }> {
    await this.prisma.userReadMarker.upsert({
      where: {
        userId_scope_scopeRefId: { userId: user.id, scope, scopeRefId },
      },
      update: { lastReadAt: new Date() },
      create: { userId: user.id, scope, scopeRefId, lastReadAt: new Date() },
    });

    return { ok: true };
  }

  private async getMessagesUnread(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<number> {
    return this.prisma.internalMessageRecipient.count({
      where: {
        schoolId,
        recipientUserId: user.id,
        readAt: null,
        archivedAt: null,
        deletedAt: null,
        message: { status: "SENT" },
      },
    });
  }

  private async getFeedUnread(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<number> {
    const since = await this.getLastReadAt(user.id, "FEED", schoolId);
    return this.prisma.feedPost.count({
      where: { schoolId, createdAt: { gt: since } },
    });
  }

  private async getTicketCounts(
    user: AuthenticatedUser,
  ): Promise<{ needingResponse: number; unreadReplies: number }> {
    const isStaff = user.platformRoles.some((role) =>
      (STAFF_PLATFORM_ROLES as readonly string[]).includes(role),
    );

    const needingResponse = isStaff
      ? await this.prisma.ticket.count({
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        })
      : 0;

    const myTickets = await this.prisma.ticket.findMany({
      where: { authorId: user.id },
      select: { id: true },
    });

    if (myTickets.length === 0) {
      return { needingResponse, unreadReplies: 0 };
    }

    const markers = await this.prisma.userReadMarker.findMany({
      where: {
        userId: user.id,
        scope: "TICKETS",
        scopeRefId: { in: myTickets.map((ticket) => ticket.id) },
      },
    });
    const markerByTicketId = new Map(
      markers.map((marker) => [marker.scopeRefId, marker.lastReadAt]),
    );

    const unreadCounts = await Promise.all(
      myTickets.map((ticket) =>
        this.prisma.ticketResponse.count({
          where: {
            ticketId: ticket.id,
            authorId: { not: user.id },
            createdAt: { gt: markerByTicketId.get(ticket.id) ?? EPOCH },
          },
        }),
      ),
    );

    return {
      needingResponse,
      unreadReplies: unreadCounts.reduce((sum, count) => sum + count, 0),
    };
  }

  private async getChildrenBadges(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<ChildBadgeSummary[]> {
    const students = await this.resolveChildStudents(user, schoolId);
    return Promise.all(
      students.map((student) => this.getChildBadge(user.id, schoolId, student)),
    );
  }

  private async resolveChildStudents(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<StudentRef[]> {
    const parentLinks = await this.prisma.parentStudent.findMany({
      where: { parentUserId: user.id, schoolId },
      select: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (parentLinks.length > 0) {
      return parentLinks.map((link) => link.student);
    }

    const self = await this.prisma.student.findUnique({
      where: { schoolId_userId: { schoolId, userId: user.id } },
      select: { id: true, firstName: true, lastName: true },
    });
    return self ? [self] : [];
  }

  private async getChildBadge(
    userId: string,
    schoolId: string,
    student: StudentRef,
  ): Promise<ChildBadgeSummary> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { schoolId, studentId: student.id, status: "ACTIVE" },
      orderBy: [{ schoolYear: { label: "desc" } }],
      select: { classId: true, schoolYearId: true },
    });

    const [homeworkPending, notesUnread, disciplineUnread] = await Promise.all([
      this.getHomeworkPending(schoolId, student.id, enrollment),
      this.getNotesUnread(userId, student.id),
      this.getDisciplineUnread(userId, schoolId, student.id),
    ]);

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      homeworkPending,
      notesUnread,
      disciplineUnread,
    };
  }

  private async getHomeworkPending(
    schoolId: string,
    studentId: string,
    enrollment: { classId: string; schoolYearId: string } | null,
  ): Promise<number> {
    if (!enrollment) {
      return 0;
    }

    const homeworks = await this.prisma.homework.findMany({
      where: {
        schoolId,
        classId: enrollment.classId,
        schoolYearId: enrollment.schoolYearId,
        expectedAt: { lte: new Date() },
      },
      select: { id: true },
    });
    if (homeworks.length === 0) {
      return 0;
    }

    const completions = await this.prisma.homeworkCompletion.findMany({
      where: {
        studentId,
        homeworkId: { in: homeworks.map((homework) => homework.id) },
      },
      select: { homeworkId: true },
    });
    const doneHomeworkIds = new Set(
      completions.map((completion) => completion.homeworkId),
    );

    return homeworks.filter((homework) => !doneHomeworkIds.has(homework.id))
      .length;
  }

  private async getNotesUnread(
    userId: string,
    studentId: string,
  ): Promise<number> {
    const since = await this.getLastReadAt(userId, "NOTES", studentId);
    return this.prisma.studentEvaluationScore.count({
      where: { studentId, createdAt: { gt: since } },
    });
  }

  private async getDisciplineUnread(
    userId: string,
    schoolId: string,
    studentId: string,
  ): Promise<number> {
    const since = await this.getLastReadAt(userId, "DISCIPLINE", studentId);
    return this.prisma.studentLifeEvent.count({
      where: { schoolId, studentId, createdAt: { gt: since } },
    });
  }

  private async getTeacherClassBadges(
    user: AuthenticatedUser,
    schoolId: string,
  ): Promise<TeacherClassBadgeSummary[]> {
    const assignments = await this.prisma.teacherClassSubject.findMany({
      where: { schoolId, teacherUserId: user.id },
      select: {
        classId: true,
        class: { select: { id: true, name: true } },
      },
      distinct: ["classId"],
    });

    return Promise.all(
      assignments.map(async (assignment) => ({
        classId: assignment.classId,
        className: assignment.class.name,
        evaluationsToGrade: await this.getClassEvaluationsToGrade(
          schoolId,
          user.id,
          assignment.classId,
        ),
      })),
    );
  }

  private async getClassEvaluationsToGrade(
    schoolId: string,
    teacherUserId: string,
    classId: string,
  ): Promise<number> {
    const evaluations = await this.prisma.evaluation.findMany({
      where: {
        schoolId,
        classId,
        authorUserId: teacherUserId,
        status: "PUBLISHED",
      },
      select: {
        schoolYearId: true,
        _count: { select: { scores: true } },
      },
    });
    if (evaluations.length === 0) {
      return 0;
    }

    const rosterCountBySchoolYear = new Map<string, number>();
    let total = 0;

    for (const evaluation of evaluations) {
      let rosterCount = rosterCountBySchoolYear.get(evaluation.schoolYearId);
      if (rosterCount === undefined) {
        rosterCount = await this.prisma.enrollment.count({
          where: {
            schoolId,
            classId,
            schoolYearId: evaluation.schoolYearId,
            status: "ACTIVE",
          },
        });
        rosterCountBySchoolYear.set(evaluation.schoolYearId, rosterCount);
      }

      total += Math.max(0, rosterCount - evaluation._count.scores);
    }

    return total;
  }

  private async getLastReadAt(
    userId: string,
    scope: BadgeScope,
    scopeRefId: string,
  ): Promise<Date> {
    const marker = await this.prisma.userReadMarker.findUnique({
      where: { userId_scope_scopeRefId: { userId, scope, scopeRefId } },
      select: { lastReadAt: true },
    });
    return marker?.lastReadAt ?? EPOCH;
  }
}
