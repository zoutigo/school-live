/**
 * Tests unitaires : PromotionsService
 * - decision du conseil de classe : uniquement sur TERM_3, niveau cible requis sauf LEFT
 * - acces : admin ecole (toute classe) ou enseignant referent (scope sur sa classe uniquement)
 * - synthese annuelle (T1/T2/T3 + moyenne annuelle) accompagnant la liste de decision
 * - liste d'attente d'affectation (classId null)
 * - affectation a une classe definitive : capacite, classe deja affectee, classe hors annee
 */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import { EvaluationsService } from "../evaluations/evaluations.service.js";
import { PromotionsService } from "./promotions.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";

const SCHOOL_ID = "school-1";
const YEAR_ID = "year-2026";
const CLASS_ID = "class-target";
const REFERENT_TEACHER_ID = "teacher-referent";

const adminUser = {
  id: "admin-1",
  platformRoles: [],
  memberships: [{ schoolId: SCHOOL_ID, role: "SCHOOL_ADMIN" }],
} as unknown as AuthenticatedUser;

const referentTeacherUser = {
  id: REFERENT_TEACHER_ID,
  platformRoles: [],
  memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
} as unknown as AuthenticatedUser;

const otherTeacherUser = {
  id: "teacher-other",
  platformRoles: [],
  memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
} as unknown as AuthenticatedUser;

