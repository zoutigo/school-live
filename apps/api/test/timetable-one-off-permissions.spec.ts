/**
 * Tests unitaires pour les règles de permission des créneaux isolés (one-off slots).
 *
 * Règle métier :
 * - Séries récurrentes : referent teacher ou admin seulement
 * - Créneaux isolés (one-off) : l'enseignant désigné sur le créneau OU le referent OU un admin
 */
import { ForbiddenException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Role = "SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT";
type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

function makeUser(
  id: string,
  schoolRole: SchoolRole,
  platformRoles: Role[] = [],
) {
  return {
    id,
    platformRoles,
    memberships: [{ schoolId: "school-1", role: schoolRole }],
    profileCompleted: true,
    firstName: "User",
    lastName: id,
  };
}

function makeClassEntity(referentTeacherUserId: string | null) {
  return {
    id: "class-1",
    schoolYearId: "sy-1",
    referentTeacherUserId,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const prisma = {
  classTimetableSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableOneOffSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableSlotException: { findFirst: jest.fn(), delete: jest.fn() },
  schoolMembership: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  subject: { findFirst: jest.fn() },
  classCurriculum: { findFirst: jest.fn() },
  classTimetableSubjectStyle: { findFirst: jest.fn(), upsert: jest.fn() },
};

const service = new TimetableService(prisma as never);

// Stub all helper methods so tests focus on permission logic
beforeEach(() => {
  jest.clearAllMocks();
  (service as any).getEffectiveSchoolId = (_user: unknown, schoolId: string) =>
    schoolId;
  (service as any).assertMinuteRange = jest.fn();
  (service as any).toDateOnly = (s: string) => s;
  (service as any).ensureClassInSchool = jest
    .fn()
    .mockResolvedValue(makeClassEntity("referent-1"));
  (service as any).ensureSchoolYearInSchool = jest.fn().mockResolvedValue({});
  (service as any).ensureSubjectInSchool = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureSubjectAllowedForClass = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureTeacherAssignedToClassSubject = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoOccurrenceConflicts = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureAutoSubjectStyleExists = jest
    .fn()
    .mockResolvedValue(undefined);
  prisma.classTimetableOneOffSlot.create.mockResolvedValue({ id: "oof-1" });
  prisma.classTimetableOneOffSlot.update.mockResolvedValue({ id: "oof-1" });
  prisma.classTimetableOneOffSlot.delete.mockResolvedValue({ id: "oof-1" });
});

const BASE_ONE_OFF_PAYLOAD = {
  schoolYearId: "sy-1",
  occurrenceDate: "2026-04-14",
  startMinute: 480,
  endMinute: 570,
  subjectId: "sub-1",
  teacherUserId: "teacher-albert",
  room: "B45",
  status: "PLANNED" as const,
  sourceSlotId: "slot-1",
};

// ─── createOneOffSlot — permissions ──────────────────────────────────────────

describe("createOneOffSlot — permissions", () => {
  it("autorise un SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("autorise le referent teacher de la classe", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("autorise l'enseignant désigné sur le créneau (teacher-albert)", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("refuse un enseignant non référent et non désigné", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un PARENT", async () => {
    const user = makeUser("parent-1", "PARENT");
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise un SUPER_ADMIN (platform role)", async () => {
    const user = makeUser("sa-1", "TEACHER", ["SUPER_ADMIN"]);
    await expect(
      service.createOneOffSlot(
        user,
        "school-1",
        "class-1",
        BASE_ONE_OFF_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });
});

// ─── updateOneOffSlot — permissions ──────────────────────────────────────────

describe("updateOneOffSlot — permissions", () => {
  beforeEach(() => {
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue({
      id: "oof-1",
      schoolId: "school-1",
      schoolYearId: "sy-1",
      classId: "class-1",
      occurrenceDate: "2026-04-14",
      subjectId: "sub-1",
      teacherUserId: "teacher-albert",
      startMinute: 480,
      endMinute: 570,
      room: "B45",
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateOneOffSlot(user, "school-1", "oof-1", { startMinute: 500 }),
    ).resolves.toBeDefined();
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.updateOneOffSlot(user, "school-1", "oof-1", { room: "A01" }),
    ).resolves.toBeDefined();
  });

  it("autorise l'enseignant du créneau (teacher-albert)", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.updateOneOffSlot(user, "school-1", "oof-1", { room: "C99" }),
    ).resolves.toBeDefined();
  });

  it("refuse un enseignant non référent et non désigné", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.updateOneOffSlot(user, "school-1", "oof-1", { room: "Z01" }),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─── deleteOneOffSlot — permissions ──────────────────────────────────────────

describe("deleteOneOffSlot — permissions", () => {
  beforeEach(() => {
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue({
      id: "oof-1",
      classId: "class-1",
      teacherUserId: "teacher-albert",
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.deleteOneOffSlot(user, "school-1", "oof-1"),
    ).resolves.toEqual({ id: "oof-1", deleted: true });
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.deleteOneOffSlot(user, "school-1", "oof-1"),
    ).resolves.toEqual({ id: "oof-1", deleted: true });
  });

  it("autorise l'enseignant du créneau (teacher-albert)", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.deleteOneOffSlot(user, "school-1", "oof-1"),
    ).resolves.toEqual({ id: "oof-1", deleted: true });
  });

  it("refuse un enseignant non référent et non désigné", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.deleteOneOffSlot(user, "school-1", "oof-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse si le créneau n'existe pas", async () => {
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue(null);
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.deleteOneOffSlot(user, "school-1", "oof-missing"),
    ).rejects.toThrow("One-off slot not found");
  });
});

// ─── createSlot (série) — referent seulement ─────────────────────────────────

describe("createSlot (série récurrente) — referent seulement", () => {
  beforeEach(() => {
    (service as any).ensureNoSlotConflicts = jest
      .fn()
      .mockResolvedValue(undefined);
    (service as any).assertActiveDateRange = jest.fn();
    prisma.classTimetableSlot.create.mockResolvedValue({ id: "slot-new" });
  });

  const SLOT_PAYLOAD = {
    schoolYearId: "sy-1",
    weekday: 2,
    startMinute: 480,
    endMinute: 570,
    subjectId: "sub-1",
    teacherUserId: "teacher-albert",
    room: "B45",
  };

  it("autorise le referent teacher pour créer une série", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.createSlot(user, "school-1", "class-1", SLOT_PAYLOAD as never),
    ).resolves.toBeDefined();
  });

  it("refuse l'enseignant du créneau s'il n'est pas referent", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.createSlot(user, "school-1", "class-1", SLOT_PAYLOAD as never),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise le SCHOOL_ADMIN pour créer une série", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.createSlot(user, "school-1", "class-1", SLOT_PAYLOAD as never),
    ).resolves.toBeDefined();
  });
});
