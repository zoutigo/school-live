import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { EvaluationsService } from "../evaluations/evaluations.service.js";
import { ensureClassHasCapacity } from "../common/class-capacity.util.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { SetTermReportDecisionDto } from "./dto/set-term-report-decision.dto.js";
import type { ListWaitingEnrollmentsQueryDto } from "./dto/list-waiting-enrollments-query.dto.js";
import type { AssignEnrollmentToClassDto } from "./dto/assign-enrollment-to-class.dto.js";

const PROMOTION_ADMIN_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
] as const;

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly evaluationsService: EvaluationsService,
  ) {}

  /**
   * Un administrateur ecole (ou super admin plateforme) peut decider pour
   * n'importe quelle classe. Un enseignant ne peut decider que pour sa/ses
   * classe(s) dont il est le professeur referent.
   */
  private async ensureDecisionAccess(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        schoolYearId: true,
        referentTeacherUserId: true,
        academicLevel: { select: { id: true, order: true } },
      },
    });
    if (!classroom) {
      throw new NotFoundException("Classe introuvable");
    }

    const isAdmin =
      this.hasAnySchoolRole(user, schoolId, PROMOTION_ADMIN_ROLES) ||
      this.hasPlatformRole(user, "SUPER_ADMIN") ||
      this.hasPlatformRole(user, "ADMIN");
    if (isAdmin) {
      return classroom;
    }

    if (classroom.referentTeacherUserId === user.id) {
      return classroom;
    }

    throw new ForbiddenException(
      "Seul le professeur referent de la classe peut saisir la decision de passage",
    );
  }

  private hasAnySchoolRole(
    user: AuthenticatedUser,
    schoolId: string,
    roles: readonly string[],
  ) {
    return user.memberships.some(
      (membership) =>
        membership.schoolId === schoolId && roles.includes(membership.role),
    );
  }

  private hasPlatformRole(user: AuthenticatedUser, role: string) {
    return user.platformRoles.includes(role as never);
  }

  /**
   * Bulletins du dernier trimestre (TERM_3) de l'annee active, pour une classe
   * donnee, avec leur decision de conseil de classe (s'il y en a deja une),
   * accompagnes de la synthese annuelle (moyenne T1/T2/T3 et moyenne annuelle)
   * necessaire pour eclairer la decision.
   */
  async listTermReportsForDecision(
    user: AuthenticatedUser,
    schoolId: string,
    classId: string,
  ) {
    const classroom = await this.ensureDecisionAccess(user, schoolId, classId);

    const [reports, termAverages] = await Promise.all([
      this.prisma.studentTermReport.findMany({
        where: {
          schoolId,
          classId,
          schoolYearId: classroom.schoolYearId,
          term: "TERM_3",
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          nextAcademicLevel: { select: { id: true, label: true } },
          nextTrack: { select: { id: true, label: true } },
        },
        orderBy: [
          { student: { lastName: "asc" } },
          { student: { firstName: "asc" } },
        ],
      }),
      this.evaluationsService.computeClassTermAverages(schoolId, classId),
    ]);

    const yearlyAverageByStudentId = new Map<string, number>();
    for (const report of reports) {
      const averages = termAverages.get(report.studentId) ?? {};
      const values = [
        averages.TERM_1 ?? null,
        averages.TERM_2 ?? null,
        averages.TERM_3 ?? null,
      ].filter((value): value is number => value !== null);
      if (values.length > 0) {
        yearlyAverageByStudentId.set(
          report.studentId,
          Number(
            (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
          ),
        );
      }
    }
    const rankableYearlyAverages = Array.from(
      yearlyAverageByStudentId.values(),
    );

    return reports.map((report) => {
      const averages = termAverages.get(report.studentId) ?? {};
      const yearlyAverage =
        yearlyAverageByStudentId.get(report.studentId) ?? null;
      const rank =
        yearlyAverage !== null
          ? 1 +
            rankableYearlyAverages.filter((value) => value > yearlyAverage)
              .length
          : null;

      return {
        ...report,
        termAverages: {
          TERM_1: averages.TERM_1 ?? null,
          TERM_2: averages.TERM_2 ?? null,
          TERM_3: averages.TERM_3 ?? null,
        },
        yearlyAverage,
        rank,
        classSize: rankableYearlyAverages.length,
        currentAcademicLevel: classroom.academicLevel,
      };
    });
  }

  async setTermReportDecision(
    user: AuthenticatedUser,
    schoolId: string,
    reportId: string,
    payload: SetTermReportDecisionDto,
  ) {
    const report = await this.prisma.studentTermReport.findFirst({
      where: { id: reportId, schoolId },
      select: { id: true, term: true, classId: true },
    });
    if (!report) {
      throw new NotFoundException("Bulletin introuvable");
    }
    await this.ensureDecisionAccess(user, schoolId, report.classId);

    if (report.term !== "TERM_3") {
      throw new BadRequestException(
        "La decision de passage ne peut etre saisie que sur le bulletin du dernier trimestre",
      );
    }
    if (payload.decision !== "LEFT" && !payload.nextAcademicLevelId) {
      throw new BadRequestException(
        "Un niveau cible est requis pour une decision de promotion ou de redoublement",
      );
    }

    return this.prisma.studentTermReport.update({
      where: { id: report.id },
      data: {
        decision: payload.decision,
        nextAcademicLevelId:
          payload.decision === "LEFT"
            ? null
            : (payload.nextAcademicLevelId ?? null),
        nextTrackId:
          payload.decision === "LEFT" ? null : (payload.nextTrackId ?? null),
        updatedByUserId: user.id,
      },
    });
  }

  async listWaitingEnrollments(
    schoolId: string,
    query: ListWaitingEnrollmentsQueryDto,
  ) {
    return this.prisma.enrollment.findMany({
      where: {
        schoolId,
        schoolYearId: query.schoolYearId,
        classId: null,
        academicLevelId: query.academicLevelId,
        trackId: query.trackId,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        academicLevel: { select: { id: true, label: true } },
        track: { select: { id: true, label: true } },
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });
  }

  async assignEnrollmentToClass(
    schoolId: string,
    enrollmentId: string,
    payload: AssignEnrollmentToClassDto,
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      select: { id: true, schoolYearId: true, classId: true },
    });
    if (!enrollment) {
      throw new NotFoundException("Inscription introuvable");
    }
    if (enrollment.classId) {
      throw new BadRequestException("Cet eleve est deja affecte a une classe");
    }

    const targetClass = await this.prisma.class.findFirst({
      where: {
        id: payload.classId,
        schoolId,
        schoolYearId: enrollment.schoolYearId,
      },
      select: { id: true },
    });
    if (!targetClass) {
      throw new NotFoundException(
        "Classe cible introuvable pour cette annee scolaire",
      );
    }

    await ensureClassHasCapacity(
      this.prisma,
      targetClass.id,
      enrollment.schoolYearId,
    );

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { classId: targetClass.id },
    });
  }

  async confirmReinscriptionManually(
    schoolId: string,
    studentId: string,
    targetSchoolYearId: string,
    confirmedByUserId: string,
  ) {
    return this.enrollmentsService.confirmReinscription(
      schoolId,
      studentId,
      targetSchoolYearId,
      "MANUAL",
      confirmedByUserId,
    );
  }
}
