/**
 * Tests unitaires : SchoolHealthService
 * - listStudents : pagination réelle, recherche, filtre classe, âge dérivé de user.recoveryBirthDate
 * - listReports : pagination, recherche par nom d'élève, filtres alertLevel/reportType/acknowledged
 * - getStats : agrégats école entière vs scope classe
 */

import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { SchoolHealthService } from "./school-health.service.js";

const SCHOOL_ID = "school-1";
const CLASS_ID = "class-1";
const SCHOOL_YEAR_ID = "year-1";

const makePrismaMock = () => ({
  school: {
    findUnique: jest
      .fn()
      .mockResolvedValue({ activeSchoolYearId: SCHOOL_YEAR_ID }),
  },
  class: {
    findFirst: jest.fn().mockResolvedValue({ id: CLASS_ID }),
  },
  student: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  studentHealthReport: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  studentHealthCondition: {
    groupBy: jest.fn().mockResolvedValue([]),
    findMany: jest.fn().mockResolvedValue([]),
  },
  studentHealthCareEvent: {
    count: jest.fn().mockResolvedValue(0),
  },
});

describe("SchoolHealthService", () => {
  let service: SchoolHealthService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        SchoolHealthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SchoolHealthService);
  });

  // ── listStudents ────────────────────────────────────────────────────────────

  describe("listStudents", () => {
    it("pagine avec les valeurs par défaut (page=1, limit=20)", async () => {
      await service.listStudents(SCHOOL_ID);
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it("calcule skip/take à partir de page/limit demandés", async () => {
      await service.listStudents(SCHOOL_ID, { page: 3, limit: 10 });
      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it("applique la recherche sur firstName/lastName pour findMany ET count", async () => {
      await service.listStudents(SCHOOL_ID, { search: "mbele" });
      const where = prisma.student.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { firstName: { contains: "mbele", mode: "insensitive" } },
        { lastName: { contains: "mbele", mode: "insensitive" } },
      ]);
      expect(prisma.student.count).toHaveBeenCalledWith({ where });
    });

    it("lève NotFoundException si classId ne correspond à aucune classe de l'école", async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(
        service.listStudents(SCHOOL_ID, { classId: "missing-class" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("filtre par classId sur l'année scolaire active", async () => {
      await service.listStudents(SCHOOL_ID, { classId: CLASS_ID });
      const where = prisma.student.findMany.mock.calls[0][0].where;
      expect(where.enrollments).toEqual({
        some: { classId: CLASS_ID, schoolYearId: SCHOOL_YEAR_ID },
      });
    });

    it("dérive l'âge et la classe courante depuis user.recoveryBirthDate et l'inscription active", async () => {
      prisma.student.findMany.mockResolvedValue([
        {
          id: "student-1",
          firstName: "Nathan",
          lastName: "Mbele",
          user: { recoveryBirthDate: new Date("2015-08-04T00:00:00Z") },
          enrollments: [{ class: { id: CLASS_ID, name: "CM2 A" } }],
        },
        {
          id: "student-2",
          firstName: "Lisa",
          lastName: "Ateba",
          user: null,
          enrollments: [],
        },
      ]);
      prisma.student.count.mockResolvedValue(2);

      const result = await service.listStudents(SCHOOL_ID);

      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: "student-1",
          class: { id: CLASS_ID, name: "CM2 A" },
          birthDate: "2015-08-04",
        }),
      );
      expect(result.items[0].age).toBeGreaterThanOrEqual(9);
      expect(result.items[1]).toEqual(
        expect.objectContaining({
          id: "student-2",
          class: null,
          birthDate: null,
          age: null,
        }),
      );
      expect(result.total).toBe(2);
    });
  });

  // ── listReports ─────────────────────────────────────────────────────────────

  describe("listReports", () => {
    it("pagine avec les valeurs par défaut", async () => {
      await service.listReports(SCHOOL_ID);
      expect(prisma.studentHealthReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: [{ createdAt: "desc" }],
        }),
      );
    });

    it("applique la recherche par nom d'élève via la relation student", async () => {
      await service.listReports(SCHOOL_ID, { search: "ateba" });
      const where = prisma.studentHealthReport.findMany.mock.calls[0][0].where;
      expect(where.student.OR).toEqual([
        { firstName: { contains: "ateba", mode: "insensitive" } },
        { lastName: { contains: "ateba", mode: "insensitive" } },
      ]);
    });

    it("applique les filtres alertLevel et reportType", async () => {
      await service.listReports(SCHOOL_ID, {
        alertLevel: "URGENT",
        reportType: "ACCIDENT",
      });
      const where = prisma.studentHealthReport.findMany.mock.calls[0][0].where;
      expect(where.alertLevel).toBe("URGENT");
      expect(where.type).toBe("ACCIDENT");
    });

    it("acknowledged=true ne retient que les signalements acquittés", async () => {
      await service.listReports(SCHOOL_ID, { acknowledged: true });
      const where = prisma.studentHealthReport.findMany.mock.calls[0][0].where;
      expect(where.acknowledgedAt).toEqual({ not: null });
    });

    it("acknowledged=false ne retient que les signalements en attente", async () => {
      await service.listReports(SCHOOL_ID, { acknowledged: false });
      const where = prisma.studentHealthReport.findMany.mock.calls[0][0].where;
      expect(where.acknowledgedAt).toBeNull();
    });

    it("reprojette la classe courante de l'élève à côté du signalement", async () => {
      prisma.studentHealthReport.findMany.mockResolvedValue([
        {
          id: "report-1",
          student: {
            id: "student-1",
            firstName: "Nathan",
            lastName: "Mbele",
            enrollments: [{ class: { id: CLASS_ID, name: "CM2 A" } }],
          },
        },
      ]);
      prisma.studentHealthReport.count.mockResolvedValue(1);

      const result = await service.listReports(SCHOOL_ID);

      expect(result.items[0].student).toEqual({
        id: "student-1",
        firstName: "Nathan",
        lastName: "Mbele",
        class: { id: CLASS_ID, name: "CM2 A" },
      });
    });
  });

  // ── getStats ────────────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("retourne le scope SCHOOL sans classId", async () => {
      const stats = await service.getStats(SCHOOL_ID);
      expect(stats.scope).toBe("SCHOOL");
      expect(stats.classId).toBeNull();
    });

    it("lève NotFoundException si classId ne correspond à aucune classe de l'école", async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(
        service.getStats(SCHOOL_ID, { classId: "missing-class" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("retourne le scope CLASS et propage le filtre classe aux requêtes agrégées", async () => {
      const stats = await service.getStats(SCHOOL_ID, { classId: CLASS_ID });
      expect(stats.scope).toBe("CLASS");
      expect(stats.classId).toBe(CLASS_ID);

      const groupByArgs =
        prisma.studentHealthCondition.groupBy.mock.calls[0][0];
      expect(groupByArgs.where.student).toEqual({
        enrollments: {
          some: { classId: CLASS_ID, schoolYearId: SCHOOL_YEAR_ID },
        },
      });
    });

    it("agrège la répartition des conditions actives par alertLevel, complétée à 0 pour les niveaux absents", async () => {
      prisma.studentHealthCondition.groupBy.mockResolvedValue([
        { alertLevel: "URGENT", _count: { _all: 3 } },
        { alertLevel: "INFO", _count: { _all: 5 } },
      ]);

      const stats = await service.getStats(SCHOOL_ID);

      expect(stats.activeConditionsByAlertLevel).toEqual({
        INFO: 5,
        ATTENTION: 0,
        URGENT: 3,
      });
      expect(stats.activeConditionsTotal).toBe(8);
    });

    it("compte les élèves distincts avec condition active", async () => {
      prisma.studentHealthCondition.findMany.mockResolvedValue([
        { studentId: "s1" },
        { studentId: "s2" },
      ]);
      const stats = await service.getStats(SCHOOL_ID);
      expect(stats.studentsWithActiveConditions).toBe(2);
    });

    it("compte les cares des 7 et 30 derniers jours et les reports non acquittés", async () => {
      prisma.studentHealthCareEvent.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(12);
      const stats = await service.getStats(SCHOOL_ID);
      expect(stats.careEventsLast7Days).toBe(4);
      expect(stats.careEventsLast30Days).toBe(12);
    });
  });
});
