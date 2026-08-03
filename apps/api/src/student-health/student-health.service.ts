import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  StudentHealthAccessAction,
  StudentHealthAlertLevel,
  StudentHealthReportType,
  SchoolRole,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { publicEmailOrNull } from "../common/email.util.js";
import { MailService } from "../mail/mail.service.js";
import { PushService } from "../notifications/push.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateStudentHealthConditionDto } from "./dto/create-student-health-condition.dto.js";
import type { UpdateStudentHealthConditionDto } from "./dto/update-student-health-condition.dto.js";
import type { CreateStudentHealthCareEventDto } from "./dto/create-student-health-care-event.dto.js";
import type { CreateStudentHealthReportDto } from "./dto/create-student-health-report.dto.js";

const HEALTH_TYPE_LABELS: Record<StudentHealthReportType, string> = {
  MALADIE: "Maladie",
  TRAITEMENT: "Traitement",
  ACCIDENT: "Accident",
  CONSULTATION: "Consultation medicale",
  HOSPITALISATION: "Hospitalisation",
  VACCINATION: "Vaccination",
  RESTRICTION_SPORT: "Restriction sportive",
  AUTRE: "Autre",
};

@Injectable()
export class StudentHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly pushService: PushService,
  ) {}

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

  private isPlatformAdmin(user: AuthenticatedUser) {
    return (
      user.platformRoles.includes("SUPER_ADMIN") ||
      user.platformRoles.includes("ADMIN")
    );
  }

  private isHealthManager(user: AuthenticatedUser, schoolId: string) {
    return (
      this.isPlatformAdmin(user) ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_ADMIN") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_MANAGER") ||
      this.hasSchoolRole(user, schoolId, "SCHOOL_HEALTH_OFFICER")
    );
  }

  private async isParentOfStudent(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
  ) {
    if (!this.hasSchoolRole(user, schoolId, "PARENT")) {
      return false;
    }
    const link = await this.prisma.parentStudent.findFirst({
      where: { schoolId, studentId, parentUserId: user.id },
      select: { id: true },
    });
    return Boolean(link);
  }

  private async isReferentTeacherOfStudent(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
  ) {
    if (!this.hasSchoolRole(user, schoolId, "TEACHER")) {
      return false;
    }
    const enrollment = await this.getCurrentEnrollment(schoolId, studentId);
    if (!enrollment) {
      return false;
    }
    const classroom = await this.prisma.class.findFirst({
      where: { id: enrollment.classId, schoolId },
      select: { referentTeacherUserId: true },
    });
    return classroom?.referentTeacherUserId === user.id;
  }

  private async isAnyTeacherOfStudentClass(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
  ) {
    if (!this.hasSchoolRole(user, schoolId, "TEACHER")) {
      return false;
    }
    const enrollment = await this.getCurrentEnrollment(schoolId, studentId);
    if (!enrollment) {
      return false;
    }
    const assignment = await this.prisma.teacherClassSubject.findFirst({
      where: {
        schoolId,
        teacherUserId: user.id,
        classId: enrollment.classId,
        schoolYearId: enrollment.schoolYearId,
      },
      select: { id: true },
    });
    return Boolean(assignment);
  }

  private async getCurrentEnrollment(schoolId: string, studentId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });
    if (school?.activeSchoolYearId) {
      const active = await this.prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId,
          schoolYearId: school.activeSchoolYearId,
        },
        select: { classId: true, schoolYearId: true },
      });
      if (active) return active;
    }
    return this.prisma.enrollment.findFirst({
      where: { schoolId, studentId },
      orderBy: [{ createdAt: "desc" }],
      select: { classId: true, schoolYearId: true },
    });
  }

  private async ensureStudentInSchool(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) {
      throw new NotFoundException("Student not found");
    }
    return student;
  }

  private async logAccess(
    schoolId: string,
    studentId: string,
    userId: string,
    action: StudentHealthAccessAction,
  ) {
    try {
      await this.prisma.studentHealthAccessLog.create({
        data: { schoolId, studentId, userId, action },
      });
    } catch {
      // Access logging must never block the business flow.
    }
  }

  /** Full detail access = parent of the child, health manager, or the class referent teacher. */
  private async assertFullAccess(
    user: AuthenticatedUser,
    schoolId: string,
    studentId: string,
  ) {
    if (this.isHealthManager(user, schoolId)) {
      return "manager" as const;
    }
    if (await this.isParentOfStudent(user, schoolId, studentId)) {
      return "parent" as const;
    }
    if (await this.isReferentTeacherOfStudent(user, schoolId, studentId)) {
      return "referent" as const;
    }
    throw new ForbiddenException("Insufficient role");
  }

  async listConditions(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    const access = await this.assertFullAccess(user, schoolId, studentId);
    await this.logAccess(schoolId, studentId, user.id, "VIEW_CONDITIONS");

    const rows = await this.prisma.studentHealthCondition.findMany({
      where: { schoolId, studentId },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });

    if (access === "manager" || access === "parent") {
      return rows;
    }

    // Referent teacher: full description allowed, but only active conditions.
    return rows.filter((row) => row.active);
  }

  /** Teachers who are not the referent only see the redacted public alert badge. */
  async listPublicAlerts(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    const isTeacherOfClass = await this.isAnyTeacherOfStudentClass(
      user,
      schoolId,
      studentId,
    );
    if (!isTeacherOfClass && !this.isHealthManager(user, schoolId)) {
      throw new ForbiddenException("Insufficient role");
    }

    const rows = await this.prisma.studentHealthCondition.findMany({
      where: {
        schoolId,
        studentId,
        active: true,
        isVisibleToAllTeachers: true,
      },
      select: {
        id: true,
        alertLevel: true,
        publicAlertLabel: true,
        type: true,
      },
    });

    return rows;
  }

  async createCondition(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
    payload: CreateStudentHealthConditionDto,
  ) {
    const student = await this.ensureStudentInSchool(studentId, schoolId);
    const isManager = this.isHealthManager(user, schoolId);
    const isParent = await this.isParentOfStudent(user, schoolId, studentId);
    if (!isManager && !isParent) {
      throw new ForbiddenException("Insufficient role");
    }

    if (payload.isVisibleToAllTeachers && !payload.publicAlertLabel) {
      throw new BadRequestException(
        "publicAlertLabel is required when isVisibleToAllTeachers is true",
      );
    }

    const condition = await this.prisma.studentHealthCondition.create({
      data: {
        schoolId,
        studentId,
        type: payload.type,
        alertLevel: payload.alertLevel,
        label: payload.label,
        description: payload.description,
        emergencyInstructions: payload.emergencyInstructions,
        isVisibleToAllTeachers: payload.isVisibleToAllTeachers ?? false,
        publicAlertLabel: payload.publicAlertLabel,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
        createdByUserId: user.id,
      },
    });

    void student;
    return condition;
  }

  async updateCondition(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
    conditionId: string,
    payload: UpdateStudentHealthConditionDto,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    const isManager = this.isHealthManager(user, schoolId);
    const isParent = await this.isParentOfStudent(user, schoolId, studentId);
    if (!isManager && !isParent) {
      throw new ForbiddenException("Insufficient role");
    }

    const existing = await this.prisma.studentHealthCondition.findFirst({
      where: { id: conditionId, schoolId, studentId },
    });
    if (!existing) {
      throw new NotFoundException("Health condition not found");
    }

    if (
      (payload.isVisibleToAllTeachers ?? existing.isVisibleToAllTeachers) &&
      !(payload.publicAlertLabel ?? existing.publicAlertLabel)
    ) {
      throw new BadRequestException(
        "publicAlertLabel is required when isVisibleToAllTeachers is true",
      );
    }

    return this.prisma.studentHealthCondition.update({
      where: { id: conditionId },
      data: {
        type: payload.type,
        alertLevel: payload.alertLevel,
        label: payload.label,
        description: payload.description,
        emergencyInstructions: payload.emergencyInstructions,
        isVisibleToAllTeachers: payload.isVisibleToAllTeachers,
        publicAlertLabel: payload.publicAlertLabel,
        active: payload.active,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined,
      },
    });
  }

  async listCareEvents(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    await this.assertFullAccess(user, schoolId, studentId);
    await this.logAccess(schoolId, studentId, user.id, "VIEW_CARE_EVENTS");

    return this.prisma.studentHealthCareEvent.findMany({
      where: { schoolId, studentId },
      orderBy: [{ occurredAt: "desc" }],
      include: {
        authorUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async createCareEvent(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
    payload: CreateStudentHealthCareEventDto,
  ) {
    const student = await this.ensureStudentInSchool(studentId, schoolId);
    if (!this.isHealthManager(user, schoolId)) {
      throw new ForbiddenException("Insufficient role");
    }

    const event = await this.prisma.studentHealthCareEvent.create({
      data: {
        schoolId,
        studentId,
        authorUserId: user.id,
        occurredAt: payload.occurredAt
          ? new Date(payload.occurredAt)
          : new Date(),
        summary: payload.summary,
        description: payload.description,
        alertLevel: payload.alertLevel,
        followUpNeeded: payload.followUpNeeded ?? false,
      },
      include: {
        authorUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.notifyParentsAboutCareEvent(schoolId, student, event);

    return event;
  }

  async listReports(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    await this.assertFullAccess(user, schoolId, studentId);
    await this.logAccess(schoolId, studentId, user.id, "VIEW_REPORTS");

    return this.prisma.studentHealthReport.findMany({
      where: { schoolId, studentId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        reportedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        acknowledgedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async createReport(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
    payload: CreateStudentHealthReportDto,
  ) {
    const student = await this.ensureStudentInSchool(studentId, schoolId);
    const isParent = await this.isParentOfStudent(user, schoolId, studentId);
    if (!isParent) {
      throw new ForbiddenException("Insufficient role");
    }

    const report = await this.prisma.studentHealthReport.create({
      data: {
        schoolId,
        studentId,
        reportedByUserId: user.id,
        type: payload.type,
        alertLevel: payload.alertLevel,
        description: payload.description,
        sportRestriction: payload.sportRestriction ?? false,
        effectiveFrom: payload.effectiveFrom
          ? new Date(payload.effectiveFrom)
          : undefined,
        effectiveTo: payload.effectiveTo
          ? new Date(payload.effectiveTo)
          : undefined,
      },
      include: {
        reportedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.notifyReferentAboutReport(schoolId, student, report);

    return report;
  }

  async acknowledgeReport(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
    reportId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    const isManager = this.isHealthManager(user, schoolId);
    const isReferent = await this.isReferentTeacherOfStudent(
      user,
      schoolId,
      studentId,
    );
    if (!isManager && !isReferent) {
      throw new ForbiddenException("Insufficient role");
    }

    const report = await this.prisma.studentHealthReport.findFirst({
      where: { id: reportId, schoolId, studentId },
    });
    if (!report) {
      throw new NotFoundException("Health report not found");
    }

    return this.prisma.studentHealthReport.update({
      where: { id: reportId },
      data: { acknowledgedByUserId: user.id, acknowledgedAt: new Date() },
    });
  }

  async getUrgencySummary(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    const student = await this.ensureStudentInSchool(studentId, schoolId);
    await this.assertFullAccess(user, schoolId, studentId);
    await this.logAccess(schoolId, studentId, user.id, "VIEW_URGENCE");

    const [conditions, parentLinks] = await Promise.all([
      this.prisma.studentHealthCondition.findMany({
        where: { schoolId, studentId, active: true },
        orderBy: [{ alertLevel: "desc" }],
      }),
      this.prisma.parentStudent.findMany({
        where: { schoolId, studentId },
        include: {
          parent: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
      }),
    ]);

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      conditions,
      emergencyContacts: parentLinks.map((link) => ({
        id: link.parent.id,
        fullName: `${link.parent.firstName} ${link.parent.lastName}`.trim(),
        phone: link.parent.phone,
      })),
    };
  }

  async getHistory(
    schoolId: string,
    user: AuthenticatedUser,
    studentId: string,
  ) {
    await this.ensureStudentInSchool(studentId, schoolId);
    await this.assertFullAccess(user, schoolId, studentId);
    await this.logAccess(schoolId, studentId, user.id, "VIEW_HISTORY");

    const [conditions, careEvents, reports] = await Promise.all([
      this.prisma.studentHealthCondition.findMany({
        where: { schoolId, studentId },
        orderBy: [{ createdAt: "desc" }],
      }),
      this.prisma.studentHealthCareEvent.findMany({
        where: { schoolId, studentId },
        orderBy: [{ occurredAt: "desc" }],
        include: {
          authorUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.studentHealthReport.findMany({
        where: { schoolId, studentId },
        orderBy: [{ createdAt: "desc" }],
        include: {
          reportedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    const items = [
      ...conditions.map((row) => ({
        kind: "CONDITION" as const,
        at: row.createdAt,
        payload: row,
      })),
      ...careEvents.map((row) => ({
        kind: "CARE_EVENT" as const,
        at: row.occurredAt,
        payload: row,
      })),
      ...reports.map((row) => ({
        kind: "REPORT" as const,
        at: row.createdAt,
        payload: row,
      })),
    ];

    items.sort((a, b) => b.at.getTime() - a.at.getTime());

    return items;
  }

  private async notifyParentsAboutCareEvent(
    schoolId: string,
    student: { id: string; firstName: string; lastName: string },
    event: {
      summary: string;
      description: string | null;
      occurredAt: Date;
      alertLevel: StudentHealthAlertLevel;
      authorUser: { firstName: string; lastName: string } | null;
    },
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, slug: true },
    });
    if (!school) return;

    const parentLinks = await this.prisma.parentStudent.findMany({
      where: { schoolId, studentId: student.id },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            preferredLocale: true,
          },
        },
      },
    });

    const authorFullName = event.authorUser
      ? `${event.authorUser.firstName} ${event.authorUser.lastName}`.trim()
      : "Ecole";
    const parentUserIds: string[] = [];

    for (const link of parentLinks) {
      parentUserIds.push(link.parent.id);
      const publicEmail = publicEmailOrNull(link.parent.email);
      if (!publicEmail) continue;

      try {
        await this.mailService.sendStudentHealthCareEventNotification({
          to: publicEmail,
          parentFirstName: link.parent.firstName,
          schoolSlug: school.slug,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          summary: event.summary,
          description: event.description,
          occurredAt: event.occurredAt.toISOString(),
          authorFullName,
          locale: link.parent.preferredLocale === "EN" ? "en" : "fr",
        });
      } catch {
        // The care event is already persisted; mail failures must not block business flow.
      }
    }

    if (parentUserIds.length === 0) return;

    try {
      const pushTokens = await this.prisma.mobilePushToken.findMany({
        where: {
          userId: { in: parentUserIds },
          isActive: true,
          OR: [{ schoolId }, { schoolId: null }],
        },
        select: { token: true },
        distinct: ["token"],
      });
      const studentFullName = `${student.firstName} ${student.lastName}`.trim();

      await this.pushService.sendStudentHealthCareEventNotification({
        tokens: pushTokens.map((row) => row.token),
        title: `Sante · ${studentFullName}`,
        body: event.summary,
        data: {
          type: "STUDENT_HEALTH_CARE_EVENT",
          schoolSlug: school.slug,
          studentId: student.id,
        },
      });
    } catch {
      // Push failures must not block business flow.
    }
  }

  private async notifyReferentAboutReport(
    schoolId: string,
    student: { id: string; firstName: string; lastName: string },
    report: {
      id: string;
      type: StudentHealthReportType;
      description: string;
      sportRestriction: boolean;
      reportedByUser: { firstName: string; lastName: string } | null;
    },
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, slug: true },
    });
    if (!school) return;

    const enrollment = await this.getCurrentEnrollment(schoolId, student.id);
    if (!enrollment) return;

    const classroom = await this.prisma.class.findFirst({
      where: { id: enrollment.classId, schoolId },
      select: { referentTeacherUserId: true },
    });
    if (!classroom?.referentTeacherUserId) return;

    const referent = await this.prisma.user.findUnique({
      where: { id: classroom.referentTeacherUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        preferredLocale: true,
      },
    });
    if (!referent) return;

    const reporterFullName = report.reportedByUser
      ? `${report.reportedByUser.firstName} ${report.reportedByUser.lastName}`.trim()
      : "Parent";
    const publicEmail = publicEmailOrNull(referent.email);

    if (publicEmail) {
      try {
        await this.mailService.sendStudentHealthReportNotification({
          to: publicEmail,
          recipientFirstName: referent.firstName,
          schoolSlug: school.slug,
          studentFirstName: student.firstName,
          studentLastName: student.lastName,
          reportType: report.type,
          description: report.description,
          sportRestriction: report.sportRestriction,
          reporterFullName,
          locale: referent.preferredLocale === "EN" ? "en" : "fr",
        });
      } catch {
        // The report is already persisted; mail failures must not block business flow.
      }
    }

    try {
      const pushTokens = await this.prisma.mobilePushToken.findMany({
        where: {
          userId: referent.id,
          isActive: true,
          OR: [{ schoolId }, { schoolId: null }],
        },
        select: { token: true },
        distinct: ["token"],
      });
      const studentFullName = `${student.firstName} ${student.lastName}`.trim();
      const typeLabel = HEALTH_TYPE_LABELS[report.type] ?? report.type;

      await this.pushService.sendStudentHealthReportNotification({
        tokens: pushTokens.map((row) => row.token),
        title: `Sante · ${studentFullName}`,
        body: typeLabel,
        data: {
          type: "STUDENT_HEALTH_REPORT",
          schoolSlug: school.slug,
          studentId: student.id,
          reportId: report.id,
        },
      });
    } catch {
      // Push failures must not block business flow.
    }
  }
}
