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
   * Deduit le libelle de l'annee scolaire suivant une annee source, en
   * incrementant chaque borne d'un an (ex: "2025-2026" -> "2026-2027").
   * Si le libelle source ne suit pas ce format, on retombe sur l'annee
   * civile courante comme point de depart (meme convention que la creation
   * d'ecole a l'onboarding).
   */
  private computeNextSchoolYearLabel(sourceLabel: string): string {
    const match = /^(\d{4})-(\d{4})$/.exec(sourceLabel);
    if (match) {
      const startYear = Number(match[1]) + 1;
      const endYear = Number(match[2]) + 1;
      return `${startYear}-${endYear}`;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const startYear = month >= 8 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
  }

  /**
   * Garantit qu'une annee scolaire suivant `sourceSchoolYearId` existe pour
   * l'ecole, sans jamais l'activer : l'activation reste une decision
   * explicite de l'admin ou du school manager. Appelee automatiquement des
   * qu'une decision de conseil de classe (promotion ou redoublement) est
   * enregistree, pour que la reinscription ne reste jamais bloquee faute
   * d'annee cible. Idempotente via la contrainte unique (schoolId, label).
   */
  async ensureNextSchoolYearExists(
    schoolId: string,
    sourceSchoolYearId: string,
  ) {
    const sourceYear = await this.prisma.schoolYear.findFirst({
      where: { id: sourceSchoolYearId, schoolId },
      select: { label: true },
    });
    if (!sourceYear) {
      throw new NotFoundException("Annee scolaire source introuvable");
    }

    const nextLabel = this.computeNextSchoolYearLabel(sourceYear.label);
    const targetYear = await this.prisma.schoolYear.upsert({
      where: { schoolId_label: { schoolId, label: nextLabel } },
      create: { schoolId, label: nextLabel },
      update: {},
      select: { id: true, label: true },
    });

    await this.provisionFeeSchedulesForNewYear(
      schoolId,
      sourceSchoolYearId,
      targetYear.id,
    );
    await this.provisionSupplyListsForNewYear(
      schoolId,
      sourceSchoolYearId,
      targetYear.id,
    );
    await this.provisionReinscriptionDeadlinesForNewYear(
      schoolId,
      sourceSchoolYearId,
      targetYear.id,
    );

    return targetYear;
  }

  /**
   * Copie l'echeancier (FeeSchedule + FeeInstallment) de chaque niveau/filiere
   * depuis l'annee source vers l'annee cible, des que celle-ci est creee —
   * quel que soit l'evenement declencheur (promotion d'un eleve, roulement
   * d'annee explicite ou creation manuelle par le chef d'etablissement). Sans
   * cela, le school manager doit ressaisir l'echeancier de zero chaque annee
   * pour chaque niveau. Idempotent : ne recree rien si un echeancier existe
   * deja pour ce (niveau, filiere) sur l'annee cible. Vit ici (plutot que
   * dans FinanceService) pour eviter un cycle de modules : FinanceModule
   * importe deja EnrollmentsModule.
   */
  async provisionFeeSchedulesForNewYear(
    schoolId: string,
    sourceSchoolYearId: string,
    targetSchoolYearId: string,
  ) {
    if (sourceSchoolYearId === targetSchoolYearId) {
      return;
    }

    const sourceSchedules = await this.prisma.feeSchedule.findMany({
      where: { schoolId, schoolYearId: sourceSchoolYearId },
      include: { installments: { orderBy: { rank: "asc" } } },
    });

    for (const source of sourceSchedules) {
      const existing = await this.prisma.feeSchedule.findFirst({
        where: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
          trackId: source.trackId,
        },
        select: { id: true },
      });
      if (existing) {
        continue;
      }

      await this.prisma.feeSchedule.create({
        data: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
          trackId: source.trackId,
          installments: {
            create: source.installments.map((installment) => ({
              schoolId,
              rank: installment.rank,
              label: installment.label,
              amount: installment.amount,
              dueDate: installment.dueDate
                ? this.shiftDateByOneYear(installment.dueDate)
                : null,
            })),
          },
        },
      });
    }
  }

  private shiftDateByOneYear(date: Date): Date {
    const shifted = new Date(date);
    shifted.setUTCFullYear(shifted.getUTCFullYear() + 1);
    return shifted;
  }

  /**
   * Meme principe que provisionFeeSchedulesForNewYear, applique a la liste de
   * fournitures scolaires (SupplyList + SupplyItem) : le school manager
   * n'a plus a la ressaisir de zero chaque annee, il n'ajuste que ce qui
   * change.
   */
  async provisionSupplyListsForNewYear(
    schoolId: string,
    sourceSchoolYearId: string,
    targetSchoolYearId: string,
  ) {
    if (sourceSchoolYearId === targetSchoolYearId) {
      return;
    }

    const sourceLists = await this.prisma.supplyList.findMany({
      where: { schoolId, schoolYearId: sourceSchoolYearId },
      include: { items: { orderBy: { rank: "asc" } } },
    });

    for (const source of sourceLists) {
      const existing = await this.prisma.supplyList.findFirst({
        where: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
          trackId: source.trackId,
        },
        select: { id: true },
      });
      if (existing) {
        continue;
      }

      await this.prisma.supplyList.create({
        data: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
          trackId: source.trackId,
          items: {
            create: source.items.map((item) => ({
              schoolId,
              rank: item.rank,
              label: item.label,
              quantity: item.quantity,
              note: item.note,
            })),
          },
        },
      });
    }
  }

  /**
   * Meme principe que provisionFeeSchedulesForNewYear, applique aux dates
   * limites de preinscription par niveau : la date est decalee d'un an
   * (memes mois/jour), pour que le school admin n'ait pas a la ressaisir
   * chaque annee. Il peut ensuite l'ajuster pour l'annee cible sans impacter
   * l'annee source.
   */
  async provisionReinscriptionDeadlinesForNewYear(
    schoolId: string,
    sourceSchoolYearId: string,
    targetSchoolYearId: string,
  ) {
    if (sourceSchoolYearId === targetSchoolYearId) {
      return;
    }

    const sourceDeadlines = await this.prisma.reinscriptionDeadline.findMany({
      where: { schoolId, schoolYearId: sourceSchoolYearId },
    });

    for (const source of sourceDeadlines) {
      const existing = await this.prisma.reinscriptionDeadline.findFirst({
        where: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
        },
        select: { id: true },
      });
      if (existing) {
        continue;
      }

      await this.prisma.reinscriptionDeadline.create({
        data: {
          schoolId,
          schoolYearId: targetSchoolYearId,
          academicLevelId: source.academicLevelId,
          deadline: this.shiftDateByOneYear(source.deadline),
        },
      });
    }
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
