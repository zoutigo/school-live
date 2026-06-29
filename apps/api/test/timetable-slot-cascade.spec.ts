/**
 * Tests unitaires : comportement en cascade lors de la suppression et modification
 * d'un créneau récurrent (ClassTimetableSlot).
 *
 * Règles métier couvertes :
 * - deleteSlot : supprime aussi tous les OneOffSlots ayant sourceSlotId = slotId
 * - updateSlot (split) : migre les OneOffSlots avec occurrenceDate >= effectiveFromDate
 *   vers le nouveau slot créé
 */

import { NotFoundException } from "@nestjs/common";
import type { AppRole, PlatformRole, SchoolRole } from "../src/auth/auth.types.js";
import { TimetableService } from "../src/timetable/timetable.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAdminUser(id = "admin-1") {
  return {
    id,
    activeRole: "SCHOOL_ADMIN" as AppRole,
    platformRoles: [] as PlatformRole[],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" as SchoolRole }],
    profileCompleted: true,
    firstName: "Admin",
    lastName: id,
  };
}

function makeSlotEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: "slot-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    subjectId: "sub-1",
    teacherUserId: "teacher-1",
    weekday: 1,
    startMinute: 480,
    endMinute: 570,
    activeFromDate: new Date("2025-09-01T00:00:00.000Z"),
    activeToDate: new Date("2026-06-30T00:00:00.000Z"),
    room: null,
    roomId: null,
    subject: { id: "sub-1", name: "Maths" },
    teacherUser: {
      id: "teacher-1",
      firstName: "Paul",
      lastName: "Manga",
      email: "paul@example.test",
    },
    ...overrides,
  };
}

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const prisma = {
  $transaction: jest.fn(),
  classTimetableSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  classTimetableOneOffSlot: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
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
  room: { findFirst: jest.fn(), findUnique: jest.fn() },
};

const service = new TimetableService(prisma as never);

// ─── Setup commun ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  prisma.$transaction.mockImplementation(
    async (operations: Promise<unknown>[]) => Promise.all(operations),
  );

  (service as any).getEffectiveSchoolId = (_u: unknown, id: string) => id;
  (service as any).assertMinuteRange = jest.fn();
  (service as any).assertActiveDateRange = jest.fn();
  (service as any).toDateOnly = (s: string | Date) =>
    typeof s === "string"
      ? new Date(`${s.slice(0, 10)}T00:00:00.000Z`)
      : new Date(s.toISOString().slice(0, 10) + "T00:00:00.000Z");
  (service as any).addDays = (date: Date, n: number) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };
  (service as any).ensureClassInSchool = jest.fn().mockResolvedValue({
    id: "class-1",
    schoolYearId: "sy-1",
    referentTeacherUserId: "admin-1",
  });
  (service as any).ensureSchoolYearInSchool = jest
    .fn()
    .mockResolvedValue({ startsAt: null, endsAt: null });
  (service as any).ensureSubjectInSchool = jest.fn().mockResolvedValue(undefined);
  (service as any).ensureSubjectAllowedForClass = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureTeacherAssignedToClassSubject = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoSlotConflicts = jest.fn().mockResolvedValue(undefined);
  (service as any).ensureAutoSubjectStyleExists = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).resolveRoomReference = jest
    .fn()
    .mockResolvedValue({ roomId: null, room: null });
  (service as any).assertCanManageAssignedRecurringSlot = jest
    .fn()
    .mockResolvedValue(undefined);
});

// ─── deleteSlot — cascade OneOffSlots ────────────────────────────────────────

describe("deleteSlot — cascade sur les OneOffSlots liés", () => {
  const SLOT = makeSlotEntity();

  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(SLOT);
    prisma.classTimetableOneOffSlot.deleteMany.mockResolvedValue({ count: 2 });
    prisma.classTimetableSlot.delete.mockResolvedValue({ id: "slot-1" });
  });

  it("appelle deleteMany sur les OneOffSlots avec sourceSlotId = slotId", async () => {
    const user = makeAdminUser();
    await service.deleteSlot(user, "school-1", "slot-1");

    expect(prisma.classTimetableOneOffSlot.deleteMany).toHaveBeenCalledWith({
      where: { sourceSlotId: "slot-1" },
    });
  });

  it("appelle classTimetableSlot.delete dans la même transaction", async () => {
    const user = makeAdminUser();
    await service.deleteSlot(user, "school-1", "slot-1");

    expect(prisma.classTimetableSlot.delete).toHaveBeenCalledWith({
      where: { id: "slot-1" },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("exécute deleteMany ET delete dans la même transaction", async () => {
    const user = makeAdminUser();

    const capturedOps: unknown[] = [];
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => {
      capturedOps.push(...ops);
      return Promise.all(ops);
    });

    await service.deleteSlot(user, "school-1", "slot-1");

    expect(capturedOps).toHaveLength(2);
    expect(prisma.classTimetableOneOffSlot.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.classTimetableSlot.delete).toHaveBeenCalledTimes(1);
  });

  it("retourne { id, deleted: true }", async () => {
    const user = makeAdminUser();
    const result = await service.deleteSlot(user, "school-1", "slot-1");
    expect(result).toEqual({ id: "slot-1", deleted: true });
  });

  it("lève NotFoundException si le slot n'existe pas (pas de cascade déclenchée)", async () => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(null);
    const user = makeAdminUser();

    await expect(
      service.deleteSlot(user, "school-1", "slot-missing"),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.classTimetableOneOffSlot.deleteMany).not.toHaveBeenCalled();
    expect(prisma.classTimetableSlot.delete).not.toHaveBeenCalled();
  });

  it("supporte 0 OneOffSlots liés (deleteMany count = 0)", async () => {
    prisma.classTimetableOneOffSlot.deleteMany.mockResolvedValue({ count: 0 });
    const user = makeAdminUser();
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).resolves.toEqual({ id: "slot-1", deleted: true });
  });
});

