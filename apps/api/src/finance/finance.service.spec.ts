/**
 * Tests unitaires : FinanceService
 * - seuil de confirmation de reinscription (paiement direct partiel vs atteint)
 * - refus de paiement sans decision de conseil (regle Q4)
 * - wallet : top-up libre, non-double-debit sur payAndReinscribeFromWallet, solde insuffisant
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { FinanceService } from "./finance.service.js";

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const TARGET_YEAR_ID = "year-2026";
const LEVEL_ID = "level-ce2";

const DECISION = {
  sourceSchoolYearId: "year-2025",
  decision: "PROMOTED" as const,
  nextAcademicLevelId: LEVEL_ID,
  nextTrackId: null,
};

const FEE_SCHEDULE = {
  id: "fee-schedule-1",
  installments: [
    { id: "inst-1", rank: 1, label: "1ere echeance", amount: 50000 },
    { id: "inst-2", rank: 2, label: "2eme echeance", amount: 50000 },
  ],
};

const makePrismaMock = () => {
  const prisma: any = {
    school: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        reinscriptionThresholdPolicy: "FIRST_INSTALLMENT",
      }),
      update: jest.fn().mockResolvedValue({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      }),
    },
    student: { findFirst: jest.fn().mockResolvedValue({ id: STUDENT_ID }) },
    schoolYear: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: TARGET_YEAR_ID, label: "2026-2027" }),
    },
    academicLevel: { findFirst: jest.fn().mockResolvedValue({ id: LEVEL_ID }) },
    feeSchedule: {
      findFirst: jest.fn().mockResolvedValue(FEE_SCHEDULE),
      findUniqueOrThrow: jest.fn(),
    },
    feeInstallment: { deleteMany: jest.fn(), createMany: jest.fn() },
    studentPayment: {
      create: jest.fn().mockResolvedValue({ id: "payment-1" }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    wallet: {
      upsert: jest.fn().mockResolvedValue({ id: "wallet-1" }),
    },
    walletTransaction: {
      create: jest.fn().mockResolvedValue({ id: "wtx-1" }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    parentStudent: {
      findFirst: jest.fn().mockResolvedValue({ id: "link-1" }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    enrollment: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg),
    ),
  };
  return prisma;
};

describe("FinanceService", () => {
  let service: FinanceService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let enrollmentsService: {
    getConfirmedDecisionOrThrow: jest.Mock;
    confirmReinscription: jest.Mock;
  };

  beforeEach(async () => {
    prisma = makePrismaMock();
    enrollmentsService = {
      getConfirmedDecisionOrThrow: jest.fn().mockResolvedValue(DECISION),
      confirmReinscription: jest.fn().mockResolvedValue({ id: "enr-1" }),
    };

    const module = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();
    service = module.get(FinanceService);
  });

  describe("recordDirectPayment", () => {
    const payload = {
      studentId: STUDENT_ID,
      schoolYearId: TARGET_YEAR_ID,
      amount: 20000,
      paidAt: "2026-06-01",
    };

    it("refuse le paiement si aucune decision de conseil n'existe pour l'eleve", async () => {
      enrollmentsService.getConfirmedDecisionOrThrow.mockRejectedValue(
        new BadRequestException("Aucune decision"),
      );
      await expect(
        service.recordDirectPayment(SCHOOL_ID, payload, "accountant-1"),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.studentPayment.create).not.toHaveBeenCalled();
    });

    it("refuse si aucun echeancier n'est defini pour le niveau/filiere cible", async () => {
      prisma.feeSchedule.findFirst.mockResolvedValue(null);
      await expect(
        service.recordDirectPayment(SCHOOL_ID, payload, "accountant-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("enregistre le paiement mais ne confirme pas la reinscription si le seuil n'est pas atteint", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 20000 },
      });
      const result = await service.recordDirectPayment(
        SCHOOL_ID,
        payload,
        "accountant-1",
      );
      expect(result.reinscriptionConfirmed).toBe(false);
      expect(enrollmentsService.confirmReinscription).not.toHaveBeenCalled();
    });

    it("confirme la reinscription automatiquement des que le cumul atteint la 1ere echeance", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      const result = await service.recordDirectPayment(
        SCHOOL_ID,
        payload,
        "accountant-1",
      );
      expect(result.reinscriptionConfirmed).toBe(true);
      expect(enrollmentsService.confirmReinscription).toHaveBeenCalledWith(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
        "PAYMENT_THRESHOLD",
        "accountant-1",
      );
    });
  });

  describe("payAndReinscribeFromWallet", () => {
    it("refuse si l'eleve n'est pas rattache a ce parent", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);
      await expect(
        service.payAndReinscribeFromWallet(
          SCHOOL_ID,
          "parent-1",
          STUDENT_ID,
          TARGET_YEAR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse (double-clic) si l'eleve est deja reinscrit pour cette annee", async () => {
      prisma.enrollment.findUnique.mockResolvedValue({ id: "already-there" });
      await expect(
        service.payAndReinscribeFromWallet(
          SCHOOL_ID,
          "parent-1",
          STUDENT_ID,
          TARGET_YEAR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it("refuse sans decision de conseil, meme si le wallet est suffisamment approvisionne", async () => {
      enrollmentsService.getConfirmedDecisionOrThrow.mockRejectedValue(
        new BadRequestException("Aucune decision"),
      );
      await expect(
        service.payAndReinscribeFromWallet(
          SCHOOL_ID,
          "parent-1",
          STUDENT_ID,
          TARGET_YEAR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse si le solde du wallet est insuffisant", async () => {
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      }); // TOPUP puis ALLOCATION -> solde 0
      await expect(
        service.payAndReinscribeFromWallet(
          SCHOOL_ID,
          "parent-1",
          STUDENT_ID,
          TARGET_YEAR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it("debite exactement le montant requis et confirme la reinscription en un seul geste", async () => {
      // Solde wallet : 50000 de TOPUP, 0 d'ALLOCATION deja consommee.
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // TOPUP
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // ALLOCATION

      const result = await service.payAndReinscribeFromWallet(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
        TARGET_YEAR_ID,
      );

      expect(result).toEqual({
        requiredAmount: 50000,
        reinscriptionConfirmed: true,
      });
      expect(prisma.walletTransaction.create).toHaveBeenCalledTimes(1);
      expect(prisma.studentPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: "WALLET_ALLOCATION",
            amount: 50000,
          }),
        }),
      );
      expect(enrollmentsService.confirmReinscription).toHaveBeenCalledWith(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
        "PAYMENT_THRESHOLD",
        "parent-1",
      );
    });

    it("ne debite rien de plus si la premiere echeance est deja soldee par un paiement direct anterieur", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      const result = await service.payAndReinscribeFromWallet(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
        TARGET_YEAR_ID,
      );
      expect(result).toEqual({
        requiredAmount: 0,
        reinscriptionConfirmed: true,
      });
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe("topUpWallet", () => {
    it("credite le wallet sans exiger de decision de conseil (depot libre a tout moment)", async () => {
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 30000 } }) // TOPUP
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // ALLOCATION
      const result = await service.topUpWallet(
        SCHOOL_ID,
        "parent-1",
        30000,
        "parent-1",
      );
      expect(
        enrollmentsService.getConfirmedDecisionOrThrow,
      ).not.toHaveBeenCalled();
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: "TOPUP", amount: 30000 }),
        }),
      );
      expect(result.balance).toBe(30000);
    });
  });

  describe("upsertFeeSchedule", () => {
    it("refuse des rangs d'echeance dupliques", async () => {
      await expect(
        service.upsertFeeSchedule(SCHOOL_ID, {
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: LEVEL_ID,
          installments: [
            { rank: 1, label: "A", amount: 1000 },
            { rank: 1, label: "B", amount: 2000 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse un echeancier sans aucune echeance", async () => {
      await expect(
        service.upsertFeeSchedule(SCHOOL_ID, {
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: LEVEL_ID,
          installments: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("leve une NotFoundException si le niveau academique n'existe pas pour cette ecole", async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(null);
      await expect(
        service.upsertFeeSchedule(SCHOOL_ID, {
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: "ghost-level",
          installments: [{ rank: 1, label: "A", amount: 1000 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getWalletSummary", () => {
    beforeEach(() => {
      prisma.parentStudent.findMany.mockResolvedValue([
        { student: { id: STUDENT_ID, firstName: "Remi", lastName: "Ntamack" } },
      ]);
    });

    it("marque l'enfant DECISION_PENDING si aucune decision de conseil n'existe", async () => {
      enrollmentsService.getConfirmedDecisionOrThrow.mockRejectedValue(
        new BadRequestException("Aucune decision"),
      );
      const result = await service.getWalletSummary(SCHOOL_ID, "parent-1");
      expect(result.children).toEqual([
        {
          student: { id: STUDENT_ID, firstName: "Remi", lastName: "Ntamack" },
          status: "DECISION_PENDING",
        },
      ]);
    });

    it("marque l'enfant NEXT_YEAR_NOT_OPEN si la decision existe mais qu'aucune annee suivante n'a ete creee", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue(null);
      const result = await service.getWalletSummary(SCHOOL_ID, "parent-1");
      expect(result.children).toEqual([
        {
          student: { id: STUDENT_ID, firstName: "Remi", lastName: "Ntamack" },
          status: "NEXT_YEAR_NOT_OPEN",
        },
      ]);
    });

    it("marque l'enfant ALREADY_REINSCRIBED si une inscription existe deja pour l'annee cible", async () => {
      prisma.enrollment.findUnique.mockResolvedValue({ id: "enr-existing" });
      const result = await service.getWalletSummary(SCHOOL_ID, "parent-1");
      expect(result.children[0]).toMatchObject({
        status: "ALREADY_REINSCRIBED",
        targetSchoolYearId: TARGET_YEAR_ID,
      });
    });

    it("calcule le montant restant du pour un enfant pret a etre reinscrit", async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 20000 },
      });
      const result = await service.getWalletSummary(SCHOOL_ID, "parent-1");
      expect(result.children[0]).toMatchObject({
        status: "READY_TO_REINSCRIBE",
        targetSchoolYearId: TARGET_YEAR_ID,
        requiredAmount: 30000,
      });
    });

    it("calcule le montant restant du sur la totalite de l'echeancier quand la politique de l'ecole est FULL_PAYMENT", async () => {
      prisma.school.findUniqueOrThrow.mockResolvedValue({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 60000 },
      });
      const result = await service.getWalletSummary(SCHOOL_ID, "parent-1");
      // Echeancier total = 50000 + 50000 = 100000, deja paye 60000 -> reste 40000
      expect(result.children[0]).toMatchObject({
        status: "READY_TO_REINSCRIBE",
        requiredAmount: 40000,
      });
    });
  });

  describe("politique de seuil de reinscription (School.reinscriptionThresholdPolicy)", () => {
    it("recordDirectPayment n'exige que la 1ere echeance quand la politique est FIRST_INSTALLMENT (defaut)", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      const result = await service.recordDirectPayment(
        SCHOOL_ID,
        {
          studentId: STUDENT_ID,
          schoolYearId: TARGET_YEAR_ID,
          amount: 50000,
          paidAt: "2026-06-01",
        },
        "accountant-1",
      );
      expect(result.thresholdAmount).toBe(50000);
      expect(result.reinscriptionConfirmed).toBe(true);
    });

    it("recordDirectPayment exige la totalite de l'echeancier quand la politique est FULL_PAYMENT", async () => {
      prisma.school.findUniqueOrThrow.mockResolvedValue({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      const result = await service.recordDirectPayment(
        SCHOOL_ID,
        {
          studentId: STUDENT_ID,
          schoolYearId: TARGET_YEAR_ID,
          amount: 50000,
          paidAt: "2026-06-01",
        },
        "accountant-1",
      );
      expect(result.thresholdAmount).toBe(100000);
      expect(result.reinscriptionConfirmed).toBe(false);
      expect(enrollmentsService.confirmReinscription).not.toHaveBeenCalled();
    });

    it("payAndReinscribeFromWallet debite la totalite de l'echeancier quand la politique est FULL_PAYMENT", async () => {
      prisma.school.findUniqueOrThrow.mockResolvedValue({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100000 } }) // TOPUP
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // ALLOCATION

      const result = await service.payAndReinscribeFromWallet(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
        TARGET_YEAR_ID,
      );

      expect(result).toEqual({
        requiredAmount: 100000,
        reinscriptionConfirmed: true,
      });
    });

    it("getFinanceSettings retourne la politique courante de l'ecole", async () => {
      prisma.school.findUniqueOrThrow.mockResolvedValue({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
      const result = await service.getFinanceSettings(SCHOOL_ID);
      expect(result).toEqual({ reinscriptionThresholdPolicy: "FULL_PAYMENT" });
    });

    it("updateFinanceSettings persiste la nouvelle politique", async () => {
      const result = await service.updateFinanceSettings(SCHOOL_ID, {
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
      expect(prisma.school.update).toHaveBeenCalledWith({
        where: { id: SCHOOL_ID },
        data: { reinscriptionThresholdPolicy: "FULL_PAYMENT" },
        select: { reinscriptionThresholdPolicy: true },
      });
      expect(result).toEqual({ reinscriptionThresholdPolicy: "FULL_PAYMENT" });
    });
  });

  describe("cascade d'allocation des paiements par echeance", () => {
    const PAST_DATE = new Date("2020-01-01");
    const FUTURE_DATE = new Date("2099-01-01");

    const SCHEDULE_WITH_DUE_DATES = {
      id: "fee-schedule-1",
      installments: [
        {
          id: "inst-1",
          rank: 1,
          label: "1ere echeance",
          amount: 50000,
          dueDate: PAST_DATE,
        },
        {
          id: "inst-2",
          rank: 2,
          label: "2eme echeance",
          amount: 30000,
          dueDate: FUTURE_DATE,
        },
        {
          id: "inst-3",
          rank: 3,
          label: "3eme echeance",
          amount: 20000,
          dueDate: FUTURE_DATE,
        },
      ],
    };

    beforeEach(() => {
      prisma.feeSchedule.findFirst.mockResolvedValue(SCHEDULE_WITH_DUE_DATES);
    });

    it("aucun paiement : la 1ere echeance passee est OVERDUE, les suivantes UPCOMING", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      const result = await service.getStudentInstallmentBreakdown(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
      );
      expect(result.totalAmount).toBe(100000);
      expect(result.totalPaid).toBe(0);
      expect(result.totalRemaining).toBe(100000);
      expect(result.installments).toEqual([
        expect.objectContaining({
          id: "inst-1",
          allocatedAmount: 0,
          remainingAmount: 50000,
          status: "OVERDUE",
        }),
        expect.objectContaining({
          id: "inst-2",
          allocatedAmount: 0,
          remainingAmount: 30000,
          status: "UPCOMING",
        }),
        expect.objectContaining({
          id: "inst-3",
          allocatedAmount: 0,
          remainingAmount: 20000,
          status: "UPCOMING",
        }),
      ]);
    });

    it("paiement partiel : consomme la 1ere echeance en priorite avant d'entamer la 2eme", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 60000 },
      });
      const result = await service.getStudentInstallmentBreakdown(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
      );
      expect(result.installments).toEqual([
        expect.objectContaining({
          id: "inst-1",
          allocatedAmount: 50000,
          remainingAmount: 0,
          status: "PAID",
        }),
        expect.objectContaining({
          id: "inst-2",
          allocatedAmount: 10000,
          remainingAmount: 20000,
          status: "PARTIAL",
        }),
        expect.objectContaining({
          id: "inst-3",
          allocatedAmount: 0,
          remainingAmount: 20000,
          status: "UPCOMING",
        }),
      ]);
    });

    it("paiement integral : toutes les echeances sont PAID", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 100000 },
      });
      const result = await service.getStudentInstallmentBreakdown(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
      );
      expect(result.totalRemaining).toBe(0);
      expect(result.installments.every((i) => i.status === "PAID")).toBe(true);
    });

    it("getMyChildInstallmentBreakdown refuse si l'eleve n'est pas rattache a ce parent", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);
      await expect(
        service.getMyChildInstallmentBreakdown(
          SCHOOL_ID,
          "parent-1",
          STUDENT_ID,
          TARGET_YEAR_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("getMyChildInstallmentBreakdown delegue a la cascade quand le lien parent existe", async () => {
      prisma.studentPayment.aggregate.mockResolvedValue({
        _sum: { amount: 100000 },
      });
      const result = await service.getMyChildInstallmentBreakdown(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
        TARGET_YEAR_ID,
      );
      expect(result.totalRemaining).toBe(0);
    });
  });
});