const makePrismaMock = () => ({
  class: {
    findFirst: jest.fn().mockResolvedValue({
      id: CLASS_ID,
      schoolYearId: YEAR_ID,
      referentTeacherUserId: REFERENT_TEACHER_ID,
    }),
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
  let evaluationsService: { computeClassTermAverages: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    enrollmentsService = { confirmReinscription: jest.fn() };
    evaluationsService = {
      computeClassTermAverages: jest.fn().mockResolvedValue(new Map()),
    };

    const module = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: EvaluationsService, useValue: evaluationsService },
      ],
    }).compile();
    service = module.get(PromotionsService);
  });

  describe("listTermReportsForDecision", () => {
    it("leve NotFoundException si la classe n'existe pas", async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(
        service.listTermReportsForDecision(adminUser, SCHOOL_ID, "ghost"),
      ).rejects.toThrow(NotFoundException);
    });

    it("autorise un admin ecole sur n'importe quelle classe", async () => {
      await expect(
        service.listTermReportsForDecision(adminUser, SCHOOL_ID, CLASS_ID),
      ).resolves.not.toThrow();
    });

    it("autorise l'enseignant referent de la classe", async () => {
      await expect(
        service.listTermReportsForDecision(
          referentTeacherUser,
          SCHOOL_ID,
          CLASS_ID,
        ),
      ).resolves.not.toThrow();
    });

    it("refuse un enseignant qui n'est pas le referent de la classe", async () => {
      await expect(
        service.listTermReportsForDecision(
          otherTeacherUser,
          SCHOOL_ID,
          CLASS_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("attache la synthese annuelle (T1/T2/T3 + moyenne simple) par eleve", async () => {
      prisma.studentTermReport.findMany.mockResolvedValue([
        {
          id: "report-1",
          studentId: "student-1",
          decision: null,
        },
      ]);
      evaluationsService.computeClassTermAverages.mockResolvedValue(
        new Map([["student-1", { TERM_1: 12, TERM_2: 14, TERM_3: 16 }]]),
      );

      const result = await service.listTermReportsForDecision(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
      );

      expect(result[0]).toMatchObject({
        termAverages: { TERM_1: 12, TERM_2: 14, TERM_3: 16 },
        yearlyAverage: 14,
      });
    });

    it("expose le niveau academique courant de la classe (necessaire a l'auto-suggestion Repeated/Promoted cote client)", async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: CLASS_ID,
        schoolYearId: YEAR_ID,
        referentTeacherUserId: REFERENT_TEACHER_ID,
        academicLevel: { id: "level-6eme", order: 8 },
      });
      prisma.studentTermReport.findMany.mockResolvedValue([
        { id: "report-1", studentId: "student-1", decision: null },
      ]);

      const result = await service.listTermReportsForDecision(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
      );

      expect(result[0]).toMatchObject({
        currentAcademicLevel: { id: "level-6eme", order: 8 },
      });
    });

    it("calcule le rang de chaque eleve sur la moyenne annuelle (classement standard, ex-aequo partages)", async () => {
      prisma.studentTermReport.findMany.mockResolvedValue([
        { id: "report-1", studentId: "student-1", decision: null },
        { id: "report-2", studentId: "student-2", decision: null },
        { id: "report-3", studentId: "student-3", decision: null },
      ]);
      evaluationsService.computeClassTermAverages.mockResolvedValue(
        new Map([
          ["student-1", { TERM_1: 16, TERM_2: 16, TERM_3: 16 }],
          ["student-2", { TERM_1: 12, TERM_2: 12, TERM_3: 12 }],
          ["student-3", { TERM_1: 12, TERM_2: 12, TERM_3: 12 }],
        ]),
      );

      const result = await service.listTermReportsForDecision(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
      );

      const byStudent = Object.fromEntries(
        result.map((row) => [row.studentId, row]),
      );
      expect(byStudent["student-1"]).toMatchObject({ rank: 1, classSize: 3 });
      expect(byStudent["student-2"]).toMatchObject({ rank: 2, classSize: 3 });
      expect(byStudent["student-3"]).toMatchObject({ rank: 2, classSize: 3 });
    });

    it("ignore les trimestres sans moyenne dans le calcul de la moyenne annuelle", async () => {
      prisma.studentTermReport.findMany.mockResolvedValue([
        { id: "report-1", studentId: "student-1", decision: null },
      ]);
      evaluationsService.computeClassTermAverages.mockResolvedValue(
        new Map([["student-1", { TERM_1: null, TERM_2: 10, TERM_3: 12 }]]),
      );

      const result = await service.listTermReportsForDecision(
        adminUser,
        SCHOOL_ID,
        CLASS_ID,
      );

      expect(result[0].yearlyAverage).toBe(11);
    });
  });

  describe("setTermReportDecision", () => {
    it("leve NotFoundException si le bulletin n'existe pas", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue(null);
      await expect(
        service.setTermReportDecision(adminUser, SCHOOL_ID, "ghost", {
          decision: "PROMOTED",
          nextAcademicLevelId: "level-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse une decision sur un bulletin qui n'est pas du dernier trimestre", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_1",
        classId: CLASS_ID,
      });
      await expect(
        service.setTermReportDecision(adminUser, SCHOOL_ID, "report-1", {
          decision: "PROMOTED",
          nextAcademicLevelId: "level-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("refuse PROMOTED/REPEATED sans niveau cible (necessaire pour couvrir les niveaux terminaux)", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
        classId: CLASS_ID,
      });
      await expect(
        service.setTermReportDecision(adminUser, SCHOOL_ID, "report-1", {
          decision: "PROMOTED",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("accepte LEFT sans niveau cible et efface tout niveau/filiere precedemment saisis", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
        classId: CLASS_ID,
      });
      const result = await service.setTermReportDecision(
        adminUser,
        SCHOOL_ID,
        "report-1",
        { decision: "LEFT", nextAcademicLevelId: "level-1" },
      );
      expect(result).toMatchObject({
        decision: "LEFT",
        nextAcademicLevelId: null,
        nextTrackId: null,
      });
    });

    it("autorise l'enseignant referent de la classe du bulletin", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
        classId: CLASS_ID,
      });
      await expect(
        service.setTermReportDecision(
          referentTeacherUser,
          SCHOOL_ID,
          "report-1",
          { decision: "LEFT" },
        ),
      ).resolves.not.toThrow();
    });

    it("refuse un enseignant non referent de la classe du bulletin", async () => {
      prisma.studentTermReport.findFirst.mockResolvedValue({
        id: "report-1",
        term: "TERM_3",
        classId: CLASS_ID,
      });
      await expect(
        service.setTermReportDecision(otherTeacherUser, SCHOOL_ID, "report-1", {
          decision: "LEFT",
        }),
      ).rejects.toThrow(ForbiddenException);
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
