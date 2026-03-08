import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuthenticatedUser, SchoolRole } from "../auth/auth.types.js";
import type { CreateClassTimetableSlotDto } from "./dto/create-class-timetable-slot.dto.js";
import type { CreateSchoolCalendarEventDto } from "./dto/create-school-calendar-event.dto.js";
import type { ListClassTimetableQueryDto } from "./dto/list-class-timetable-query.dto.js";
import type { ListMyTimetableQueryDto } from "./dto/list-my-timetable-query.dto.js";
import type { ListSchoolCalendarEventsQueryDto } from "./dto/list-school-calendar-events-query.dto.js";
import type { SetClassSubjectStyleDto } from "./dto/set-class-subject-style.dto.js";
import type { UpdateClassTimetableSlotDto } from "./dto/update-class-timetable-slot.dto.js";
import type { UpdateSchoolCalendarEventDto } from "./dto/update-school-calendar-event.dto.js";

type ClassContext = {
  id: string;
  name: string;
  schoolId: string;
  schoolYearId: string;
  academicLevelId: string | null;
  curriculumId: string | null;
  referentTeacherUserId: string | null;
};

const SUBJECT_COLOR_PALETTE = [
  "#2563EB",
  "#DC2626",
  "#0891B2",
  "#4D7C0F",
  "#7C3AED",
  "#B45309",
  "#0E7490",
  "#BE123C",
  "#0F766E",
  "#7E22CE",
  "#374151",
  "#0369A1",
];

