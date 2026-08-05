/**
 * Tests unitaires : PromotionsService
 * - decision du conseil de classe : uniquement sur TERM_3, niveau cible requis sauf LEFT
 * - liste d'attente d'affectation (classId null)
 * - affectation a une classe definitive : capacite, classe deja affectee, classe hors annee
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { PromotionsService } from "./promotions.service.js";

const SCHOOL_ID = "school-1";
const YEAR_ID = "year-2026";
const CLASS_ID = "class-target";

const makePrismaMock = () => ({
  class: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  studentTermReport: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: "report-1", ...data }),
      ),
  },
  enrollment: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id: "enr-1", ...data }),
      ),
    count: jest.fn().mockResolvedValue(0),
  },
});

describe("PromotionsService", () => {
  let service: PromotionsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let enrollmentsService: { confirmReinscription: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    enrollmentsService = { confirmReinscription: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();
    service = module.get(PromotionsService);
  });

  describe("setTermReportDecision", () => {
    it("leve NotFoundException si le bulletin n'existe pas", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue(null);
      await expect(
        service.setTermReportDecision(
          SCHOOL_ID,
          "ghost",
          { decision: "PROMOTED", nextAcademicLevelId: "level-1" },
          "admin-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse une decision sur un bulletin qui n'est pas du dernier trimestre", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_1",
      });
      await expect(
        service.setTermReportDecision(
          SCHOOL_ID,
          "report-1",
          { decision: "PROMOTED", nextAcademicLevelId: "level-1" },
          "admin-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse PROMOTED/REPEATED sans niveau cible (necessaire pour couvrir les niveaux terminaux)", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
      });
      await expect(
        service.setTermReportDecision(
          SCHOOL_ID,
          "report-1",
          { decision: "PROMOTED" },
          "admin-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("accepte LEFT sans niveau cible et efface tout niveau/filiere precedemment saisis", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
      });
      const result = await service.setTermReportDecision(
        SCHOOL_ID,
        "report-1",
        { decision: "LEFT", nextAcademicLevelId: "level-1" },
        "admin-1",
      );
      expect(result).toMatchObject({
        decision: "LEFT",
        nextAcademicLevelId: null,
        nextTrackId: null,
      });
    });
  });

  describe("assignEnrollmentToClass", () => {
    it("leve NotFoundException si l'inscription n'existe pas", async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.assignEnrollmentToClass(SCHOOL_ID, "ghost", {
          classId: CLASS_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse si l'eleve est deja affecte a une classe", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        schoolYearId: YEAR_ID,
        classId: "already-assigned",
      });
      await expect(
        service.assignEnrollmentToClass(SCHOOL_ID, "enr-1", {
          classId: CLASS_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse une classe cible qui n'appartient pas a l'annee scolaire de l'inscription", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        schoolYearId: YEAR_ID,
        classId: null,
      });
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(
        service.assignEnrollmentToClass(SCHOOL_ID, "enr-1", {
          classId: CLASS_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse l'affectation au-dela de la capacite de la classe", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        schoolYearId: YEAR_ID,
        classId: null,
      });
      prisma.class.findFirst.mockResolvedValue({ id: CLASS_ID });
      prisma.class.findUnique.mockResolvedValue({
        name: "CE2 A",
        capacity: 30,
      });
      prisma.enrollment.count.mockResolvedValue(30);

      await expect(
        service.assignEnrollmentToClass(SCHOOL_ID, "enr-1", {
          classId: CLASS_ID,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.enrollment.update).not.toHaveBeenCalled();
    });

    it("affecte l'eleve quand la classe a de la place disponible", async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: "enr-1",
        schoolYearId: YEAR_ID,
        classId: null,
      });
      prisma.class.findFirst.mockResolvedValue({ id: CLASS_ID });
      prisma.class.findUnique.mockResolvedValue({
        name: "CE2 A",
        capacity: 30,
      });
      prisma.enrollment.count.mockResolvedValue(29);

      const result = await service.assignEnrollmentToClass(SCHOOL_ID, "enr-1", {
        classId: CLASS_ID,
      });
      expect(result).toMatchObject({ classId: CLASS_ID });
    });
  });

  describe("listWaitingEnrollments", () => {
    it("filtre systematiquement sur classId null (salle d'attente d'affectation)", async () => {
      await service.listWaitingEnrollments(SCHOOL_ID, {
        schoolYearId: YEAR_ID,
      });
      expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classId: null,
            schoolYearId: YEAR_ID,
          }),
        }),
      );
    });
  });
});
