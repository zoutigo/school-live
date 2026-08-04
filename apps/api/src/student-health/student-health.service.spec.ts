/**
 * Tests unitaires : StudentHealthService
 * - matrice de droits (parent, responsable santé/admin/manager, référent, autre prof, tiers)
 * - notifications (soin -> parents, signalement -> référent de classe)
 * - validations métier (publicAlertLabel requis si isVisibleToAllTeachers)
 */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { PushService } from "../notifications/push.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { StudentHealthService } from "./student-health.service.js";

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const PARENT_USER_ID = "parent-1";
const OTHER_PARENT_USER_ID = "parent-2";
const HEALTH_OFFICER_USER_ID = "health-1";
const REFERENT_TEACHER_USER_ID = "teacher-referent";
const OTHER_TEACHER_USER_ID = "teacher-other";
const CLASS_ID = "class-1";
const SCHOOL_YEAR_ID = "year-1";

function makeUser(
  id: string,
  role: AuthenticatedUser["memberships"][number]["role"] | null,
): AuthenticatedUser {
  return {
    id,
    activeRole: role ?? undefined,
    platformRoles: [],
    memberships: role ? [{ schoolId: SCHOOL_ID, role }] : [],
    profileCompleted: true,
    firstName: "Test",
    lastName: "User",
  };
}

const PARENT = makeUser(PARENT_USER_ID, "PARENT");
const OTHER_PARENT = makeUser(OTHER_PARENT_USER_ID, "PARENT");
const HEALTH_OFFICER = makeUser(
  HEALTH_OFFICER_USER_ID,
  "SCHOOL_HEALTH_OFFICER",
);
const REFERENT_TEACHER = makeUser(REFERENT_TEACHER_USER_ID, "TEACHER");
const OTHER_TEACHER = makeUser(OTHER_TEACHER_USER_ID, "TEACHER");

const makePrismaMock = () => ({
  student: {
    findFirst: jest.fn().mockResolvedValue({
      id: STUDENT_ID,
      firstName: "Nathan",
      lastName: "Mbele",
    }),
  },
  parentStudent: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  school: {
    findUnique: jest.fn().mockResolvedValue({
      activeSchoolYearId: SCHOOL_YEAR_ID,
      name: "Ecole Test",
      slug: "ecole-test",
    }),
  },
  enrollment: {
    findFirst: jest
      .fn()
      .mockResolvedValue({ classId: CLASS_ID, schoolYearId: SCHOOL_YEAR_ID }),
  },
  class: {
    findFirst: jest
      .fn()
      .mockResolvedValue({ referentTeacherUserId: REFERENT_TEACHER_USER_ID }),
  },
  teacherClassSubject: {
    findFirst: jest.fn(),
  },
  studentHealthCondition: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  studentHealthCareEvent: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
  studentHealthReport: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  studentHealthAccessLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  mobilePushToken: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  user: {
    findUnique: jest.fn(),
  },
});

const makeMailServiceMock = () => ({
  sendStudentHealthCareEventNotification: jest
    .fn()
    .mockResolvedValue(undefined),
  sendStudentHealthReportNotification: jest.fn().mockResolvedValue(undefined),
});

const makePushServiceMock = () => ({
  sendStudentHealthCareEventNotification: jest
    .fn()
    .mockResolvedValue(undefined),
  sendStudentHealthReportNotification: jest.fn().mockResolvedValue(undefined),
});