const MIN_COLOR_DISTANCE_AUTO = 80;
const MIN_COLOR_DISTANCE_MANUAL = 50;

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async classContext(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    schoolYearId?: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const classEntity = await this.ensureClassInSchool(
      classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    const requestedSchoolYearId = schoolYearId ?? classEntity.schoolYearId;
    await this.ensureSchoolYearInSchool(
      requestedSchoolYearId,
      effectiveSchoolId,
    );

    const [allowedSubjects, assignments, schoolContext, subjectStyles] =
      await Promise.all([
        this.listAllowedSubjectsForClass(classEntity.id, effectiveSchoolId),
        this.prisma.teacherClassSubject.findMany({
          where: {
            schoolId: effectiveSchoolId,
            classId: classEntity.id,
            schoolYearId: requestedSchoolYearId,
          },
          select: {
            teacherUserId: true,
            subjectId: true,
            subject: {
              select: { id: true, name: true },
            },
            teacherUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: [
            { subject: { name: "asc" } },
            { teacherUser: { lastName: "asc" } },
            { teacherUser: { firstName: "asc" } },
          ],
        }),
        this.prisma.school.findUnique({
          where: { id: effectiveSchoolId },
          select: {
            activeSchoolYearId: true,
            schoolYears: {
              select: { id: true, label: true },
              orderBy: { label: "desc" },
            },
          },
        }),
        this.prisma.classTimetableSubjectStyle.findMany({
          where: {
            schoolId: effectiveSchoolId,
            classId: classEntity.id,
            schoolYearId: requestedSchoolYearId,
          },
          select: { subjectId: true, colorHex: true },
        }),
      ]);
    return {
      class: classEntity,
      allowedSubjects,
      assignments,
      subjectStyles,
      schoolYears: (schoolContext?.schoolYears ?? []).map((year) => ({
        id: year.id,
        label: year.label,
        isActive: schoolContext?.activeSchoolYearId === year.id,
      })),
      selectedSchoolYearId:
        schoolYearId ??
        schoolContext?.activeSchoolYearId ??
        classEntity.schoolYearId,
    };
  }

  async classTimetable(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    query: ListClassTimetableQueryDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const classEntity = await this.ensureClassInSchool(
      classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    const schoolYearId = query.schoolYearId ?? classEntity.schoolYearId;
    await this.ensureSchoolYearInSchool(schoolYearId, effectiveSchoolId);

    const dateRange = this.parseDateRange(query.fromDate, query.toDate);
    const { slots, calendarEvents, subjectStyles } =
      await this.fetchClassTimetableData({
        schoolId: effectiveSchoolId,
        schoolYearId,
        classEntity,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      });

    return {
      class: {
        id: classEntity.id,
        schoolYearId: classEntity.schoolYearId,
        academicLevelId: classEntity.academicLevelId,
      },
      slots,
      calendarEvents,
      subjectStyles,
    };
  }

  async myTimetable(
    user: AuthenticatedUser,
    schoolId: string,
    query: ListMyTimetableQueryDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const role = this.resolveRoleForMyTimetable(
      user,
      effectiveSchoolId,
      query.childId,
    );
    if (!role) {
      throw new ForbiddenException("Insufficient role");
    }

    const targetStudent = await this.resolveTargetStudentForMyTimetable({
      schoolId: effectiveSchoolId,
      user,
      role,
      childId: query.childId,
    });

    const schoolYearId = query.schoolYearId
      ? await this.ensureAccessibleEnrollmentForStudent({
          schoolId: effectiveSchoolId,
          studentId: targetStudent.id,
          schoolYearId: query.schoolYearId,
        })
      : await this.getPreferredSchoolYearForStudent(
          effectiveSchoolId,
          targetStudent.id,
        );

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        schoolId: effectiveSchoolId,
        studentId: targetStudent.id,
        schoolYearId,
      },
      select: { classId: true },
    });
    if (!enrollment) {
      throw new NotFoundException("Student enrollment not found");
    }

    const classEntity = await this.ensureClassInSchool(
      enrollment.classId,
      effectiveSchoolId,
    );
    const dateRange = this.parseDateRange(query.fromDate, query.toDate);
    const { slots, calendarEvents, subjectStyles } =
      await this.fetchClassTimetableData({
        schoolId: effectiveSchoolId,
        schoolYearId,
        classEntity,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      });

    return {
      student: targetStudent,
      class: {
        id: classEntity.id,
        name: classEntity.name,
        schoolYearId: classEntity.schoolYearId,
        academicLevelId: classEntity.academicLevelId,
      },
      slots,
      calendarEvents,
      subjectStyles,
    };
  }

  async createSlot(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    payload: CreateClassTimetableSlotDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    this.assertMinuteRange(payload.startMinute, payload.endMinute);

    const classEntity = await this.ensureClassInSchool(
      classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    const schoolYearId = payload.schoolYearId ?? classEntity.schoolYearId;
    await this.ensureSchoolYearInSchool(schoolYearId, effectiveSchoolId);

    await this.ensureSubjectInSchool(payload.subjectId, effectiveSchoolId);
    await this.ensureSubjectAllowedForClass(
      classEntity.id,
      payload.subjectId,
      effectiveSchoolId,
    );
    await this.ensureTeacherAssignedToClassSubject(
      effectiveSchoolId,
      schoolYearId,
      classEntity.id,
      payload.subjectId,
      payload.teacherUserId,
    );

    await this.ensureNoSlotConflicts({
      schoolId: effectiveSchoolId,
      schoolYearId,
      classId: classEntity.id,
      weekday: payload.weekday,
      startMinute: payload.startMinute,
      endMinute: payload.endMinute,
      teacherUserId: payload.teacherUserId,
      room: payload.room ?? null,
    });

    await this.ensureAutoSubjectStyleExists({
      schoolId: effectiveSchoolId,
      schoolYearId,
      classId: classEntity.id,
      subjectId: payload.subjectId,
    });

    return this.prisma.classTimetableSlot.create({
      data: {
        schoolId: effectiveSchoolId,
        schoolYearId,
        classId: classEntity.id,
        subjectId: payload.subjectId,
        teacherUserId: payload.teacherUserId,
        weekday: payload.weekday,
        startMinute: payload.startMinute,
        endMinute: payload.endMinute,
        room: payload.room?.trim() || null,
        createdByUserId: user.id,
      },
      include: {
        subject: { select: { id: true, name: true } },
        teacherUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async updateSlot(
    user: AuthenticatedUser,
    schoolId: string,
    slotId: string,
    payload: UpdateClassTimetableSlotDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    if (
      payload.weekday === undefined &&
      payload.startMinute === undefined &&
      payload.endMinute === undefined &&
      payload.subjectId === undefined &&
      payload.teacherUserId === undefined &&
      payload.room === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.classTimetableSlot.findFirst({
      where: { id: slotId, schoolId: effectiveSchoolId },
      select: {
        id: true,
        schoolId: true,
        schoolYearId: true,
        classId: true,
        subjectId: true,
        teacherUserId: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
        room: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("Timetable slot not found");
    }

    const classEntity = await this.ensureClassInSchool(
      existing.classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    const nextWeekday = payload.weekday ?? existing.weekday;
    const nextStartMinute = payload.startMinute ?? existing.startMinute;
    const nextEndMinute = payload.endMinute ?? existing.endMinute;
    const nextSubjectId = payload.subjectId ?? existing.subjectId;
    const nextTeacherUserId = payload.teacherUserId ?? existing.teacherUserId;
    const nextRoom = payload.room === undefined ? existing.room : payload.room;

    this.assertMinuteRange(nextStartMinute, nextEndMinute);

    await this.ensureSubjectInSchool(nextSubjectId, effectiveSchoolId);
    await this.ensureSubjectAllowedForClass(
      classEntity.id,
      nextSubjectId,
      effectiveSchoolId,
    );
    await this.ensureTeacherAssignedToClassSubject(
      effectiveSchoolId,
      classEntity.schoolYearId,
      classEntity.id,
      nextSubjectId,
      nextTeacherUserId,
    );

    await this.ensureNoSlotConflicts({
      schoolId: effectiveSchoolId,
      schoolYearId: classEntity.schoolYearId,
      classId: classEntity.id,
      weekday: nextWeekday,
      startMinute: nextStartMinute,
      endMinute: nextEndMinute,
      teacherUserId: nextTeacherUserId,
      room: nextRoom,
      exceptSlotId: existing.id,
    });

    await this.ensureAutoSubjectStyleExists({
      schoolId: effectiveSchoolId,
      schoolYearId: existing.schoolYearId,
      classId: classEntity.id,
      subjectId: nextSubjectId,
    });

    return this.prisma.classTimetableSlot.update({
      where: { id: existing.id },
      data: {
        weekday: nextWeekday,
        startMinute: nextStartMinute,
        endMinute: nextEndMinute,
        subjectId: nextSubjectId,
        teacherUserId: nextTeacherUserId,
        room: nextRoom?.trim() || null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        teacherUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async setClassSubjectStyle(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
    subjectId: string,
    payload: SetClassSubjectStyleDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    const classEntity = await this.ensureClassInSchool(
      classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    const schoolYearId = payload.schoolYearId ?? classEntity.schoolYearId;
    await this.ensureSchoolYearInSchool(schoolYearId, effectiveSchoolId);
    await this.ensureSubjectInSchool(subjectId, effectiveSchoolId);
    await this.ensureSubjectAllowedForClass(
      classId,
      subjectId,
      effectiveSchoolId,
    );

    const normalizedColor = payload.colorHex.toUpperCase();
    await this.assertColorIsDistinctWithinClassYear({
      schoolId: effectiveSchoolId,
      schoolYearId,
      classId,
      subjectId,
      colorHex: normalizedColor,
    });

    return this.prisma.classTimetableSubjectStyle.upsert({
      where: {
        schoolId_schoolYearId_classId_subjectId: {
          schoolId: effectiveSchoolId,
          schoolYearId,
          classId,
          subjectId,
        },
      },
      update: {
        colorHex: normalizedColor,
      },
      create: {
        schoolId: effectiveSchoolId,
        schoolYearId,
        classId,
        subjectId,
        colorHex: normalizedColor,
      },
      select: {
        subjectId: true,
        colorHex: true,
        schoolYearId: true,
        classId: true,
      },
    });
  }

  async deleteSlot(user: AuthenticatedUser, schoolId: string, slotId: string) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);

    const existing = await this.prisma.classTimetableSlot.findFirst({
      where: { id: slotId, schoolId: effectiveSchoolId },
      select: { id: true, classId: true },
    });
    if (!existing) {
      throw new NotFoundException("Timetable slot not found");
    }

    const classEntity = await this.ensureClassInSchool(
      existing.classId,
      effectiveSchoolId,
    );
    await this.assertCanManageClassTimetable(
      user,
      effectiveSchoolId,
      classEntity,
    );

    await this.prisma.classTimetableSlot.delete({ where: { id: existing.id } });
    return { id: existing.id, deleted: true };
  }

  async listCalendarEvents(
    user: AuthenticatedUser,
    schoolId: string,
    query: ListSchoolCalendarEventsQueryDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    await this.assertCanReadCalendarEvents(user, effectiveSchoolId);

    const schoolYearId =
      query.schoolYearId ??
      (await this.getActiveSchoolYearIdOrThrow(effectiveSchoolId));

    if (query.classId) {
      const classEntity = await this.ensureClassInSchool(
        query.classId,
        effectiveSchoolId,
      );
      if (classEntity.schoolYearId !== schoolYearId) {
        throw new BadRequestException("Class school year mismatch");
      }
    }

    if (query.academicLevelId) {
      await this.ensureAcademicLevelInSchool(
        query.academicLevelId,
        effectiveSchoolId,
      );
    }

    const fromDate = query.fromDate ? new Date(query.fromDate) : null;
    const toDate = query.toDate ? new Date(query.toDate) : null;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        "fromDate must be before or equal to toDate",
      );
    }

    return this.prisma.schoolCalendarEvent.findMany({
      where: {
        schoolId: effectiveSchoolId,
        schoolYearId,
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.academicLevelId
          ? { academicLevelId: query.academicLevelId }
          : {}),
        ...(fromDate && toDate
          ? {
              AND: [
                { startDate: { lte: toDate } },
                { endDate: { gte: fromDate } },
              ],
            }
          : {}),
      },
      orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    });
  }

  async createCalendarEvent(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateSchoolCalendarEventDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    await this.assertCanManageCalendarEvents(user, effectiveSchoolId);

    const schoolYearId =
      payload.schoolYearId ??
      (await this.getActiveSchoolYearIdOrThrow(effectiveSchoolId));
    await this.ensureSchoolYearInSchool(schoolYearId, effectiveSchoolId);

    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    this.assertDateRange(startDate, endDate);

    await this.validateCalendarEventScope({
      schoolId: effectiveSchoolId,
      schoolYearId,
      scope: payload.scope,
      classId: payload.classId,
      academicLevelId: payload.academicLevelId,
    });

    return this.prisma.schoolCalendarEvent.create({
      data: {
        schoolId: effectiveSchoolId,
        schoolYearId,
        type: payload.type ?? "HOLIDAY",
        scope: payload.scope,
        label: payload.label.trim(),
        startDate,
        endDate,
        classId: payload.classId ?? null,
        academicLevelId: payload.academicLevelId ?? null,
        createdByUserId: user.id,
      },
    });
  }

  async updateCalendarEvent(
    user: AuthenticatedUser,
    schoolId: string,
    eventId: string,
    payload: UpdateSchoolCalendarEventDto,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    await this.assertCanManageCalendarEvents(user, effectiveSchoolId);

    if (
      payload.type === undefined &&
      payload.scope === undefined &&
      payload.label === undefined &&
      payload.startDate === undefined &&
      payload.endDate === undefined &&
      payload.classId === undefined &&
      payload.academicLevelId === undefined
    ) {
      throw new BadRequestException("No fields to update");
    }

    const existing = await this.prisma.schoolCalendarEvent.findFirst({
      where: { id: eventId, schoolId: effectiveSchoolId },
      select: {
        id: true,
        schoolYearId: true,
        type: true,
        scope: true,
        label: true,
        startDate: true,
        endDate: true,
        classId: true,
        academicLevelId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException("Calendar event not found");
    }

    const nextType = payload.type ?? existing.type;
    const nextScope = payload.scope ?? existing.scope;
    const nextLabel = payload.label?.trim() ?? existing.label;
    const nextStartDate = payload.startDate
      ? new Date(payload.startDate)
      : existing.startDate;
    const nextEndDate = payload.endDate
      ? new Date(payload.endDate)
      : existing.endDate;

    const nextClassId =
      payload.classId === undefined ? existing.classId : payload.classId;
    const nextAcademicLevelId =
      payload.academicLevelId === undefined
        ? existing.academicLevelId
        : payload.academicLevelId;

    this.assertDateRange(nextStartDate, nextEndDate);

    await this.validateCalendarEventScope({
      schoolId: effectiveSchoolId,
      schoolYearId: existing.schoolYearId,
      scope: nextScope,
      classId: nextClassId,
      academicLevelId: nextAcademicLevelId,
    });

    return this.prisma.schoolCalendarEvent.update({
      where: { id: existing.id },
      data: {
        type: nextType,
        scope: nextScope,
        label: nextLabel,
        startDate: nextStartDate,
        endDate: nextEndDate,
        classId: nextClassId ?? null,
        academicLevelId: nextAcademicLevelId ?? null,
      },
    });
  }

  async deleteCalendarEvent(
    user: AuthenticatedUser,
    schoolId: string,
    eventId: string,
  ) {
    const effectiveSchoolId = this.getEffectiveSchoolId(user, schoolId);
    await this.assertCanManageCalendarEvents(user, effectiveSchoolId);

    const existing = await this.prisma.schoolCalendarEvent.findFirst({
      where: {
        id: eventId,
        schoolId: effectiveSchoolId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Calendar event not found");
    }

    await this.prisma.schoolCalendarEvent.delete({
      where: { id: existing.id },
    });
    return { id: existing.id, deleted: true };
  }

  private parseDateRange(fromDateRaw?: string, toDateRaw?: string) {
    const fromDate = fromDateRaw ? new Date(fromDateRaw) : null;
    const toDate = toDateRaw ? new Date(toDateRaw) : null;
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException("Invalid fromDate");
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid toDate");
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        "fromDate must be before or equal to toDate",
      );
    }
    return { fromDate, toDate };
  }

  private async fetchClassTimetableData(input: {
    schoolId: string;
    schoolYearId: string;
    classEntity: ClassContext;
    fromDate: Date | null;
    toDate: Date | null;
  }) {
    const [slots, calendarEvents, subjectStyles] = await Promise.all([
      this.prisma.classTimetableSlot.findMany({
        where: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          classId: input.classEntity.id,
        },
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
        include: {
          subject: { select: { id: true, name: true } },
          teacherUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.schoolCalendarEvent.findMany({
        where: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          ...(input.fromDate && input.toDate
            ? {
                AND: [
                  { startDate: { lte: input.toDate } },
                  { endDate: { gte: input.fromDate } },
                ],
              }
            : {}),
          OR: [
            { scope: "SCHOOL" },
            { scope: "CLASS", classId: input.classEntity.id },
            ...(input.classEntity.academicLevelId
              ? [
                  {
                    scope: "ACADEMIC_LEVEL" as const,
                    academicLevelId: input.classEntity.academicLevelId,
                  },
                ]
              : []),
          ],
        },
        orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
      }),
      this.prisma.classTimetableSubjectStyle.findMany({
        where: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          classId: input.classEntity.id,
        },
        select: { subjectId: true, colorHex: true },
      }),
    ]);

    return { slots, calendarEvents, subjectStyles };
  }

  private async resolveTargetStudentForMyTimetable(input: {
    schoolId: string;
    user: AuthenticatedUser;
    role: SchoolRole;
    childId?: string;
  }) {
    if (input.role === "STUDENT") {
      const student = await this.prisma.student.findFirst({
        where: {
          schoolId: input.schoolId,
          userId: input.user.id,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!student) {
        throw new NotFoundException("Student profile not found");
      }
      return student;
    }

    const links = await this.prisma.parentStudent.findMany({
      where: {
        schoolId: input.schoolId,
        parentUserId: input.user.id,
      },
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    if (links.length === 0) {
      throw new NotFoundException("No linked student");
    }

    if (!input.childId) {
      return links[0].student;
    }

    const match = links.find((link) => link.student.id === input.childId);
    if (!match) {
      throw new ForbiddenException("Child is not linked to this parent");
    }
    return match.student;
  }

  private async getPreferredSchoolYearForStudent(
    schoolId: string,
    studentId: string,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    if (school?.activeSchoolYearId) {
      const inActiveYear = await this.prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId,
          schoolYearId: school.activeSchoolYearId,
        },
        select: { schoolYearId: true },
      });
      if (inActiveYear) {
        return inActiveYear.schoolYearId;
      }
    }

    const latestEnrollment = await this.prisma.enrollment.findFirst({
      where: { schoolId, studentId },
      orderBy: [{ createdAt: "desc" }],
      select: { schoolYearId: true },
    });

    if (!latestEnrollment) {
      throw new NotFoundException("Student enrollment not found");
    }

    return latestEnrollment.schoolYearId;
  }

  private async ensureAccessibleEnrollmentForStudent(input: {
    schoolId: string;
    studentId: string;
    schoolYearId: string;
  }) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        schoolYearId: input.schoolYearId,
      },
      select: { schoolYearId: true },
    });

    if (!enrollment) {
      throw new NotFoundException(
        "Student has no enrollment for requested school year",
      );
    }

    return enrollment.schoolYearId;
  }

  private async ensureAutoSubjectStyleExists(input: {
    schoolId: string;
    schoolYearId: string;
    classId: string;
    subjectId: string;
  }) {
    const existing = await this.prisma.classTimetableSubjectStyle.findUnique({
      where: {
        schoolId_schoolYearId_classId_subjectId: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          classId: input.classId,
          subjectId: input.subjectId,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const rows = await this.prisma.classTimetableSubjectStyle.findMany({
      where: {
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        classId: input.classId,
      },
      select: { colorHex: true },
    });
    const usedColors = rows.map((row) => row.colorHex.toUpperCase());
    const nextColor = this.pickDistinctColorFromPalette(usedColors);

    await this.prisma.classTimetableSubjectStyle.create({
      data: {
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        classId: input.classId,
        subjectId: input.subjectId,
        colorHex: nextColor,
      },
    });
  }

  private pickDistinctColorFromPalette(usedColors: string[]) {
    if (usedColors.length === 0) {
      return SUBJECT_COLOR_PALETTE[0];
    }

    const available = SUBJECT_COLOR_PALETTE.filter(
      (color) => !usedColors.includes(color),
    );
    const candidates = available.length > 0 ? available : SUBJECT_COLOR_PALETTE;

    let bestColor = candidates[0];
    let bestScore = -1;
    for (const candidate of candidates) {
      const minDistance = this.minimumColorDistance(candidate, usedColors);
      if (minDistance >= MIN_COLOR_DISTANCE_AUTO) {
        return candidate;
      }
      if (minDistance > bestScore) {
        bestScore = minDistance;
        bestColor = candidate;
      }
    }
    return bestColor;
  }

  private async assertColorIsDistinctWithinClassYear(input: {
    schoolId: string;
    schoolYearId: string;
    classId: string;
    subjectId: string;
    colorHex: string;
  }) {
    const others = await this.prisma.classTimetableSubjectStyle.findMany({
      where: {
        schoolId: input.schoolId,
        schoolYearId: input.schoolYearId,
        classId: input.classId,
        subjectId: { not: input.subjectId },
      },
      select: { colorHex: true },
    });
    const otherColors = others.map((entry) => entry.colorHex.toUpperCase());
    const minDistance = this.minimumColorDistance(input.colorHex, otherColors);
    if (otherColors.length > 0 && minDistance < MIN_COLOR_DISTANCE_MANUAL) {
      throw new BadRequestException(
        "Color too close to another subject color in this class and school year",
      );
    }
  }

  private minimumColorDistance(sourceHex: string, targetHexColors: string[]) {
    if (targetHexColors.length === 0) {
      return Number.POSITIVE_INFINITY;
    }
    const source = this.hexToRgb(sourceHex);
    let min = Number.POSITIVE_INFINITY;
    for (const targetHex of targetHexColors) {
      const target = this.hexToRgb(targetHex);
      const distance = Math.sqrt(
        (source.r - target.r) ** 2 +
          (source.g - target.g) ** 2 +
          (source.b - target.b) ** 2,
      );
      if (distance < min) {
        min = distance;
      }
    }
    return min;
  }

  private hexToRgb(colorHex: string) {
    const normalized = colorHex.replace("#", "");
    if (normalized.length !== 6) {
      throw new BadRequestException("Invalid colorHex");
    }
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

  private assertMinuteRange(startMinute: number, endMinute: number) {
    if (startMinute >= endMinute) {
      throw new BadRequestException("startMinute must be lower than endMinute");
    }
  }

  private assertDateRange(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    if (startDate > endDate) {
      throw new BadRequestException(
        "startDate must be before or equal to endDate",
      );
    }
  }

  private async ensureNoSlotConflicts(input: {
    schoolId: string;
    schoolYearId: string;
    classId: string;
    weekday: number;
    startMinute: number;
    endMinute: number;
    teacherUserId: string;
    room: string | null;
    exceptSlotId?: string;
  }) {
    const overlapWindow: Prisma.IntFilter = {
      lt: input.endMinute,
    };

    const [classConflict, teacherConflict, roomConflict] = await Promise.all([
      this.prisma.classTimetableSlot.findFirst({
        where: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          classId: input.classId,
          weekday: input.weekday,
          startMinute: overlapWindow,
          endMinute: { gt: input.startMinute },
          ...(input.exceptSlotId ? { id: { not: input.exceptSlotId } } : {}),
        },
        select: { id: true },
      }),
      this.prisma.classTimetableSlot.findFirst({
        where: {
          schoolId: input.schoolId,
          schoolYearId: input.schoolYearId,
          teacherUserId: input.teacherUserId,
          weekday: input.weekday,
          startMinute: overlapWindow,
          endMinute: { gt: input.startMinute },
          ...(input.exceptSlotId ? { id: { not: input.exceptSlotId } } : {}),
        },
        select: { id: true },
      }),
      input.room
        ? this.prisma.classTimetableSlot.findFirst({
            where: {
              schoolId: input.schoolId,
              schoolYearId: input.schoolYearId,
              room: input.room,
              weekday: input.weekday,
              startMinute: overlapWindow,
              endMinute: { gt: input.startMinute },
              ...(input.exceptSlotId
                ? { id: { not: input.exceptSlotId } }
                : {}),
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (classConflict) {
      throw new BadRequestException("Conflicting slot for class");
    }
    if (teacherConflict) {
      throw new BadRequestException("Conflicting slot for teacher");
    }
    if (roomConflict) {
      throw new BadRequestException("Conflicting slot for room");
    }
  }

  private async ensureSubjectAllowedForClass(
    classId: string,
    subjectId: string,
    schoolId: string,
  ) {
    const [classEntity, override] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: classId, schoolId },
        select: {
          curriculumId: true,
          curriculum: {
            select: {
              subjects: {
                where: { subjectId },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.classSubjectOverride.findFirst({
        where: { schoolId, classId, subjectId },
        select: { action: true },
      }),
    ]);

    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }

    if (override?.action === "REMOVE") {
      throw new ForbiddenException("Subject is not allowed for this class");
    }

    if (override?.action === "ADD") {
      return;
    }

    if (!classEntity.curriculumId) {
      throw new ForbiddenException("Class has no curriculum");
    }

    const isInCurriculum = (classEntity.curriculum?.subjects?.length ?? 0) > 0;
    if (!isInCurriculum) {
      throw new ForbiddenException("Subject is not in class curriculum");
    }
  }

  private async listAllowedSubjectsForClass(classId: string, schoolId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        curriculumId: true,
        curriculum: {
          select: {
            subjects: {
              select: {
                subject: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }

    const subjectMap = new Map<string, { id: string; name: string }>();

    if (classEntity.curriculumId) {
      for (const row of classEntity.curriculum?.subjects ?? []) {
        subjectMap.set(row.subject.id, row.subject);
      }
    }

    const overrides = await this.prisma.classSubjectOverride.findMany({
      where: { schoolId, classId },
      select: {
        action: true,
        subject: {
          select: { id: true, name: true },
        },
      },
    });

    for (const override of overrides) {
      if (override.action === "REMOVE") {
        subjectMap.delete(override.subject.id);
      }
      if (override.action === "ADD") {
        subjectMap.set(override.subject.id, override.subject);
      }
    }

    return Array.from(subjectMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private async ensureTeacherAssignedToClassSubject(
    schoolId: string,
    schoolYearId: string,
    classId: string,
    subjectId: string,
    teacherUserId: string,
  ) {
    const [teacherMembership, assignment] = await Promise.all([
      this.prisma.schoolMembership.findFirst({
        where: {
          schoolId,
          userId: teacherUserId,
          role: "TEACHER",
        },
        select: { id: true },
      }),
      this.prisma.teacherClassSubject.findFirst({
        where: {
          schoolId,
          schoolYearId,
          classId,
          subjectId,
          teacherUserId,
        },
        select: { id: true },
      }),
    ]);

    if (!teacherMembership) {
      throw new ForbiddenException(
        "Selected user is not a teacher in this school",
      );
    }

    if (!assignment) {
      throw new ForbiddenException(
        "Teacher is not assigned to this class and subject for the school year",
      );
    }
  }

  private async ensureSubjectInSchool(subjectId: string, schoolId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true },
    });

    if (!subject) {
      throw new NotFoundException("Subject not found");
    }
  }

  private async ensureAcademicLevelInSchool(
    academicLevelId: string,
    schoolId: string,
  ) {
    const level = await this.prisma.academicLevel.findFirst({
      where: { id: academicLevelId, schoolId },
      select: { id: true },
    });

    if (!level) {
      throw new NotFoundException("Academic level not found");
    }
  }

  private async ensureSchoolYearInSchool(
    schoolYearId: string,
    schoolId: string,
  ) {
    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: schoolYearId, schoolId },
      select: { id: true },
    });

    if (!schoolYear) {
      throw new NotFoundException("School year not found");
    }
  }

  private async ensureClassInSchool(
    classId: string,
    schoolId: string,
  ): Promise<ClassContext> {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        name: true,
        schoolId: true,
        schoolYearId: true,
        academicLevelId: true,
        curriculumId: true,
        referentTeacherUserId: true,
      },
    });

    if (!classEntity) {
      throw new NotFoundException("Class not found");
    }

    return classEntity;
  }

  private async getActiveSchoolYearIdOrThrow(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    if (!school?.activeSchoolYearId) {
      throw new BadRequestException(
        "No active school year configured for this school",
      );
    }

    return school.activeSchoolYearId;
  }

  private async validateCalendarEventScope(input: {
    schoolId: string;
    schoolYearId: string;
    scope: "SCHOOL" | "ACADEMIC_LEVEL" | "CLASS";
    classId?: string | null;
    academicLevelId?: string | null;
  }) {
    if (input.scope === "SCHOOL") {
      if (input.classId || input.academicLevelId) {
        throw new BadRequestException(
          "SCHOOL scope must not include classId or academicLevelId",
        );
      }
      return;
    }

    if (input.scope === "ACADEMIC_LEVEL") {
      if (!input.academicLevelId) {
        throw new BadRequestException(
          "ACADEMIC_LEVEL scope requires academicLevelId",
        );
      }
      if (input.classId) {
        throw new BadRequestException(
          "ACADEMIC_LEVEL scope must not include classId",
        );
      }
      await this.ensureAcademicLevelInSchool(
        input.academicLevelId,
        input.schoolId,
      );
      return;
    }

    if (!input.classId) {
      throw new BadRequestException("CLASS scope requires classId");
    }

    if (input.academicLevelId) {
      throw new BadRequestException(
        "CLASS scope must not include academicLevelId",
      );
    }

    await this.ensureClassInSchool(input.classId, input.schoolId);
  }

  private async assertCanManageClassTimetable(
    user: AuthenticatedUser,
    schoolId: string,
    classEntity: ClassContext,
  ) {
    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasPlatformRole(user, "ADMIN")
    ) {
      return;
    }

    if (
      this.hasSchoolRole(user, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(user, schoolId, "SUPERVISOR")
    ) {
      return;
    }

    if (!this.hasSchoolRole(user, schoolId, "TEACHER")) {
      throw new ForbiddenException("Insufficient role");
    }

    if (
      !classEntity.referentTeacherUserId ||
      classEntity.referentTeacherUserId !== user.id
    ) {
      throw new ForbiddenException(
        "Only class referent teacher can manage timetable for this class",
      );
    }
  }

  private async assertCanReadCalendarEvents(
    user: AuthenticatedUser,
    schoolId: string,
  ) {
    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasPlatformRole(user, "ADMIN")
    ) {
      return;
    }

    if (
      this.hasSchoolRole(user, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(user, schoolId, "SUPERVISOR") ||
      this.hasSchoolRole(user, schoolId, "TEACHER")
    ) {
      return;
    }

    throw new ForbiddenException("Insufficient role");
  }

  private async assertCanManageCalendarEvents(
    user: AuthenticatedUser,
    schoolId: string,
  ) {
    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasPlatformRole(user, "ADMIN")
    ) {
      return;
    }

    if (
      this.hasSchoolRole(user, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(user, schoolId, "SUPERVISOR")
    ) {
      return;
    }

    throw new ForbiddenException("Insufficient role");
  }

  private getEffectiveSchoolId(user: AuthenticatedUser, schoolId: string) {
    if (
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasPlatformRole(user, "ADMIN")
    ) {
      return schoolId;
    }

    return schoolId;
  }

  private hasPlatformRole(
    user: AuthenticatedUser,
    role: AuthenticatedUser["platformRoles"][number],
  ) {
    return user.platformRoles.includes(role);
  }

  private hasSchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    role: SchoolRole,
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId && membership.role === role,
    );
  }

  private getHighestSchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
  ): SchoolRole | null {
    const membership = user.memberships.find(
      (entry) => entry.schoolId === schoolId,
    );
    return membership?.role ?? null;
  }

  private resolveRoleForMyTimetable(
    user: AuthenticatedUser,
    schoolId: string,
    childId?: string,
  ): "STUDENT" | "PARENT" | null {
    const hasStudentRole = this.hasSchoolRole(user, schoolId, "STUDENT");
    const hasParentRole = this.hasSchoolRole(user, schoolId, "PARENT");

    if (childId?.trim()) {
      if (hasParentRole) {
        return "PARENT";
      }
      return hasStudentRole ? "STUDENT" : null;
    }

    if (hasStudentRole) {
      return "STUDENT";
    }
    if (hasParentRole) {
      return "PARENT";
    }
    return null;
  }
}
