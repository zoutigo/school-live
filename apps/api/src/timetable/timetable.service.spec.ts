import { ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { TimetableChangeNotificationsService } from "../notifications/timetable-change-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TimetableService } from "./timetable.service.js";

const NOOP_NOTIFICATIONS = {
  enqueue: jest.fn().mockResolvedValue(undefined),
} as unknown as TimetableChangeNotificationsService;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Alice",
    lastName: "Dupont",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    ...overrides,
  };
}

const CLASS_ENTITY = {
  id: "class-1",
  name: "6e B",
  schoolId: "school-1",
  schoolYearId: "sy-1",
  academicLevelId: "lvl-1",
  curriculumId: null,
  referentTeacherUserId: "referent-1",
};

const CLASS_FOR_SUBJECTS = {
  curriculumId: null,
  curriculum: null,
};

const SCHOOL_YEAR = {
  id: "sy-1",
  startsAt: new Date("2025-09-01"),
  endsAt: new Date("2026-06-30"),
};
const SCHOOL_CONTEXT = {
  activeSchoolYearId: "sy-1",
  schoolYears: [{ id: "sy-1", label: "2025-2026" }],
};

// ─── Prisma mock factory ──────────────────────────────────────────────────────

const makePrismaMock = () => ({
  class: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  school: { findUnique: jest.fn() },
  classTimetableSubjectStyle: { findMany: jest.fn() },
  classSubjectOverride: { findMany: jest.fn() },
  classTimetableSlot: { findMany: jest.fn() },
  classTimetableOneOffSlot: { findMany: jest.fn() },
  classTimetableSlotException: { findMany: jest.fn() },
  schoolCalendarEvent: { findMany: jest.fn() },
  room: { findFirst: jest.fn() },
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("TimetableService.classContext", () => {
  let service: TimetableService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TimetableChangeNotificationsService,
          useValue: NOOP_NOTIFICATIONS,
        },
      ],
    }).compile();

    service = module.get(TimetableService);
  });

  // ── Shared happy-path setup ───────────────────────────────────────────────

  function setupHappyPath() {
    // ensureClassInSchool
    prisma.class.findFirst.mockResolvedValueOnce(CLASS_ENTITY);
    // listAllowedSubjectsForClass
    prisma.class.findFirst.mockResolvedValueOnce(CLASS_FOR_SUBJECTS);
    prisma.classSubjectOverride.findMany.mockResolvedValue([]);
    // ensureSchoolYearInSchool
    prisma.schoolYear.findFirst.mockResolvedValue(SCHOOL_YEAR);
    // assignments
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    // school context
    prisma.school.findUnique.mockResolvedValue(SCHOOL_CONTEXT);
    // subject styles
    prisma.classTimetableSubjectStyle.findMany.mockResolvedValue([]);
  }

  // ── Roles autorisés (non-enseignants) ────────────────────────────────────

  it("SCHOOL_ADMIN activeRole → retourne le contexte sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      activeRole: "SCHOOL_ADMIN",
      memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  it("SCHOOL_MANAGER activeRole → retourne le contexte sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      activeRole: "SCHOOL_MANAGER",
      memberships: [{ schoolId: "school-1", role: "SCHOOL_MANAGER" }],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  it("SUPERVISOR activeRole → retourne le contexte sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      activeRole: "SUPERVISOR",
      memberships: [{ schoolId: "school-1", role: "SUPERVISOR" }],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  it("SUPER_ADMIN plateforme → retourne le contexte sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      platformRoles: ["SUPER_ADMIN"],
      memberships: [],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  // ── TEACHER — référent ────────────────────────────────────────────────────

  it("TEACHER référent de la classe → accès accordé sans requête d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      id: "referent-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  // ── TEACHER — non référent avec assignation ───────────────────────────────

  it("TEACHER non référent avec au moins une assignation → accès accordé", async () => {
    // ensureClassInSchool — classe sans référent pour cet user
    prisma.class.findFirst.mockResolvedValueOnce({
      ...CLASS_ENTITY,
      referentTeacherUserId: "referent-1",
    });
    // assertCanReadClassContext : l'enseignant a une assignation
    prisma.teacherClassSubject.findFirst.mockResolvedValue({
      teacherUserId: "user-1",
    });
    // suite happy-path
    prisma.class.findFirst.mockResolvedValueOnce(CLASS_FOR_SUBJECTS);
    prisma.classSubjectOverride.findMany.mockResolvedValue([]);
    prisma.schoolYear.findFirst.mockResolvedValue(SCHOOL_YEAR);
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    prisma.school.findUnique.mockResolvedValue(SCHOOL_CONTEXT);
    prisma.classTimetableSubjectStyle.findMany.mockResolvedValue([]);

    const user = makeUser({
      id: "user-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    const result = await service.classContext(user, "school-1", "class-1");

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-1",
          classId: "class-1",
          teacherUserId: "user-1",
        }),
      }),
    );
  });

  // ── TEACHER — non référent sans assignation ───────────────────────────────

  it("TEACHER non référent sans assignation dans la classe → ForbiddenException", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASS_ENTITY);
    prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

    const user = makeUser({
      id: "intrus-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    await expect(
      service.classContext(user, "school-1", "class-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── Rôle insuffisant ─────────────────────────────────────────────────────

  it("PARENT activeRole → ForbiddenException", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASS_ENTITY);

    const user = makeUser({
      activeRole: "PARENT",
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
    });

    await expect(
      service.classContext(user, "school-1", "class-1"),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  it("STUDENT activeRole → ForbiddenException", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASS_ENTITY);

    const user = makeUser({
      activeRole: "STUDENT",
      memberships: [{ schoolId: "school-1", role: "STUDENT" }],
    });

    await expect(
      service.classContext(user, "school-1", "class-1"),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  // ── Vérification du scope de la requête d'assignation ────────────────────

  it("la requête d'assignation est scopée à la bonne école et classe", async () => {
    // ensureClassInSchool (1er appel)
    prisma.class.findFirst.mockResolvedValueOnce({
      ...CLASS_ENTITY,
      id: "class-42",
      schoolId: "school-99",
      referentTeacherUserId: "referent-other",
    });
    // listAllowedSubjectsForClass (2e appel)
    prisma.class.findFirst.mockResolvedValueOnce(CLASS_FOR_SUBJECTS);
    prisma.teacherClassSubject.findFirst.mockResolvedValue({
      teacherUserId: "user-1",
    });
    prisma.classSubjectOverride.findMany.mockResolvedValue([]);
    prisma.schoolYear.findFirst.mockResolvedValue(SCHOOL_YEAR);
    prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    prisma.school.findUnique.mockResolvedValue(SCHOOL_CONTEXT);
    prisma.classTimetableSubjectStyle.findMany.mockResolvedValue([]);

    const user = makeUser({
      id: "user-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-99", role: "TEACHER" }],
    });

    await service.classContext(user, "school-99", "class-42");

    expect(prisma.teacherClassSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-99",
          classId: "class-42",
          teacherUserId: "user-1",
        }),
      }),
    );
  });
});

