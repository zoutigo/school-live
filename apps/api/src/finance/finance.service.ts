import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import type { UpsertFeeScheduleDto } from "./dto/upsert-fee-schedule.dto.js";
import type { RecordDirectPaymentDto } from "./dto/record-direct-payment.dto.js";
import type { ListFeeSchedulesQueryDto } from "./dto/list-fee-schedules-query.dto.js";
import type { UpdateFinanceSettingsDto } from "./dto/update-finance-settings.dto.js";
import type { UpsertReinscriptionDeadlineDto } from "./dto/upsert-reinscription-deadline.dto.js";
import type { ListReinscriptionDeadlinesQueryDto } from "./dto/list-reinscription-deadlines-query.dto.js";

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async getFinanceSettings(schoolId: string) {
    return this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: {
        reinscriptionThresholdPolicy: true,
        reinscriptionDeadlineDaysBeforeStart: true,
      },
    });
  }

  async updateFinanceSettings(
    schoolId: string,
    payload: UpdateFinanceSettingsDto,
  ) {
    return this.prisma.school.update({
      where: { id: schoolId },
      data: {
        reinscriptionThresholdPolicy: payload.reinscriptionThresholdPolicy,
        reinscriptionDeadlineDaysBeforeStart:
          payload.reinscriptionDeadlineDaysBeforeStart,
      },
      select: {
        reinscriptionThresholdPolicy: true,
        reinscriptionDeadlineDaysBeforeStart: true,
      },
    });
  }

  async listFeeSchedules(schoolId: string, query: ListFeeSchedulesQueryDto) {
    return this.prisma.feeSchedule.findMany({
      where: {
        schoolId,
        schoolYearId: query.schoolYearId,
        academicLevelId: query.academicLevelId,
      },
      include: {
        academicLevel: { select: { id: true, label: true, code: true } },
        track: { select: { id: true, label: true, code: true } },
        schoolYear: { select: { id: true, label: true } },
        installments: { orderBy: { rank: "asc" } },
      },
      orderBy: [{ academicLevelId: "asc" }, { trackId: "asc" }],
    });
  }

  async upsertFeeSchedule(schoolId: string, payload: UpsertFeeScheduleDto) {
    const ranks = payload.installments.map((i) => i.rank);
    if (new Set(ranks).size !== ranks.length) {
      throw new BadRequestException(
        "Les rangs d'echeance doivent etre uniques",
      );
    }
    if (payload.installments.length === 0) {
      throw new BadRequestException("Au moins une echeance est requise");
    }

    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: payload.schoolYearId, schoolId },
      select: { id: true },
    });
    if (!schoolYear) {
      throw new NotFoundException(
        "Annee scolaire introuvable pour cette ecole",
      );
    }

    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: {
        id: payload.academicLevelId,
        OR: [{ schoolId }, { schoolId: null }],
      },
      select: { id: true },
    });
    if (!academicLevel) {
      throw new NotFoundException(
        "Niveau academique introuvable pour cette ecole",
      );
    }

    const existing = await this.prisma.feeSchedule.findFirst({
      where: {
        schoolId,
        schoolYearId: payload.schoolYearId,
        academicLevelId: payload.academicLevelId,
        trackId: payload.trackId ?? null,
      },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const feeSchedule = existing
        ? existing
        : await tx.feeSchedule.create({
            data: {
              schoolId,
              schoolYearId: payload.schoolYearId,
              academicLevelId: payload.academicLevelId,
              trackId: payload.trackId ?? null,
            },
          });

      await tx.feeInstallment.deleteMany({
        where: { feeScheduleId: feeSchedule.id },
      });
      await tx.feeInstallment.createMany({
        data: payload.installments.map((installment) => ({
          schoolId,
          feeScheduleId: feeSchedule.id,
          rank: installment.rank,
          label: installment.label,
          amount: installment.amount,
          dueDate: installment.dueDate ? new Date(installment.dueDate) : null,
        })),
      });

      return tx.feeSchedule.findUniqueOrThrow({
        where: { id: feeSchedule.id },
        include: { installments: { orderBy: { rank: "asc" } } },
      });
    });
  }

  async deleteFeeSchedule(schoolId: string, feeScheduleId: string) {
    const feeSchedule = await this.prisma.feeSchedule.findFirst({
      where: { id: feeScheduleId, schoolId },
      select: { id: true },
    });
    if (!feeSchedule) {
      throw new NotFoundException("Echeancier introuvable");
    }
    await this.prisma.feeSchedule.delete({ where: { id: feeSchedule.id } });
    return { success: true };
  }

  async listReinscriptionDeadlines(
    schoolId: string,
    query: ListReinscriptionDeadlinesQueryDto,
  ) {
    return this.prisma.reinscriptionDeadline.findMany({
      where: {
        schoolId,
        schoolYearId: query.schoolYearId,
        academicLevelId: query.academicLevelId,
      },
      include: {
        academicLevel: { select: { id: true, label: true, code: true } },
        schoolYear: { select: { id: true, label: true } },
      },
      orderBy: [{ schoolYearId: "asc" }, { academicLevelId: "asc" }],
    });
  }

  async upsertReinscriptionDeadline(
    schoolId: string,
    payload: UpsertReinscriptionDeadlineDto,
  ) {
    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: payload.schoolYearId, schoolId },
      select: { id: true },
    });
    if (!schoolYear) {
      throw new NotFoundException(
        "Annee scolaire introuvable pour cette ecole",
      );
    }

    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: {
        id: payload.academicLevelId,
        OR: [{ schoolId }, { schoolId: null }],
      },
      select: { id: true },
    });
    if (!academicLevel) {
      throw new NotFoundException(
        "Niveau academique introuvable pour cette ecole",
      );
    }

    const existing = await this.prisma.reinscriptionDeadline.findFirst({
      where: {
        schoolId,
        schoolYearId: payload.schoolYearId,
        academicLevelId: payload.academicLevelId,
      },
      select: { id: true },
    });

    if (existing) {
      return this.prisma.reinscriptionDeadline.update({
        where: { id: existing.id },
        data: { deadline: new Date(payload.deadline) },
      });
    }

    return this.prisma.reinscriptionDeadline.create({
      data: {
        schoolId,
        schoolYearId: payload.schoolYearId,
        academicLevelId: payload.academicLevelId,
        deadline: new Date(payload.deadline),
      },
    });
  }

  async deleteReinscriptionDeadline(schoolId: string, deadlineId: string) {
    const deadline = await this.prisma.reinscriptionDeadline.findFirst({
      where: { id: deadlineId, schoolId },
      select: { id: true },
    });
    if (!deadline) {
      throw new NotFoundException("Date limite introuvable");
    }
    await this.prisma.reinscriptionDeadline.delete({
      where: { id: deadline.id },
    });
    return { success: true };
  }

  private async resolveFeeScheduleForTarget(
    schoolId: string,
    schoolYearId: string,
    academicLevelId: string,
    trackId: string | null,
  ) {
    const feeSchedule = await this.prisma.feeSchedule.findFirst({
      where: { schoolId, schoolYearId, academicLevelId, trackId },
      include: { installments: { orderBy: { rank: "asc" } } },
    });

    if (!feeSchedule || feeSchedule.installments.length === 0) {
      throw new BadRequestException(
        "Aucun echeancier n'est defini pour le niveau/filiere cible de cet eleve sur cette annee",
      );
    }

    return feeSchedule;
  }

  /**
   * Le seuil de reinscription est un parametre d'ecole (School.reinscriptionThresholdPolicy) :
   * FIRST_INSTALLMENT (defaut) exige la 1ere tranche, FULL_PAYMENT exige la
   * totalite de l'echeancier. Centralise ici pour eviter que chaque appelant
   * reimplemente sa propre regle de seuil.
   */
  private async resolveReinscriptionThresholdAmount(
    schoolId: string,
    feeSchedule: { installments: { amount: number }[] },
  ): Promise<number> {
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { reinscriptionThresholdPolicy: true },
    });

    if (school.reinscriptionThresholdPolicy === "FULL_PAYMENT") {
      return feeSchedule.installments.reduce(
        (sum, installment) => sum + installment.amount,
        0,
      );
    }

    return feeSchedule.installments[0].amount;
  }

  async getStudentFinanceSummary(
    schoolId: string,
    studentId: string,
    targetSchoolYearId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) {
      throw new NotFoundException("Eleve introuvable");
    }

    const decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
      schoolId,
      studentId,
    );

    const feeSchedule = await this.resolveFeeScheduleForTarget(
      schoolId,
      targetSchoolYearId,
      decision.nextAcademicLevelId,
      decision.nextTrackId,
    );

    const totalPaid = await this.getTotalPaid(studentId, targetSchoolYearId);
    const thresholdAmount = await this.resolveReinscriptionThresholdAmount(
      schoolId,
      feeSchedule,
    );

    return {
      student,
      decision,
      feeSchedule,
      totalPaid,
      thresholdAmount,
      reinscriptionEligible: totalPaid >= thresholdAmount,
    };
  }

  /**
   * Aucun paiement n'est rattache explicitement a une echeance precise en base
   * (StudentPayment n'a pas de feeInstallmentId) : on reconstitue la
   * repartition par une cascade, tranche par tranche dans l'ordre des rangs,
   * chaque tranche consommant le solde restant du cumul paye avant que la
   * suivante ne soit entamee.
   */
  private allocateInstallments(
    installments: {
      id: string;
      rank: number;
      label: string;
      amount: number;
      dueDate: Date | null;
    }[],
    totalPaid: number,
  ) {
    let remainingPaid = totalPaid;
    const now = new Date();

    return installments.map((installment) => {
      const allocatedAmount = Math.max(
        0,
        Math.min(remainingPaid, installment.amount),
      );
      remainingPaid -= allocatedAmount;
      const remainingAmount = installment.amount - allocatedAmount;

      let status: "PAID" | "PARTIAL" | "UPCOMING" | "OVERDUE";
      if (remainingAmount <= 0) {
        status = "PAID";
      } else if (allocatedAmount > 0) {
        status = "PARTIAL";
      } else if (installment.dueDate && installment.dueDate < now) {
        status = "OVERDUE";
      } else {
        status = "UPCOMING";
      }

      return { ...installment, allocatedAmount, remainingAmount, status };
    });
  }

  async getStudentInstallmentBreakdown(
    schoolId: string,
    studentId: string,
    targetSchoolYearId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) {
      throw new NotFoundException("Eleve introuvable");
    }

    const decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
      schoolId,
      studentId,
    );

    const feeSchedule = await this.resolveFeeScheduleForTarget(
      schoolId,
      targetSchoolYearId,
      decision.nextAcademicLevelId,
      decision.nextTrackId,
    );

    const totalPaid = await this.getTotalPaid(studentId, targetSchoolYearId);
    const installments = this.allocateInstallments(
      feeSchedule.installments,
      totalPaid,
    );
    const totalAmount = feeSchedule.installments.reduce(
      (sum, installment) => sum + installment.amount,
      0,
    );

    return {
      student,
      schoolYearId: targetSchoolYearId,
      totalAmount,
      totalPaid,
      totalRemaining: Math.max(0, totalAmount - totalPaid),
      installments,
    };
  }

  async getMyChildInstallmentBreakdown(
    schoolId: string,
    parentUserId: string,
    studentId: string,
    schoolYearId: string,
  ) {
    const link = await this.prisma.parentStudent.findFirst({
      where: { schoolId, parentUserId, studentId },
      select: { id: true },
    });
    if (!link) {
      throw new BadRequestException("Cet eleve n'est pas rattache a ce parent");
    }

    return this.getStudentInstallmentBreakdown(
      schoolId,
      studentId,
      schoolYearId,
    );
  }

  private async getTotalPaid(
    studentId: string,
    schoolYearId: string,
  ): Promise<number> {
    const aggregate = await this.prisma.studentPayment.aggregate({
      where: { studentId, schoolYearId },
      _sum: { amount: true },
    });
    return aggregate._sum.amount ?? 0;
  }

  async recordDirectPayment(
    schoolId: string,
    payload: RecordDirectPaymentDto,
    recordedByUserId: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: payload.studentId, schoolId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException("Eleve introuvable");
    }

    // Regle metier : un paiement ne peut jamais preceder la decision du conseil
    // de classe pour cet eleve (voir EnrollmentsService.getConfirmedDecisionOrThrow).
    const decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
      schoolId,
      payload.studentId,
    );

    const feeSchedule = await this.resolveFeeScheduleForTarget(
      schoolId,
      payload.schoolYearId,
      decision.nextAcademicLevelId,
      decision.nextTrackId,
    );

    const payment = await this.prisma.studentPayment.create({
      data: {
        schoolId,
        schoolYearId: payload.schoolYearId,
        studentId: payload.studentId,
        amount: payload.amount,
        source: "DIRECT_CASH",
        recordedByUserId,
        paidAt: new Date(payload.paidAt),
        note: payload.note,
      },
    });

    const totalPaid = await this.getTotalPaid(
      payload.studentId,
      payload.schoolYearId,
    );
    const thresholdAmount = await this.resolveReinscriptionThresholdAmount(
      schoolId,
      feeSchedule,
    );
    let reinscriptionConfirmed = false;

    if (totalPaid >= thresholdAmount) {
      await this.enrollmentsService.confirmReinscription(
        schoolId,
        payload.studentId,
        payload.schoolYearId,
        "PAYMENT_THRESHOLD",
        recordedByUserId,
      );
      reinscriptionConfirmed = true;
    }

    return {
      payment,
      totalPaid,
      thresholdAmount,
      reinscriptionConfirmed,
    };
  }

  private async getOrCreateWallet(schoolId: string, parentUserId: string) {
    return this.prisma.wallet.upsert({
      where: { schoolId_parentUserId: { schoolId, parentUserId } },
      create: { schoolId, parentUserId },
      update: {},
    });
  }

  private async getWalletBalance(walletId: string): Promise<number> {
    const [topUps, allocations] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { walletId, type: "TOPUP" },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId, type: "ALLOCATION" },
        _sum: { amount: true },
      }),
    ]);
    return (topUps._sum.amount ?? 0) - (allocations._sum.amount ?? 0);
  }

  async topUpWallet(
    schoolId: string,
    parentUserId: string,
    amount: number,
    recordedByUserId: string,
    note?: string,
  ) {
    // Le depot dans le wallet est libre : il peut precede la decision du
    // conseil de classe (une famille peut provisionner a l'avance). Seule
    // l'affectation vers un eleve precis (payAndReinscribeFromWallet) exige
    // que la decision existe deja.
    const wallet = await this.getOrCreateWallet(schoolId, parentUserId);
    await this.prisma.walletTransaction.create({
      data: {
        schoolId,
        walletId: wallet.id,
        type: "TOPUP",
        amount,
        recordedByUserId,
        note,
      },
    });
    const balance = await this.getWalletBalance(wallet.id);
    return { walletId: wallet.id, balance };
  }

  /**
   * L'annee cible de reinscription n'est pas modelisee explicitement (une
   * SchoolYear n'a pas de "suivante"). On retient par convention l'annee la
   * plus recemment creee qui n'est pas l'annee active : en pratique, l'ecole
   * cree cette annee cible avant d'ouvrir la campagne de reinscription.
   */
  private async resolveLikelyNextSchoolYear(
    schoolId: string,
    activeSchoolYearId: string,
  ) {
    return this.prisma.schoolYear.findFirst({
      where: { schoolId, id: { not: activeSchoolYearId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, startsAt: true },
    });
  }

  async getWalletSummary(schoolId: string, parentUserId: string) {
    const wallet = await this.getOrCreateWallet(schoolId, parentUserId);
    const [balance, transactions, children] = await Promise.all([
      this.getWalletBalance(wallet.id),
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.parentStudent.findMany({
        where: { schoolId, parentUserId },
        select: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
        },
      }),
    ]);

    const childrenStatus = await Promise.all(
      children.map(async ({ student }) => {
        let decision;
        try {
          decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
            schoolId,
            student.id,
          );
        } catch {
          return {
            student,
            status: "DECISION_PENDING" as const,
          };
        }

        const previousEnrollment = await this.prisma.enrollment.findUnique({
          where: {
            schoolYearId_studentId: {
              schoolYearId: decision.sourceSchoolYearId,
              studentId: student.id,
            },
          },
          select: {
            class: { select: { name: true } },
            academicLevel: { select: { label: true } },
          },
        });
        const previousClassLabel = previousEnrollment?.class?.name ?? null;
        const previousLevelLabel =
          previousEnrollment?.academicLevel?.label ?? null;

        const nextAcademicLevel = await this.prisma.academicLevel.findUnique({
          where: { id: decision.nextAcademicLevelId },
          select: { label: true },
        });
        const nextAcademicLevelLabel = nextAcademicLevel?.label ?? null;

        const nextYear = await this.resolveLikelyNextSchoolYear(
          schoolId,
          decision.sourceSchoolYearId,
        );
        if (!nextYear) {
          // La decision du conseil de classe existe deja (l'eleve est promu
          // ou redouble) mais l'ecole n'a pas encore ouvert l'annee scolaire
          // suivante : distinct de DECISION_PENDING pour ne pas laisser croire
          // au parent que le conseil de classe n'a pas encore statue.
          return {
            student,
            status: "NEXT_YEAR_NOT_OPEN" as const,
            previousClassLabel,
            previousLevelLabel,
            nextAcademicLevelLabel,
          };
        }

        const existingEnrollment = await this.prisma.enrollment.findUnique({
          where: {
            schoolYearId_studentId: {
              schoolYearId: nextYear.id,
              studentId: student.id,
            },
          },
          select: { id: true },
        });
        if (existingEnrollment) {
          return {
            student,
            status: "ALREADY_REINSCRIBED" as const,
            targetSchoolYearId: nextYear.id,
            targetSchoolYearLabel: nextYear.label,
            targetSchoolYearStartsAt: nextYear.startsAt ?? null,
            previousClassLabel,
            previousLevelLabel,
            nextAcademicLevelLabel,
          };
        }

        let requiredAmount: number | null = null;
        try {
          const feeSchedule = await this.resolveFeeScheduleForTarget(
            schoolId,
            nextYear.id,
            decision.nextAcademicLevelId,
            decision.nextTrackId,
          );
          const totalPaid = await this.getTotalPaid(student.id, nextYear.id);
          const thresholdAmount =
            await this.resolveReinscriptionThresholdAmount(
              schoolId,
              feeSchedule,
            );
          requiredAmount = Math.max(0, thresholdAmount - totalPaid);
        } catch {
          // Pas d'echeancier defini pour ce niveau/filiere/annee : le parent
          // ne peut pas encore reinscrire depuis son wallet.
        }

        const reinscriptionDeadline =
          await this.prisma.reinscriptionDeadline.findUnique({
            where: {
              schoolYearId_academicLevelId: {
                schoolYearId: nextYear.id,
                academicLevelId: decision.nextAcademicLevelId,
              },
            },
            select: { deadline: true },
          });

        return {
          student,
          status: "READY_TO_REINSCRIBE" as const,
          targetSchoolYearId: nextYear.id,
          targetSchoolYearLabel: nextYear.label,
          targetSchoolYearStartsAt: nextYear.startsAt ?? null,
          requiredAmount,
          previousClassLabel,
          previousLevelLabel,
          nextAcademicLevelLabel,
          reinscriptionDeadline: reinscriptionDeadline?.deadline ?? null,
        };
      }),
    );

    return {
      walletId: wallet.id,
      balance,
      transactions,
      children: childrenStatus,
    };
  }

  /**
   * Nombre d'enfants d'un parent prets a etre reinscrits (seuil de paiement
   * atteignable, pas encore reinscrits) — utilise par BadgesService pour le
   * badge rouge du menu "Reinscription". Reutilise getWalletSummary plutot
   * que de dupliquer la resolution de statut par enfant.
   */
  async countChildrenReadyToReinscribe(
    schoolId: string,
    parentUserId: string,
  ): Promise<number> {
    const summary = await this.getWalletSummary(schoolId, parentUserId);
    return summary.children.filter(
      (child) => child.status === "READY_TO_REINSCRIBE",
    ).length;
  }

  async payAndReinscribeFromWallet(
    schoolId: string,
    parentUserId: string,
    studentId: string,
    schoolYearId: string,
  ) {
    const link = await this.prisma.parentStudent.findFirst({
      where: { schoolId, parentUserId, studentId },
      select: { id: true },
    });
    if (!link) {
      throw new BadRequestException("Cet eleve n'est pas rattache a ce parent");
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: { schoolYearId_studentId: { schoolYearId, studentId } },
      select: { id: true },
    });
    if (existingEnrollment) {
      throw new BadRequestException(
        "Cet eleve est deja reinscrit pour cette annee",
      );
    }

    // Regle metier : pas de paiement/affectation avant la decision du conseil.
    const decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
      schoolId,
      studentId,
    );

    const feeSchedule = await this.resolveFeeScheduleForTarget(
      schoolId,
      schoolYearId,
      decision.nextAcademicLevelId,
      decision.nextTrackId,
    );
    const thresholdAmount = await this.resolveReinscriptionThresholdAmount(
      schoolId,
      feeSchedule,
    );
    const alreadyPaid = await this.getTotalPaid(studentId, schoolYearId);
    const requiredAmount = thresholdAmount - alreadyPaid;

    if (requiredAmount <= 0) {
      await this.enrollmentsService.confirmReinscription(
        schoolId,
        studentId,
        schoolYearId,
        "PAYMENT_THRESHOLD",
        parentUserId,
      );
      return { requiredAmount: 0, reinscriptionConfirmed: true };
    }

    const wallet = await this.getOrCreateWallet(schoolId, parentUserId);
    const balance = await this.getWalletBalance(wallet.id);
    if (balance < requiredAmount) {
      throw new BadRequestException(
        "Solde du wallet insuffisant pour couvrir le seuil de reinscription",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const walletTransaction = await tx.walletTransaction.create({
        data: {
          schoolId,
          walletId: wallet.id,
          type: "ALLOCATION",
          amount: requiredAmount,
          studentId,
          recordedByUserId: parentUserId,
        },
      });
      await tx.studentPayment.create({
        data: {
          schoolId,
          schoolYearId,
          studentId,
          amount: requiredAmount,
          source: "WALLET_ALLOCATION",
          walletTransactionId: walletTransaction.id,
          recordedByUserId: parentUserId,
          paidAt: new Date(),
        },
      });
    });

    await this.enrollmentsService.confirmReinscription(
      schoolId,
      studentId,
      schoolYearId,
      "PAYMENT_THRESHOLD",
      parentUserId,
    );

    return { requiredAmount, reinscriptionConfirmed: true };
  }
}
