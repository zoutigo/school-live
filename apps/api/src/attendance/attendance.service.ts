import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import {
  attendanceLocaleFromUser,
  translateAttendanceError,
} from "./attendance.translations.js";
import type { GetClassAttendanceQueryDto } from "./dto/get-class-attendance-query.dto.js";
import type { SaveClassAttendanceDto } from "./dto/save-class-attendance.dto.js";

const ROLL_CALL_REASON_PREFIX = "Appel du";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoster(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    query: GetClassAttendanceQueryDto,
  ) {
    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    const occurredAt = this.dayStart(query.date);

    const [enrollments, absenceEvents] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          schoolId,
          classId,
          schoolYearId: classEntity.schoolYearId,
          status: "ACTIVE",
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
        select: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.studentLifeEvent.findMany({
        where: {
          schoolId,
          classId,
          type: "ABSENCE",
          occurredAt,
          reason: { startsWith: ROLL_CALL_REASON_PREFIX },
        },
        select: { studentId: true },
      }),
    ]);

    const absentStudentIds = new Set(
      absenceEvents.map((event) => event.studentId),
    );

    return {
      classId,
      className: classEntity.name,
      date: query.date,
      students: enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        present: !absentStudentIds.has(enrollment.student.id),
      })),
    };
  }

  async saveRollCall(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    payload: SaveClassAttendanceDto,
  ) {
    const locale = attendanceLocaleFromUser(user);
    const classEntity = await this.ensureClassAccessible(
      user,
      schoolId,
      classId,
    );
    const occurredAt = this.dayStart(payload.date);

    const enrolledStudentIds = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: {
            schoolId,
            classId,
            schoolYearId: classEntity.schoolYearId,
            status: "ACTIVE",
          },
          select: { studentId: true },
        })
      ).map((enrollment) => enrollment.studentId),
    );

    const requestedAbsentIds = Array.from(new Set(payload.absentStudentIds));
    const invalidIds = requestedAbsentIds.filter(
      (studentId) => !enrolledStudentIds.has(studentId),
    );
    if (invalidIds.length > 0) {
      throw new ForbiddenException(
        translateAttendanceError(
          locale,
          "attendance.errors.studentsNotEnrolled",
        ),
      );
    }

    const existingEvents = await this.prisma.studentLifeEvent.findMany({
      where: {
        schoolId,
        classId,
        type: "ABSENCE",
        occurredAt,
        reason: { startsWith: ROLL_CALL_REASON_PREFIX },
      },
      select: { id: true, studentId: true },
    });

    const requestedAbsentSet = new Set(requestedAbsentIds);
    const existingByStudentId = new Map(
      existingEvents.map((event) => [event.studentId, event.id]),
    );

    const eventIdsToDelete = existingEvents
      .filter((event) => !requestedAbsentSet.has(event.studentId))
      .map((event) => event.id);

    const studentIdsToCreate = requestedAbsentIds.filter(
      (studentId) => !existingByStudentId.has(studentId),
    );

    const reason = `${ROLL_CALL_REASON_PREFIX} ${payload.date}`;

    await this.prisma.$transaction([
      ...(eventIdsToDelete.length > 0
        ? [
            this.prisma.studentLifeEvent.deleteMany({
              where: { id: { in: eventIdsToDelete } },
            }),
          ]
        : []),
      ...(studentIdsToCreate.length > 0
        ? [
            this.prisma.studentLifeEvent.createMany({
              data: studentIdsToCreate.map((studentId) => ({
                schoolId,
                studentId,
                classId,
                schoolYearId: classEntity.schoolYearId,
                authorUserId: user.id,
                type: "ABSENCE" as const,
                occurredAt,
                justified: false,
                reason,
              })),
            }),
          ]
        : []),
    ]);

    return this.getRoster(user, schoolId, classId, { date: payload.date });
  }

  private dayStart(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private async ensureClassAccessible(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const locale = attendanceLocaleFromUser(user);
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        name: true,
        schoolYearId: true,
        referentTeacherUserId: true,
      },
    });
    if (!classEntity) {
      throw new NotFoundException(
        translateAttendanceError(locale, "attendance.errors.classNotFound"),
      );
    }

    if (
      this.hasAnySchoolRole(user, schoolId, [
        "SCHOOL_ADMIN",
        "SCHOOL_MANAGER",
        "SUPERVISOR",
      ]) ||
      this.hasPlatformRole(user, "SUPER_ADMIN")
    ) {
      return classEntity;
    }

    if (this.hasAnySchoolRole(user, schoolId, ["TEACHER"])) {
      if (classEntity.referentTeacherUserId === user.id) {
        return classEntity;
      }

      const assignment = await this.prisma.teacherClassSubject.findFirst({
        where: {
          schoolId,
          schoolYearId: classEntity.schoolYearId,
          classId,
          teacherUserId: user.id,
        },
        select: { id: true },
      });
      if (assignment) {
        return classEntity;
      }
    }

    throw new ForbiddenException(
      translateAttendanceError(locale, "attendance.errors.classNotAccessible"),
    );
  }

  private hasAnySchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    roles: string[],
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId && roles.includes(membership.role),
    );
  }

  private hasPlatformRole(user: AuthenticatedUser, role: string) {
    return user.platformRoles.includes(role as never);
  }
}