describe("StudentHealthService", () => {
  let service: StudentHealthService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mailService: ReturnType<typeof makeMailServiceMock>;
  let pushService: ReturnType<typeof makePushServiceMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    mailService = makeMailServiceMock();
    pushService = makePushServiceMock();

    const module = await Test.createTestingModule({
      providers: [
        StudentHealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(StudentHealthService);
  });

  // ── ensureStudentInSchool ────────────────────────────────────────────────────

  it("lève NotFoundException si l'élève n'existe pas dans l'école", async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.listConditions(SCHOOL_ID, HEALTH_OFFICER, "ghost"),
    ).rejects.toThrow(NotFoundException);
  });

  // ── listConditions : matrice de droits ──────────────────────────────────────

  describe("listConditions", () => {
    it("autorise le parent de l'enfant", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });

      await expect(
        service.listConditions(SCHOOL_ID, PARENT, STUDENT_ID),
      ).resolves.not.toThrow();
    });

    it("refuse un parent qui n'est pas rattaché à cet enfant", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.listConditions(SCHOOL_ID, OTHER_PARENT, STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it("autorise le responsable santé", async () => {
      await expect(
        service.listConditions(SCHOOL_ID, HEALTH_OFFICER, STUDENT_ID),
      ).resolves.not.toThrow();
    });

    it("autorise l'enseignant référent de la classe et ne retourne que les conditions actives", async () => {
      prisma.studentHealthCondition.findMany.mockResolvedValue([
        { id: "c1", active: true },
      ]);
      prisma.studentHealthCondition.count.mockResolvedValue(1);

      const result = await service.listConditions(
        SCHOOL_ID,
        REFERENT_TEACHER,
        STUDENT_ID,
      );

      expect(result.items).toEqual([{ id: "c1", active: true }]);
      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it("refuse un enseignant non référent de la classe", async () => {
      prisma.class.findFirst.mockResolvedValue({
        referentTeacherUserId: REFERENT_TEACHER_USER_ID,
      });

      await expect(
        service.listConditions(SCHOOL_ID, OTHER_TEACHER, STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it("pagine avec les valeurs par défaut (page=1, limit=20)", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.studentHealthCondition.findMany.mockResolvedValue([]);
      prisma.studentHealthCondition.count.mockResolvedValue(45);

      const result = await service.listConditions(
        SCHOOL_ID,
        PARENT,
        STUDENT_ID,
      );

      expect(result).toEqual(
        expect.objectContaining({ page: 1, limit: 20, total: 45 }),
      );
      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it("calcule skip/take à partir de page/limit demandés", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });

      await service.listConditions(SCHOOL_ID, PARENT, STUDENT_ID, {
        page: 3,
        limit: 10,
      });

      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(prisma.studentHealthCondition.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
            studentId: STUDENT_ID,
          }),
        }),
      );
    });

    it("applique search sur label/description pour findMany ET count", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });

      await service.listConditions(SCHOOL_ID, PARENT, STUDENT_ID, {
        search: "arachide",
      });

      const expectedWhere = expect.objectContaining({
        OR: [
          { label: { contains: "arachide", mode: "insensitive" } },
          { description: { contains: "arachide", mode: "insensitive" } },
        ],
      });
      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.studentHealthCondition.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it("applique les filtres type/alertLevel/active", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });

      await service.listConditions(SCHOOL_ID, PARENT, STUDENT_ID, {
        type: "ALLERGY",
        alertLevel: "URGENT",
        active: false,
      });

      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "ALLERGY",
            alertLevel: "URGENT",
            active: false,
          }),
        }),
      );
    });

    it("le filtre active du référent (actives uniquement) n'est jamais remplacé par le query param active=false", async () => {
      await service.listConditions(SCHOOL_ID, REFERENT_TEACHER, STUDENT_ID, {
        active: false,
      });

      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });
  });

  // ── listPublicAlerts ─────────────────────────────────────────────────────────

  describe("listPublicAlerts", () => {
    it("autorise un prof de la classe (pas forcément référent) et ne retourne que les alertes publiques actives", async () => {
      prisma.teacherClassSubject.findFirst.mockResolvedValue({
        id: "assign-1",
      });
      prisma.studentHealthCondition.findMany.mockResolvedValue([
        {
          id: "c1",
          alertLevel: "ATTENTION",
          publicAlertLabel: "Pas de sport",
          type: "OTHER",
        },
      ]);

      const result = await service.listPublicAlerts(
        SCHOOL_ID,
        OTHER_TEACHER,
        STUDENT_ID,
      );

      expect(result).toHaveLength(1);
      expect(prisma.studentHealthCondition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            isVisibleToAllTeachers: true,
          }),
        }),
      );
    });

    it("refuse un prof qui n'a pas cette classe", async () => {
      prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.listPublicAlerts(SCHOOL_ID, OTHER_TEACHER, STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── createCondition ──────────────────────────────────────────────────────────

  describe("createCondition", () => {
    const basePayload = {
      type: "ALLERGY" as const,
      alertLevel: "URGENT" as const,
      label: "Allergie arachides",
    };

    it("permet au parent de créer une condition pour son enfant", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.studentHealthCondition.create.mockResolvedValue({ id: "cond-1" });

      await service.createCondition(SCHOOL_ID, PARENT, STUDENT_ID, basePayload);

      expect(prisma.studentHealthCondition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdByUserId: PARENT_USER_ID,
            label: "Allergie arachides",
          }),
        }),
      );
    });

    it("refuse un parent non rattaché à l'enfant", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.createCondition(
          SCHOOL_ID,
          OTHER_PARENT,
          STUDENT_ID,
          basePayload,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("refuse un enseignant (même référent)", async () => {
      await expect(
        service.createCondition(
          SCHOOL_ID,
          REFERENT_TEACHER,
          STUDENT_ID,
          basePayload,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("exige publicAlertLabel si isVisibleToAllTeachers est true", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });

      await expect(
        service.createCondition(SCHOOL_ID, PARENT, STUDENT_ID, {
          ...basePayload,
          isVisibleToAllTeachers: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── createCareEvent + notification parent ───────────────────────────────────

  describe("createCareEvent", () => {
    const payload = {
      summary: "Chute dans la cour",
      alertLevel: "INFO" as const,
    };

    it("refuse un parent", async () => {
      await expect(
        service.createCareEvent(SCHOOL_ID, PARENT, STUDENT_ID, payload),
      ).rejects.toThrow(ForbiddenException);
    });

    it("permet au responsable santé et notifie les parents (mail + push)", async () => {
      prisma.studentHealthCareEvent.create.mockResolvedValue({
        id: "care-1",
        summary: payload.summary,
        description: null,
        occurredAt: new Date("2026-08-03T10:42:00Z"),
        alertLevel: "INFO",
        authorUser: { firstName: "Marie", lastName: "Ateba" },
      });
      prisma.parentStudent.findMany.mockResolvedValue([
        {
          parent: {
            id: PARENT_USER_ID,
            email: "parent@example.com",
            firstName: "Jean",
            preferredLocale: "FR",
          },
        },
      ]);
      prisma.mobilePushToken.findMany.mockResolvedValue([{ token: "tok-1" }]);

      await service.createCareEvent(
        SCHOOL_ID,
        HEALTH_OFFICER,
        STUDENT_ID,
        payload,
      );

      expect(
        mailService.sendStudentHealthCareEventNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "parent@example.com",
          summary: payload.summary,
        }),
      );
      expect(
        pushService.sendStudentHealthCareEventNotification,
      ).toHaveBeenCalledWith(expect.objectContaining({ tokens: ["tok-1"] }));
    });

    it("ne bloque pas la création si l'envoi du mail échoue", async () => {
      prisma.studentHealthCareEvent.create.mockResolvedValue({
        id: "care-1",
        summary: payload.summary,
        description: null,
        occurredAt: new Date(),
        alertLevel: "INFO",
        authorUser: null,
      });
      prisma.parentStudent.findMany.mockResolvedValue([
        {
          parent: {
            id: PARENT_USER_ID,
            email: "parent@example.com",
            firstName: "Jean",
            preferredLocale: "FR",
          },
        },
      ]);
      mailService.sendStudentHealthCareEventNotification.mockRejectedValue(
        new Error("smtp down"),
      );

      await expect(
        service.createCareEvent(SCHOOL_ID, HEALTH_OFFICER, STUDENT_ID, payload),
      ).resolves.toEqual(expect.objectContaining({ id: "care-1" }));
    });
  });

  // ── createReport + notification référent ────────────────────────────────────

  describe("createReport", () => {
    const payload = {
      type: "ACCIDENT" as const,
      alertLevel: "ATTENTION" as const,
      description: "Crise d'asthme hier soir",
    };

    it("refuse un utilisateur qui n'est pas le parent", async () => {
      await expect(
        service.createReport(SCHOOL_ID, HEALTH_OFFICER, STUDENT_ID, payload),
      ).rejects.toThrow(ForbiddenException);
    });

    it("permet au parent et notifie l'enseignant référent (mail + push)", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.studentHealthReport.create.mockResolvedValue({
        id: "report-1",
        type: payload.type,
        description: payload.description,
        sportRestriction: false,
        reportedByUser: { firstName: "Jean", lastName: "Mbele" },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: REFERENT_TEACHER_USER_ID,
        email: "prof@example.com",
        firstName: "Alice",
        preferredLocale: "FR",
      });
      prisma.mobilePushToken.findMany.mockResolvedValue([{ token: "tok-2" }]);

      await service.createReport(SCHOOL_ID, PARENT, STUDENT_ID, payload);

      expect(
        mailService.sendStudentHealthReportNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "prof@example.com",
          description: payload.description,
        }),
      );
      expect(
        pushService.sendStudentHealthReportNotification,
      ).toHaveBeenCalledWith(expect.objectContaining({ tokens: ["tok-2"] }));
    });

    it("n'échoue pas si la classe n'a pas de référent assigné", async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });
      prisma.class.findFirst.mockResolvedValue({ referentTeacherUserId: null });
      prisma.studentHealthReport.create.mockResolvedValue({
        id: "report-1",
        type: payload.type,
        description: payload.description,
        sportRestriction: false,
        reportedByUser: null,
      });

      await expect(
        service.createReport(SCHOOL_ID, PARENT, STUDENT_ID, payload),
      ).resolves.toEqual(expect.objectContaining({ id: "report-1" }));
      expect(
        mailService.sendStudentHealthReportNotification,
      ).not.toHaveBeenCalled();
    });
  });

  // ── acknowledgeReport ────────────────────────────────────────────────────────

  describe("acknowledgeReport", () => {
    it("permet au référent d'acquitter", async () => {
      prisma.studentHealthReport.findFirst.mockResolvedValue({
        id: "report-1",
      });
      prisma.studentHealthReport.update.mockResolvedValue({
        id: "report-1",
        acknowledgedByUserId: REFERENT_TEACHER_USER_ID,
      });

      await service.acknowledgeReport(
        SCHOOL_ID,
        REFERENT_TEACHER,
        STUDENT_ID,
        "report-1",
      );

      expect(prisma.studentHealthReport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "report-1" },
          data: expect.objectContaining({
            acknowledgedByUserId: REFERENT_TEACHER_USER_ID,
          }),
        }),
      );
    });

    it("refuse un prof qui n'est pas référent", async () => {
      await expect(
        service.acknowledgeReport(
          SCHOOL_ID,
          OTHER_TEACHER,
          STUDENT_ID,
          "report-1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si le signalement n'existe pas", async () => {
      prisma.studentHealthReport.findFirst.mockResolvedValue(null);

      await expect(
        service.acknowledgeReport(
          SCHOOL_ID,
          HEALTH_OFFICER,
          STUDENT_ID,
          "ghost",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getHistory : fusion care events + reports, pagination, filtres ─────────

  describe("getHistory", () => {
    beforeEach(() => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: "link-1" });
    });

    it("fusionne care events et reports, triés par date décroissante", async () => {
      prisma.studentHealthCareEvent.findMany.mockResolvedValue([
        {
          id: "care-1",
          occurredAt: new Date("2026-08-01T10:00:00Z"),
          summary: "Chute",
        },
      ]);
      prisma.studentHealthReport.findMany.mockResolvedValue([
        {
          id: "report-1",
          createdAt: new Date("2026-08-02T10:00:00Z"),
          description: "Grippe",
        },
      ]);

      const result = await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID);

      expect(result.items.map((item) => item.kind)).toEqual([
        "REPORT",
        "CARE_EVENT",
      ]);
      expect(result).toEqual(
        expect.objectContaining({ page: 1, limit: 20, total: 2 }),
      );
    });

    it("ne fusionne plus les conditions (retirées du merge)", async () => {
      await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID);

      expect(prisma.studentHealthCondition.findMany).not.toHaveBeenCalled();
    });

    it("pagine en mémoire après fusion (page 2, limit 1)", async () => {
      prisma.studentHealthCareEvent.findMany.mockResolvedValue([
        { id: "care-1", occurredAt: new Date("2026-08-01T10:00:00Z") },
      ]);
      prisma.studentHealthReport.findMany.mockResolvedValue([
        { id: "report-1", createdAt: new Date("2026-08-02T10:00:00Z") },
      ]);

      const result = await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID, {
        page: 2,
        limit: 1,
      });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.payload).toEqual(
        expect.objectContaining({ id: "care-1" }),
      );
    });

    it("origin=CARE_EVENT exclut les reports de la requête", async () => {
      await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID, {
        origin: "CARE_EVENT",
      });

      expect(prisma.studentHealthReport.findMany).not.toHaveBeenCalled();
      expect(prisma.studentHealthCareEvent.findMany).toHaveBeenCalled();
    });

    it("origin=REPORT exclut les care events de la requête", async () => {
      await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID, {
        origin: "REPORT",
      });

      expect(prisma.studentHealthCareEvent.findMany).not.toHaveBeenCalled();
      expect(prisma.studentHealthReport.findMany).toHaveBeenCalled();
    });

    it("applique alertLevel aux deux sources et reportType uniquement aux reports", async () => {
      await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID, {
        alertLevel: "URGENT",
        reportType: "ACCIDENT",
      });

      expect(prisma.studentHealthCareEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ alertLevel: "URGENT" }),
        }),
      );
      expect(prisma.studentHealthReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            alertLevel: "URGENT",
            type: "ACCIDENT",
          }),
        }),
      );
    });

    it("applique search sur summary/description (care) et description (report)", async () => {
      await service.getHistory(SCHOOL_ID, PARENT, STUDENT_ID, {
        search: "asthme",
      });

      expect(prisma.studentHealthCareEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { summary: { contains: "asthme", mode: "insensitive" } },
              { description: { contains: "asthme", mode: "insensitive" } },
            ],
          }),
        }),
      );
      expect(prisma.studentHealthReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            description: { contains: "asthme", mode: "insensitive" },
          }),
        }),
      );
    });

    it("refuse un tiers sans accès (même matrice de droits que listCareEvents/listReports)", async () => {
      await expect(
        service.getHistory(SCHOOL_ID, OTHER_TEACHER, STUDENT_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
