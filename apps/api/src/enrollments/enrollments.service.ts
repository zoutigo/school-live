import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { EnrollmentConfirmationSource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSchoolYearIdOrThrow(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { activeSchoolYearId: true },
    });

    if (!school?.activeSchoolYearId) {
      throw new BadRequestException(
        "Aucune annee scolaire active pour cette ecole",
      );
    }

    return school.activeSchoolYearId;
  }

  /**
   * La decision du conseil de classe est enregistree sur le bulletin du dernier
   * trimestre (TERM_3) de l'annee scolaire active (l'annee que l'eleve termine).
   * Elle porte le niveau/filiere cible pour l'annee suivante.
   */
  async getConfirmedDecisionOrThrow(schoolId: string, studentId: string) {
    const sourceSchoolYearId =
      await this.getActiveSchoolYearIdOrThrow(schoolId);

    const report = await this.prisma.studentTermReport.findFirst({
      where: {
        schoolId,
        studentId,
        schoolYearId: sourceSchoolYearId,
        term: "TERM_3",
        decision: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        decision: true,
        nextAcademicLevelId: true,
        nextTrackId: true,
      },
    });

    if (!report || report.decision === "LEFT") {
      throw new BadRequestException(
        "Aucune decision de conseil de classe permettant une reinscription n'a ete trouvee pour cet eleve",
      );
    }

    if (!report.nextAcademicLevelId) {
      throw new BadRequestException(
        "La decision du conseil de classe ne precise pas de niveau cible pour cet eleve",
      );
    }

    return {
      sourceSchoolYearId,
      decision: report.decision,
      nextAcademicLevelId: report.nextAcademicLevelId,
      nextTrackId: report.nextTrackId,
    };
  }

  /**
   * Cree (si absente) l'inscription en attente d'affectation de l'eleve pour
   * l'annee scolaire cible, a partir du niveau/filiere decides par le conseil
   * de classe. Idempotente : ne recree rien si l'eleve est deja inscrit pour
   * cette annee.
   */
  async confirmReinscription(
    schoolId: string,
    studentId: string,
    targetSchoolYearId: string,
    source: EnrollmentConfirmationSource,
    confirmedByUserId?: string,
  ) {
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        schoolYearId_studentId: {
          schoolYearId: targetSchoolYearId,
          studentId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    const targetYear = await this.prisma.schoolYear.findFirst({
      where: { id: targetSchoolYearId, schoolId },
      select: { id: true },
    });
    if (!targetYear) {
      throw new NotFoundException(
        "Annee scolaire cible introuvable pour cette ecole",
      );
    }

    const { nextAcademicLevelId, nextTrackId } =
      await this.getConfirmedDecisionOrThrow(schoolId, studentId);

    return this.prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId: targetSchoolYearId,
        studentId,
        classId: null,
        academicLevelId: nextAcademicLevelId,
        trackId: nextTrackId,
        status: "ACTIVE",
        confirmedAt: new Date(),
        confirmedByUserId: confirmedByUserId ?? null,
        confirmationSource: source,
      },
    });
  }
}