// ─── updateSlot (split) — migration des OneOffSlots ──────────────────────────

describe("updateSlot (split structurel) — migration des OneOffSlots vers le nouveau slot", () => {
  // Slot actif de sep-2025 à juin-2026, effectiveFromDate = jan-2026 => split
  const OLD_SLOT = makeSlotEntity({
    activeFromDate: new Date("2025-09-01T00:00:00.000Z"),
    activeToDate: new Date("2026-06-30T00:00:00.000Z"),
    weekday: 1,
    startMinute: 480,
    endMinute: 570,
  });

  const NEW_SLOT_ID = "slot-2";

  const SPLIT_PAYLOAD = {
    weekday: 1,
    startMinute: 540,  // changement structurel (horaire)
    endMinute: 630,
    subjectId: "sub-1",
    teacherUserId: "teacher-1",
    effectiveFromDate: "2026-01-05",
  };

  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(OLD_SLOT);
    prisma.classTimetableSlot.update.mockResolvedValue({
      ...OLD_SLOT,
      activeToDate: new Date("2026-01-04T00:00:00.000Z"),
    });
    prisma.classTimetableSlot.create.mockResolvedValue({
      ...OLD_SLOT,
      id: NEW_SLOT_ID,
      startMinute: 540,
      endMinute: 630,
      activeFromDate: new Date("2026-01-05T00:00:00.000Z"),
    });
    prisma.classTimetableOneOffSlot.updateMany.mockResolvedValue({ count: 3 });
  });

  it("migre les OneOffSlots avec occurrenceDate >= effectiveFromDate vers le nouveau slot", async () => {
    const user = makeAdminUser();
    await service.updateSlot(user, "school-1", "slot-1", SPLIT_PAYLOAD);

    expect(prisma.classTimetableOneOffSlot.updateMany).toHaveBeenCalledWith({
      where: {
        sourceSlotId: "slot-1",
        occurrenceDate: { gte: new Date("2026-01-05T00:00:00.000Z") },
      },
      data: { sourceSlotId: NEW_SLOT_ID },
    });
  });

  it("ne migre pas les OneOffSlots avec occurrenceDate < effectiveFromDate", async () => {
    const user = makeAdminUser();
    await service.updateSlot(user, "school-1", "slot-1", SPLIT_PAYLOAD);

    const call = prisma.classTimetableOneOffSlot.updateMany.mock.calls[0][0];
    // La condition gte exclut les dates antérieures ; on vérifie que lt n'est pas présent
    expect(call.where.occurrenceDate).not.toHaveProperty("lt");
    expect(call.where.occurrenceDate).toHaveProperty("gte");
  });

  it("exécute la migration après la transaction de split (slot créé avant)", async () => {
    const user = makeAdminUser();
    const order: string[] = [];

    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => {
      order.push("$transaction");
      return Promise.all(ops);
    });
    prisma.classTimetableOneOffSlot.updateMany.mockImplementation(async () => {
      order.push("updateMany");
      return { count: 1 };
    });

    await service.updateSlot(user, "school-1", "slot-1", SPLIT_PAYLOAD);

    expect(order).toEqual(["$transaction", "updateMany"]);
  });

  it("n'appelle pas updateMany si pas de changement structurel (horaire identique)", async () => {
    // Payload identique sans changement structurel => branche non-split
    const noChangePayload = {
      weekday: 1,
      startMinute: 480,   // même que le slot existant
      endMinute: 570,
      subjectId: "sub-1",
      teacherUserId: "teacher-1",
    };
    prisma.classTimetableSlot.update.mockResolvedValue({ ...OLD_SLOT });

    const user = makeAdminUser();
    await service.updateSlot(user, "school-1", "slot-1", noChangePayload);

    expect(prisma.classTimetableOneOffSlot.updateMany).not.toHaveBeenCalled();
  });
});

// ─── Régression : les tests existants de permissions ne sont pas cassés ───────

describe("deleteSlot — régression permissions (avec mock deleteMany)", () => {
  beforeEach(() => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue({
      id: "slot-1",
      classId: "class-1",
      teacherUserId: "teacher-1",
    });
    prisma.classTimetableOneOffSlot.deleteMany.mockResolvedValue({ count: 0 });
    prisma.classTimetableSlot.delete.mockResolvedValue({ id: "slot-1" });
  });

  it("le SCHOOL_ADMIN peut toujours supprimer", async () => {
    const user = makeAdminUser();
    await expect(
      service.deleteSlot(user, "school-1", "slot-1"),
    ).resolves.toEqual({ id: "slot-1", deleted: true });
  });

  it("lève toujours NotFoundException si le créneau manque", async () => {
    prisma.classTimetableSlot.findFirst.mockResolvedValue(null);
    const user = makeAdminUser();
    await expect(
      service.deleteSlot(user, "school-1", "slot-missing"),
    ).rejects.toThrow(NotFoundException);
  });
});
