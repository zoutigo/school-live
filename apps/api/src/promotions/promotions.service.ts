import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { ensureClassHasCapacity } from "../common/class-capacity.util.js";
import type { SetTermReportDecisionDto } from "./dto/set-term-report-decision.dto.js";
import type { ListWaitingEnrollmentsQueryDto } from "./dto/list-waiting-enrollments-query.dto.js";
import type { AssignEnrollmentToClassDto } from "./dto/assign-enrollment-to-class.dto.js";

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /**
   * Bulletins du dernier trimestre (TERM_3) de l'annee active, pour une classe
   * donnee, avec leur decision de conseil de classe (s'il y en a deja une).
   */
  async listTermReportsForDecision(schoolId: string, classId: string) {
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, schoolYearId: true },
    });
    if (!classroom) {
      throw new NotFoundException("Classe introuvable");
    }

    return this.prisma.studentTermReport.findMany({
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
    });
  }

  async setTermReportDecision(
    schoolId: string,
    reportId: string,
    payload: SetTermReportDecisionDto,
    updatedByUserId: string,
  ) {
    const report = await this.prisma.studentTermReport.findFirst({
      where: { id: reportId, schoolId },
      select: { id: true, term: true },
    });
    if (!report) {
      throw new NotFoundException("Bulletin introuvable");
    }
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
        updatedByUserId,
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
