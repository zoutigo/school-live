/**
 * Tests unitaires pour les règles de permission des séries récurrentes et exceptions.
 *
 * Règle métier :
 * - Séries récurrentes (update/delete slot) : referent teacher ou admin seulement
 * - Exceptions de slot (create/update/delete) : referent teacher ou admin seulement
 */
import { ForbiddenException, NotFoundException } from "@nestjs/common";
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
  $transaction: jest.fn(),
  classTimetableSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableOneOffSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableSlotException: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  schoolMembership: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  subject: { findFirst: jest.fn() },
  classCurriculum: { findFirst: jest.fn() },
  classTimetableSubjectStyle: { findFirst: jest.fn(), upsert: jest.fn() },
};

const service = new TimetableService(prisma as never);

beforeEach(() => {
  jest.clearAllMocks();
  (service as any).getEffectiveSchoolId = (_user: unknown, schoolId: string) =>
    schoolId;
  (service as any).assertMinuteRange = jest.fn();
  (service as any).assertActiveDateRange = jest.fn();
  (service as any).toDateOnly = (s: string) => new Date(s);
  (service as any).ensureClassInSchool = jest
    .fn()
    .mockResolvedValue(makeClassEntity("referent-1"));
  (service as any).ensureSchoolYearInSchool = jest.fn().mockResolvedValue({
    startsAt: null,
    endsAt: null,
  });
  (service as any).ensureSubjectInSchool = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureSubjectAllowedForClass = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureTeacherAssignedToClassSubject = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoSlotConflicts = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoOccurrenceConflicts = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureAutoSubjectStyleExists = jest
    .fn()
    .mockResolvedValue(undefined);
});

// ─── updateSlot — permissions ─────────────────────────────────────────────────