// ─── classTimetable ───────────────────────────────────────────────────────────

describe("TimetableService.classTimetable", () => {
  let service: TimetableService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TimetableChangeNotificationsService,
          useValue: NOOP_NOTIFICATIONS,
        },
      ],
    }).compile();

    service = module.get(TimetableService);
  });

  const QUERY = { schoolYearId: "sy-1" };

  function setupHappyPath(referentTeacherUserId = "referent-1") {
    prisma.class.findFirst.mockResolvedValue({
      ...CLASS_ENTITY,
      referentTeacherUserId,
    });
    prisma.schoolYear.findFirst.mockResolvedValue(SCHOOL_YEAR);
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([]);
    prisma.classTimetableSubjectStyle.findMany.mockResolvedValue([]);
    prisma.schoolCalendarEvent.findMany.mockResolvedValue([]);
  }

  // ── Rôles autorisés sans vérification d'assignation ──────────────────────

  it("SCHOOL_ADMIN → retourne l'emploi du temps sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      activeRole: "SCHOOL_ADMIN",
      memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    });

    const result = await service.classTimetable(
      user,
      "school-1",
      "class-1",
      QUERY,
    );

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  it("SCHOOL_MANAGER → retourne l'emploi du temps sans vérification d'assignation", async () => {
    setupHappyPath();
    const user = makeUser({
      activeRole: "SCHOOL_MANAGER",
      memberships: [{ schoolId: "school-1", role: "SCHOOL_MANAGER" }],
    });

    const result = await service.classTimetable(
      user,
      "school-1",
      "class-1",
      QUERY,
    );

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  // ── TEACHER référent ──────────────────────────────────────────────────────

  it("TEACHER référent → retourne l'emploi du temps sans requête d'assignation", async () => {
    setupHappyPath("teacher-ref");
    const user = makeUser({
      id: "teacher-ref",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    const result = await service.classTimetable(
      user,
      "school-1",
      "class-1",
      QUERY,
    );

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });

  // ── TEACHER non référent avec assignation — cas du bug corrigé ────────────

  it("TEACHER avec assignation dans la classe → retourne l'emploi du temps", async () => {
    setupHappyPath("referent-other");
    prisma.teacherClassSubject.findFirst.mockResolvedValue({
      teacherUserId: "user-1",
    });

    const user = makeUser({
      id: "user-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    const result = await service.classTimetable(
      user,
      "school-1",
      "class-1",
      QUERY,
    );

    expect(result.class.id).toBe("class-1");
    expect(prisma.teacherClassSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-1",
          classId: "class-1",
          teacherUserId: "user-1",
        }),
      }),
    );
  });

  // ── TEACHER sans assignation ──────────────────────────────────────────────

  it("TEACHER sans assignation dans la classe → ForbiddenException", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASS_ENTITY);
    prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

    const user = makeUser({
      id: "intrus-1",
      activeRole: "TEACHER",
      memberships: [{ schoolId: "school-1", role: "TEACHER" }],
    });

    await expect(
      service.classTimetable(user, "school-1", "class-1", QUERY),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── Rôle insuffisant ─────────────────────────────────────────────────────

  it("PARENT activeRole → ForbiddenException", async () => {
    prisma.class.findFirst.mockResolvedValue(CLASS_ENTITY);

    const user = makeUser({
      activeRole: "PARENT",
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
    });

    await expect(
      service.classTimetable(user, "school-1", "class-1", QUERY),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.teacherClassSubject.findFirst).not.toHaveBeenCalled();
  });
});
