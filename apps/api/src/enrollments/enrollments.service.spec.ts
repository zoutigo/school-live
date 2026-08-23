/**
 * Tests unitaires : EnrollmentsService
 * - resolution de la decision de conseil de classe (annee active, TERM_3)
 * - confirmReinscription : idempotence, niveau/filiere repris de la decision
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "./enrollments.service.js";

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const SOURCE_YEAR_ID = "year-2025";
const TARGET_YEAR_ID = "year-2026";
const NEXT_LEVEL_ID = "level-ce2";

const makePrismaMock = () => ({
  school: {
    findUnique: jest
      .fn()
      .mockResolvedValue({ activeSchoolYearId: SOURCE_YEAR_ID }),
  },
  studentTermReport: {
    findFirst: jest.fn(),
  },
  enrollment: {
    findUnique: jest.fn(),
    create: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: "enr-1", ...data }),
      ),
  },
  schoolYear: {
    findFirst: jest.fn().mockResolvedValue({ id: TARGET_YEAR_ID }),
    upsert: jest
      .fn()
      .mockImplementation(({ create }) =>
        Promise.resolve({ id: "next-year-created", ...create }),
      ),
  },
  feeSchedule: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
  supplyList: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
  reinscriptionDeadline: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  },
});

describe("EnrollmentsService", () => {
  let service: EnrollmentsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(EnrollmentsService);
  });

  describe("getActiveSchoolYearIdOrThrow", () => {
    it("leve une BadRequestException si l'ecole n'a pas d'annee active", async () => {
      prisma.school.findUnique.mockResolvedValue({ activeSchoolYearId: null });
      await expect(
        service.getActiveSchoolYearIdOrThrow(SCHOOL_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getConfirmedDecisionOrThrow", () => {
    it("leve une BadRequestException si aucune decision n'existe (Q4 : pas de paiement sans decision)", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue(null);
      await expect(
        service.getConfirmedDecisionOrThrow(SCHOOL_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it("leve une BadRequestException si la decision est LEFT", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        decision: "LEFT",
        nextAcademicLevelId: null,
        nextTrackId: null,
      });
      await expect(
        service.getConfirmedDecisionOrThrow(SCHOOL_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it("leve une BadRequestException si PROMOTED sans niveau cible", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        decision: "PROMOTED",
        nextAcademicLevelId: null,
        nextTrackId: null,
      });
      await expect(
        service.getConfirmedDecisionOrThrow(SCHOOL_ID, STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it("retourne la decision avec le niveau/filiere cible quand elle est valide", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        decision: "PROMOTED",
        nextAcademicLevelId: NEXT_LEVEL_ID,
        nextTrackId: null,
      });
      const result = await service.getConfirmedDecisionOrThrow(
        SCHOOL_ID,
        STUDENT_ID,
      );
      expect(result).toEqual({
        sourceSchoolYearId: SOURCE_YEAR_ID,
        decision: "PROMOTED",
        nextAcademicLevelId: NEXT_LEVEL_ID,
        nextTrackId: null,
      });
    });
  });

  describe("confirmReinscription", () => {
    it("est idempotente : ne recree rien si une inscription existe deja pour cette annee", async () => {
      prisma.enrollment.findUnique.mockResolvedValue({ id: "existing-enr" });
      const result = await service.confirmReinscription(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
        "MANUAL",
      );
      expect(result).toEqual({ id: "existing-enr" });
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it("leve une NotFoundException si l'annee cible n'existe pas pour cette ecole", async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.schoolYear.findFirst.mockResolvedValue(null);
      await expect(
        service.confirmReinscription(
          SCHOOL_ID,
          STUDENT_ID,
          TARGET_YEAR_ID,
          "MANUAL",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("cree l'inscription en attente (classId null) avec le niveau de la decision", async () => {
      prisma.enrollment.findUnique.mockResolvedValue(null);
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        decision: "PROMOTED",
        nextAcademicLevelId: NEXT_LEVEL_ID,
        nextTrackId: null,
      });

      const result = await service.confirmReinscription(
        SCHOOL_ID,
        STUDENT_ID,
        TARGET_YEAR_ID,
        "PAYMENT_THRESHOLD",
        "accountant-1",
      );

      expect(prisma.enrollment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: SCHOOL_ID,
          schoolYearId: TARGET_YEAR_ID,
          studentId: STUDENT_ID,
          classId: null,
          academicLevelId: NEXT_LEVEL_ID,
          trackId: null,
          confirmationSource: "PAYMENT_THRESHOLD",
          confirmedByUserId: "accountant-1",
        }),
      });
      expect(result).toMatchObject({
        classId: null,
        academicLevelId: NEXT_LEVEL_ID,
      });
    });
  });

  describe("ensureNextSchoolYearExists", () => {
    it("leve une NotFoundException si l'annee source est introuvable pour cette ecole", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue(null);
      await expect(
        service.ensureNextSchoolYearExists(SCHOOL_ID, SOURCE_YEAR_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("upsert l'annee suivante en incrementant le libelle source, sans l'activer", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue({ label: "2025-2026" });
      const result = await service.ensureNextSchoolYearExists(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
      );
      expect(prisma.schoolYear.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId_label: { schoolId: SCHOOL_ID, label: "2026-2027" },
          },
          create: { schoolId: SCHOOL_ID, label: "2026-2027" },
          update: {},
        }),
      );
      expect(result).toMatchObject({ label: "2026-2027" });
    });

    it("est idempotente : rappeler deux fois n'ecrit rien de plus que l'upsert (contrainte unique)", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue({ label: "2025-2026" });
      await service.ensureNextSchoolYearExists(SCHOOL_ID, SOURCE_YEAR_ID);
      await service.ensureNextSchoolYearExists(SCHOOL_ID, SOURCE_YEAR_ID);
      expect(prisma.schoolYear.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.schoolYear.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            schoolId_label: { schoolId: SCHOOL_ID, label: "2026-2027" },
          },
        }),
      );
      expect(prisma.schoolYear.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            schoolId_label: { schoolId: SCHOOL_ID, label: "2026-2027" },
          },
        }),
      );
    });
  });

  describe("provisionFeeSchedulesForNewYear", () => {
    it("ne fait rien si annee source et annee cible sont identiques", async () => {
      await service.provisionFeeSchedulesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        SOURCE_YEAR_ID,
      );
      expect(prisma.feeSchedule.findMany).not.toHaveBeenCalled();
    });

    it("copie chaque echeancier de l'annee source vers l'annee cible avec les dates decalees d'un an", async () => {
      prisma.feeSchedule.findMany.mockResolvedValue([
        {
          id: "fee-src-1",
          academicLevelId: "level-ce2",
          trackId: null,
          installments: [
            {
              rank: 1,
              label: "1ere echeance",
              amount: 50000,
              dueDate: new Date("2025-10-01T00:00:00.000Z"),
            },
            {
              rank: 2,
              label: "2eme echeance",
              amount: 30000,
              dueDate: null,
            },
          ],
        },
      ]);
      prisma.feeSchedule.findFirst.mockResolvedValue(null);

      await service.provisionFeeSchedulesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.feeSchedule.create).toHaveBeenCalledWith({
        data: {
          schoolId: SCHOOL_ID,
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: "level-ce2",
          trackId: null,
          installments: {
            create: [
              {
                schoolId: SCHOOL_ID,
                rank: 1,
                label: "1ere echeance",
                amount: 50000,
                dueDate: new Date("2026-10-01T00:00:00.000Z"),
              },
              {
                schoolId: SCHOOL_ID,
                rank: 2,
                label: "2eme echeance",
                amount: 30000,
                dueDate: null,
              },
            ],
          },
        },
      });
    });

    it("est idempotente : ne recree rien si un echeancier existe deja pour ce niveau sur l'annee cible", async () => {
      prisma.feeSchedule.findMany.mockResolvedValue([
        {
          id: "fee-src-1",
          academicLevelId: "level-ce2",
          trackId: null,
          installments: [],
        },
      ]);
      prisma.feeSchedule.findFirst.mockResolvedValue({ id: "already-there" });

      await service.provisionFeeSchedulesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.feeSchedule.create).not.toHaveBeenCalled();
    });
  });

  describe("provisionSupplyListsForNewYear", () => {
    it("ne fait rien si annee source et annee cible sont identiques", async () => {
      await service.provisionSupplyListsForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        SOURCE_YEAR_ID,
      );
      expect(prisma.supplyList.findMany).not.toHaveBeenCalled();
    });

    it("copie chaque liste de fournitures de l'annee source vers l'annee cible", async () => {
      prisma.supplyList.findMany.mockResolvedValue([
        {
          id: "supply-src-1",
          academicLevelId: "level-ce2",
          trackId: null,
          items: [
            { rank: 1, label: "Cahier 100 pages", quantity: 3, note: null },
          ],
        },
      ]);
      prisma.supplyList.findFirst.mockResolvedValue(null);

      await service.provisionSupplyListsForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.supplyList.create).toHaveBeenCalledWith({
        data: {
          schoolId: SCHOOL_ID,
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: "level-ce2",
          trackId: null,
          items: {
            create: [
              {
                schoolId: SCHOOL_ID,
                rank: 1,
                label: "Cahier 100 pages",
                quantity: 3,
                note: null,
              },
            ],
          },
        },
      });
    });

    it("est idempotente : ne recree rien si une liste existe deja pour ce niveau sur l'annee cible", async () => {
      prisma.supplyList.findMany.mockResolvedValue([
        {
          id: "supply-src-1",
          academicLevelId: "level-ce2",
          trackId: null,
          items: [],
        },
      ]);
      prisma.supplyList.findFirst.mockResolvedValue({ id: "already-there" });

      await service.provisionSupplyListsForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.supplyList.create).not.toHaveBeenCalled();
    });
  });

  describe("provisionReinscriptionDeadlinesForNewYear", () => {
    it("ne fait rien si annee source et annee cible sont identiques", async () => {
      await service.provisionReinscriptionDeadlinesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        SOURCE_YEAR_ID,
      );
      expect(prisma.reinscriptionDeadline.findMany).not.toHaveBeenCalled();
    });

    it("copie chaque deadline de l'annee source vers l'annee cible en decalant la date d'un an", async () => {
      prisma.reinscriptionDeadline.findMany.mockResolvedValue([
        {
          id: "deadline-src-1",
          academicLevelId: "level-ce2",
          deadline: new Date("2025-07-15T00:00:00.000Z"),
        },
      ]);
      prisma.reinscriptionDeadline.findFirst.mockResolvedValue(null);

      await service.provisionReinscriptionDeadlinesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.reinscriptionDeadline.create).toHaveBeenCalledWith({
        data: {
          schoolId: SCHOOL_ID,
          schoolYearId: TARGET_YEAR_ID,
          academicLevelId: "level-ce2",
          deadline: new Date("2026-07-15T00:00:00.000Z"),
        },
      });
    });

    it("est idempotente : ne recree rien si une deadline existe deja pour ce niveau sur l'annee cible", async () => {
      prisma.reinscriptionDeadline.findMany.mockResolvedValue([
        {
          id: "deadline-src-1",
          academicLevelId: "level-ce2",
          deadline: new Date("2025-07-15T00:00:00.000Z"),
        },
      ]);
      prisma.reinscriptionDeadline.findFirst.mockResolvedValue({
        id: "already-there",
      });

      await service.provisionReinscriptionDeadlinesForNewYear(
        SCHOOL_ID,
        SOURCE_YEAR_ID,
        TARGET_YEAR_ID,
      );

      expect(prisma.reinscriptionDeadline.create).not.toHaveBeenCalled();
    });
  });
});
