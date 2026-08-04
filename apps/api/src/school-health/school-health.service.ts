import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, StudentHealthAlertLevel } from "@prisma/client";
import { computeAgeInYears } from "../common/age.util.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ListSchoolHealthStudentsQueryDto } from "./dto/list-school-health-students-query.dto.js";
import type { ListSchoolHealthReportsQueryDto } from "./dto/list-school-health-reports-query.dto.js";
import type { GetSchoolHealthStatsQueryDto } from "./dto/get-school-health-stats-query.dto.js";

const ALERT_LEVELS: StudentHealthAlertLevel[] = ["INFO", "ATTENTION", "URGENT"];

@Injectable()
export class SchoolHealthService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActiveSchoolYearId(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });
    return school?.activeSchoolYearId ?? null;
  }

  private async ensureClassInSchool(classId: string, schoolId: string) {
    const found = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException("Class not found");
    }
  }

  async listStudents(
    schoolId: string,
    query: ListSchoolHealthStudentsQueryDto = {},
  ) {
    if (query.classId) {
      await this.ensureClassInSchool(query.classId, schoolId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const activeSchoolYearId = await this.getActiveSchoolYearId(schoolId);

    const where: Prisma.StudentWhereInput = {
      schoolId,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.classId
        ? {
            enrollments: {
              some: {
                classId: query.classId,
                ...(activeSchoolYearId
                  ? { schoolYearId: activeSchoolYearId }
                  : {}),
              },
            },
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          user: { select: { recoveryBirthDate: true } },
          enrollments: {
            where: activeSchoolYearId
              ? { schoolYearId: activeSchoolYearId }
              : undefined,
            orderBy: [{ createdAt: "desc" }],
            take: 1,
            select: { class: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    const now = new Date();
    const items = students.map((student) => {
      const birthDate = student.user?.recoveryBirthDate ?? null;
      return {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.enrollments[0]?.class ?? null,
        birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
        age: birthDate ? computeAgeInYears(birthDate, now) : null,
      };
    });

    return { items, page, limit, total };
  }

  async listReports(
    schoolId: string,
    query: ListSchoolHealthReportsQueryDto = {},
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentHealthReportWhereInput = {
      schoolId,
      ...(query.alertLevel ? { alertLevel: query.alertLevel } : {}),
      ...(query.reportType ? { type: query.reportType } : {}),
      ...(query.acknowledged === true ? { acknowledgedAt: { not: null } } : {}),
      ...(query.acknowledged === false ? { acknowledgedAt: null } : {}),
      ...(query.search
        ? {
            student: {
              OR: [
                { firstName: { contains: query.search, mode: "insensitive" } },
                { lastName: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [reports, total] = await Promise.all([
      this.prisma.studentHealthReport.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              enrollments: {
                orderBy: [{ createdAt: "desc" }],
                take: 1,
                select: { class: { select: { id: true, name: true } } },
              },
            },
          },
          reportedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          acknowledgedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.studentHealthReport.count({ where }),
    ]);

    const items = reports.map((report) => ({
      ...report,
      student: {
        id: report.student.id,
        firstName: report.student.firstName,
        lastName: report.student.lastName,
        class: report.student.enrollments[0]?.class ?? null,
      },
    }));

    return { items, page, limit, total };
  }

  async getStats(schoolId: string, query: GetSchoolHealthStatsQueryDto = {}) {
    if (query.classId) {
      await this.ensureClassInSchool(query.classId, schoolId);
    }
    const activeSchoolYearId = await this.getActiveSchoolYearId(schoolId);

    const studentScope: Prisma.StudentWhereInput | undefined = query.classId
      ? {
          enrollments: {
            some: {
              classId: query.classId,
              ...(activeSchoolYearId
                ? { schoolYearId: activeSchoolYearId }
                : {}),
            },
          },
        }
      : undefined;

    const conditionWhereBase: Prisma.StudentHealthConditionWhereInput = {
      schoolId,
      active: true,
      ...(studentScope ? { student: studentScope } : {}),
    };

    const careEventWhereBase: Prisma.StudentHealthCareEventWhereInput = {
      schoolId,
      ...(studentScope ? { student: studentScope } : {}),
    };

    const reportWhereBase: Prisma.StudentHealthReportWhereInput = {
      schoolId,
      ...(studentScope ? { student: studentScope } : {}),
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      conditionsByAlertLevel,
      studentsWithActiveConditions,
      careEventsLast7Days,
      careEventsLast30Days,
      reportsPendingAcknowledgement,
    ] = await Promise.all([
      this.prisma.studentHealthCondition.groupBy({
        by: ["alertLevel"],
        where: conditionWhereBase,
        _count: { _all: true },
      }),
      this.prisma.studentHealthCondition.findMany({
        where: conditionWhereBase,
        distinct: ["studentId"],
        select: { studentId: true },
      }),
      this.prisma.studentHealthCareEvent.count({
        where: { ...careEventWhereBase, occurredAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.studentHealthCareEvent.count({
        where: { ...careEventWhereBase, occurredAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.studentHealthReport.count({
        where: { ...reportWhereBase, acknowledgedAt: null },
      }),
    ]);

    const activeConditionsByAlertLevel = Object.fromEntries(
      ALERT_LEVELS.map((level) => [level, 0]),
    ) as Record<StudentHealthAlertLevel, number>;
    for (const row of conditionsByAlertLevel) {
      activeConditionsByAlertLevel[row.alertLevel] = row._count._all;
    }
    const activeConditionsTotal = Object.values(
      activeConditionsByAlertLevel,
    ).reduce((sum, n) => sum + n, 0);

    return {
      scope: query.classId ? ("CLASS" as const) : ("SCHOOL" as const),
      classId: query.classId ?? null,
      activeConditionsByAlertLevel,
      activeConditionsTotal,
      studentsWithActiveConditions: studentsWithActiveConditions.length,
      careEventsLast7Days,
      careEventsLast30Days,
      reportsPendingAcknowledgement,
    };
  }
}