describe("updateSlot (série récurrente) — referent seulement", () => {
  // activeFromDate in the far future forces the "simple update" branch
  // (splitStartDate=today <= activeFromDate=2099), avoiding $transaction
  const EXISTING_SLOT = {
    id: "slot-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    subjectId: "sub-1",
    teacherUserId: "teacher-albert",
    weekday: 2,
    startMinute: 480,
    endMinute: 570,
    activeFromDate: new Date("2099-01-01"),
    activeToDate: new Date("2099-12-31"),
    room: null,
  };

  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(EXISTING_SLOT);
    prisma.classTimetableSlot.update.mockResolvedValue({
      ...EXISTING_SLOT,
      room: "B45",
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "B45" }),
    ).resolves.toBeDefined();
  });

  it("autorise le SCHOOL_MANAGER", async () => {
    const user = makeUser("manager-1", "SCHOOL_MANAGER");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "B45" }),
    ).resolves.toBeDefined();
  });

  it("autorise le referent teacher de la classe", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "A01" }),
    ).resolves.toBeDefined();
  });

  it("refuse un enseignant non référent même s'il est désigné sur le créneau", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "C99" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un enseignant non référent quelconque", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "Z01" }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise un SUPER_ADMIN (platform role)", async () => {
    const user = makeUser("sa-1", "TEACHER", ["SUPER_ADMIN"]);
    await expect(
      service.updateSlot(user, "school-1", "slot-1", { room: "B45" }),
    ).resolves.toBeDefined();
  });

  it("lève NotFoundException si le créneau n'existe pas", async () => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateSlot(user, "school-1", "slot-missing", { room: "B45" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("lève BadRequestException si aucun champ n'est fourni", async () => {
    const { BadRequestException } = await import("@nestjs/common");
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateSlot(user, "school-1", "slot-1", {}),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── deleteSlot — permissions ─────────────────────────────────────────────────

describe("deleteSlot (série récurrente) — referent seulement", () => {
  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue({
      id: "slot-1",
      classId: "class-1",
    });
    prisma.classTimetableSlot.delete.mockResolvedValue({ id: "slot-1" });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).resolves.toEqual({ id: "slot-1", deleted: true });
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).resolves.toEqual({ id: "slot-1", deleted: true });
  });

  it("refuse un enseignant non référent", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un PARENT", async () => {
    const user = makeUser("parent-1", "PARENT");
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lève NotFoundException si le créneau n'existe pas", async () => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.deleteSlot(user, "school-1", "slot-missing"),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── createSlotException — permissions ───────────────────────────────────────

describe("createSlotException — referent seulement", () => {
  const EXISTING_SLOT = {
    id: "slot-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    subjectId: "sub-1",
    teacherUserId: "teacher-albert",
    startMinute: 480,
    endMinute: 570,
  };

  const CANCELLED_PAYLOAD = {
    occurrenceDate: "2026-04-14",
    type: "CANCEL" as const,
  };

  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(EXISTING_SLOT);
    prisma.classTimetableSlotException.upsert.mockResolvedValue({
      id: "exc-1",
      slot: EXISTING_SLOT,
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("autorise le SCHOOL_MANAGER", async () => {
    const user = makeUser("manager-1", "SCHOOL_MANAGER");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("refuse un enseignant non référent même s'il est désigné sur le créneau", async () => {
    const user = makeUser("teacher-albert", "TEACHER");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un enseignant non référent quelconque", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise un SUPER_ADMIN (platform role)", async () => {
    const user = makeUser("sa-1", "TEACHER", ["SUPER_ADMIN"]);
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-1",
        CANCELLED_PAYLOAD,
      ),
    ).resolves.toBeDefined();
  });

  it("lève NotFoundException si le créneau parent n'existe pas", async () => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.createSlotException(
        user,
        "school-1",
        "slot-missing",
        CANCELLED_PAYLOAD,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── updateSlotException — permissions ───────────────────────────────────────

describe("updateSlotException — referent seulement", () => {
  const EXISTING_EXCEPTION = {
    id: "exc-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    slotId: "slot-1",
    occurrenceDate: "2026-04-14",
    type: "CANCELLED",
    subjectId: null,
    teacherUserId: null,
    startMinute: null,
    endMinute: null,
    room: null,
    reason: null,
    slot: {
      id: "slot-1",
      schoolYearId: "sy-1",
      classId: "class-1",
      subjectId: "sub-1",
      teacherUserId: "teacher-albert",
      startMinute: 480,
      endMinute: 570,
    },
  };

  beforeEach(() => {
    prisma.classTimetableSlotException.findFirst.mockResolvedValue(
      EXISTING_EXCEPTION,
    );
    prisma.classTimetableSlotException.update.mockResolvedValue({
      ...EXISTING_EXCEPTION,
      reason: "Malade",
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateSlotException(user, "school-1", "exc-1", {
        reason: "Malade",
      }),
    ).resolves.toBeDefined();
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.updateSlotException(user, "school-1", "exc-1", {
        reason: "Malade",
      }),
    ).resolves.toBeDefined();
  });

  it("refuse un enseignant non référent", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.updateSlotException(user, "school-1", "exc-1", {
        reason: "Malade",
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it("autorise un SUPER_ADMIN (platform role)", async () => {
    const user = makeUser("sa-1", "TEACHER", ["SUPER_ADMIN"]);
    await expect(
      service.updateSlotException(user, "school-1", "exc-1", {
        reason: "Malade",
      }),
    ).resolves.toBeDefined();
  });

  it("lève NotFoundException si l'exception n'existe pas", async () => {
    prisma.classTimetableSlotException.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.updateSlotException(user, "school-1", "exc-missing", {
        reason: "X",
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── deleteSlotException — permissions ───────────────────────────────────────

describe("deleteSlotException — referent seulement", () => {
  beforeEach(() => {
    prisma.classTimetableSlotException.findFirst.mockResolvedValue({
      id: "exc-1",
      classId: "class-1",
    });
    prisma.classTimetableSlotException.delete.mockResolvedValue({
      id: "exc-1",
    });
  });

  it("autorise le SCHOOL_ADMIN", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.deleteSlotException(user, "school-1", "exc-1"),
    ).resolves.toEqual({ id: "exc-1", deleted: true });
  });

  it("autorise le referent teacher", async () => {
    const user = makeUser("referent-1", "TEACHER");
    await expect(
      service.deleteSlotException(user, "school-1", "exc-1"),
    ).resolves.toEqual({ id: "exc-1", deleted: true });
  });

  it("refuse un enseignant non référent", async () => {
    const user = makeUser("other-teacher", "TEACHER");
    await expect(
      service.deleteSlotException(user, "school-1", "exc-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuse un PARENT", async () => {
    const user = makeUser("parent-1", "PARENT");
    await expect(
      service.deleteSlotException(user, "school-1", "exc-1"),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lève NotFoundException si l'exception n'existe pas", async () => {
    prisma.classTimetableSlotException.findFirst.mockResolvedValue(null);
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    await expect(
      service.deleteSlotException(user, "school-1", "exc-missing"),
    ).rejects.toThrow(NotFoundException);
  });
});
