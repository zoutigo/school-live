/**
 * Tests unitaires : SupplyListsService
 * - CRUD echeancier de fournitures (upsert idempotent par niveau/filiere/annee)
 * - securite : un parent ne peut lire la liste que de son propre enfant
 * - la liste exposee au parent est scopee au niveau CIBLE (decision du
 *   conseil de classe), pas au niveau actuel de l'eleve
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { SupplyListsService } from "./supply-lists.service.js";

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

const makePrismaMock = () => {
  const prisma: any = {
    schoolYear: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: TARGET_YEAR_ID, label: "2026-2027" }),
    },
    academicLevel: { findFirst: jest.fn().mockResolvedValue({ id: LEVEL_ID }) },
    supplyList: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      delete: jest.fn(),
    },
    supplyItem: { deleteMany: jest.fn(), createMany: jest.fn() },
    parentStudent: {
      findFirst: jest.fn().mockResolvedValue({ id: "link-1" }),
    },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg),
    ),
  };
  return prisma;
};

describe("SupplyListsService", () => {
  let service: SupplyListsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let enrollmentsService: { getConfirmedDecisionOrThrow: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    enrollmentsService = {
      getConfirmedDecisionOrThrow: jest.fn().mockResolvedValue(DECISION),
    };

    const module = await Test.createTestingModule({
      providers: [
        SupplyListsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();
    service = module.get(SupplyListsService);
  });

  describe("upsertSupplyList", () => {
    const payload = {
      schoolYearId: TARGET_YEAR_ID,
      academicLevelId: LEVEL_ID,
      items: [
        { rank: 1, label: "Cahier 100 pages", quantity: 3 },
        { rank: 2, label: "Stylo bleu", quantity: 5 },
      ],
    };

    it("refuse des rangs d'article dupliques", async () => {
      await expect(
        service.upsertSupplyList(SCHOOL_ID, {
          ...payload,
          items: [
            { rank: 1, label: "A", quantity: 1 },
            { rank: 1, label: "B", quantity: 1 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse une annee scolaire introuvable pour cette ecole", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue(null);
      await expect(
        service.upsertSupplyList(SCHOOL_ID, payload),
      ).rejects.toThrow(NotFoundException);
    });

    it("cree une nouvelle liste avec ses articles quand aucune n'existe pour ce niveau/annee", async () => {
      prisma.supplyList.create.mockResolvedValue({ id: "list-1" });
      prisma.supplyList.findUniqueOrThrow.mockResolvedValue({
        id: "list-1",
        items: payload.items,
      });
      await service.upsertSupplyList(SCHOOL_ID, payload);
      expect(prisma.supplyList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: SCHOOL_ID,
            schoolYearId: TARGET_YEAR_ID,
            academicLevelId: LEVEL_ID,
          }),
        }),
      );
      expect(prisma.supplyItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ label: "Cahier 100 pages", quantity: 3 }),
          ]),
        }),
      );
    });

    it("remplace les articles d'une liste existante plutot que d'en creer une seconde", async () => {
      prisma.supplyList.findFirst.mockResolvedValue({ id: "list-existing" });
      prisma.supplyList.findUniqueOrThrow.mockResolvedValue({
        id: "list-existing",
        items: payload.items,
      });
      await service.upsertSupplyList(SCHOOL_ID, payload);
      expect(prisma.supplyList.create).not.toHaveBeenCalled();
      expect(prisma.supplyItem.deleteMany).toHaveBeenCalledWith({
        where: { supplyListId: "list-existing" },
      });
    });
  });

  describe("getMyChildSupplyList", () => {
    it("refuse si l'eleve n'est pas rattache a ce parent", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);
      await expect(
        service.getMyChildSupplyList(SCHOOL_ID, "parent-1", STUDENT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it("retourne une liste vide si aucune annee suivante n'est encore ouverte", async () => {
      prisma.schoolYear.findFirst.mockResolvedValue(null);
      const result = await service.getMyChildSupplyList(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
      );
      expect(result).toEqual({ targetSchoolYearId: null, items: [] });
    });

    it("retourne les articles de la liste scopee au niveau CIBLE de la decision, pas au niveau actuel", async () => {
      prisma.supplyList.findFirst.mockResolvedValue({
        id: "list-1",
        items: [{ id: "item-1", rank: 1, label: "Cahier", quantity: 3 }],
      });
      const result = await service.getMyChildSupplyList(
        SCHOOL_ID,
        "parent-1",
        STUDENT_ID,
      );
      expect(prisma.supplyList.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            academicLevelId: LEVEL_ID,
            schoolYearId: TARGET_YEAR_ID,
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.targetSchoolYearId).toBe(TARGET_YEAR_ID);
    });
  });
});
