/**
 * Régression : updateOneOffSlot ne doit pas conflictuer avec le slot récurrent
 * sous-jacent (sourceSlotId) quelle que soit la modification effectuée.
 *
 * Bug : updateOneOffSlot ne fetchait pas sourceSlotId et ne le passait pas à
 * ensureNoOccurrenceConflicts → le slot récurrent parent était détecté comme
 * conflit teacher/room dans Part 2 (requête DB directe).
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(id: string) {
  return {
    id,
    platformRoles: [] as never[],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" as const }],
    profileCompleted: true,
    firstName: "Admin",
    lastName: id,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const prisma = {
  classTimetableSlot: { findMany: jest.fn() },
  classTimetableOneOffSlot: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  classTimetableSlotException: { findMany: jest.fn() },
  classTimetableSubjectStyle: { findFirst: jest.fn(), upsert: jest.fn() },
  schoolMembership: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn() },
};

const service = new TimetableService(prisma as never);
const ADMIN = makeUser("admin-1");

// Slot récurrent Anglais lundi 08:45-10:00
const RECURRING_SLOT = {
  id: "slot-anglais",
  schoolId: "school-1",
  schoolYearId: "sy-1",
  classId: "class-1",
  weekday: 1,
  startMinute: 525, // 08:45
  endMinute: 600, // 10:00
  activeFromDate: null,
  activeToDate: null,
  room: "B45",
  teacherUserId: "albert",
  subject: { id: "sub-anglais", name: "Anglais" },
  teacherUser: {
    id: "albert",
    firstName: "Albert",
    lastName: "M",
    email: null,
  },
};

// One-off qui remplace l'occurrence du 27 avril (08:20-10:00, salle B45)
const EXISTING_ONE_OFF = {
  id: "oof-1",
  schoolId: "school-1",
  schoolYearId: "sy-1",
  classId: "class-1",
  occurrenceDate: new Date(Date.UTC(2026, 3, 27)),
  subjectId: "sub-anglais",
  teacherUserId: "albert",
  startMinute: 500, // 08:20
  endMinute: 600, // 10:00
  room: "B45",
  sourceSlotId: "slot-anglais",
  status: "PLANNED" as const,
  subject: RECURRING_SLOT.subject,
  teacherUser: RECURRING_SLOT.teacherUser,
};

beforeEach(() => {
  jest.clearAllMocks();

  (service as any).getEffectiveSchoolId = (_u: unknown, s: string) => s;
  (service as any).assertMinuteRange = jest.fn();
  (service as any).toDateOnly = (s: string) => new Date(`${s}T00:00:00.000Z`);
  (service as any).dateToYmd = (d: Date) => d.toISOString().slice(0, 10);
  (service as any).weekdayMondayFirst = () => 1;

  (service as any).ensureClassInSchool = jest.fn().mockResolvedValue({
    id: "class-1",
    schoolYearId: "sy-1",
    referentTeacherUserId: "albert",
  });
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
  (service as any).assertCanManageOneOffSlot = jest
    .fn()
    .mockResolvedValue(undefined);

  // fetchClassTimetableData retourne le one-off existant (le récurrent est supprimé par Bug2 fix)
  (service as any).fetchClassTimetableData = jest.fn().mockResolvedValue({
    slots: [RECURRING_SLOT],
    oneOffSlots: [
      {
        ...EXISTING_ONE_OFF,
        subject: RECURRING_SLOT.subject,
        teacherUser: RECURRING_SLOT.teacherUser,
      },
    ],
    slotExceptions: [],
    calendarEvents: [],
    subjectStyles: [],
    occurrences: [
      // Le récurrent est supprimé par suppressedByOneOff ; seul le one-off apparaît
      {
        id: "oneoff-oof-1-2026-04-27",
        source: "ONE_OFF",
        status: "PLANNED",
        occurrenceDate: "2026-04-27",
        weekday: 1,
        startMinute: 500,
        endMinute: 600,
        room: "B45",
        reason: null,
        subject: RECURRING_SLOT.subject,
        teacherUser: RECURRING_SLOT.teacherUser,
        oneOffSlotId: "oof-1",
      },
    ],
  });

  // Part 2 — ensureNoOccurrenceConflicts direct DB queries
  // suppressedRecurring : aucune exception CANCEL sur ce slot/date
  // oneOffRows / overrideRows : vides
  // recurringRows : simule le comportement Prisma — exclut le slot si id.not correspond
  prisma.classTimetableSlotException.findMany.mockResolvedValue([]);
  prisma.classTimetableSlot.findMany.mockImplementation(
    (query: Record<string, unknown>) => {
      const where = query?.where as Record<string, unknown> | undefined;
      const idFilter = where?.id as Record<string, unknown> | undefined;
      // Si la requête exclut slot-anglais (ignoreRecurringSlotId passé), retourner vide
      if (idFilter?.not === "slot-anglais") return Promise.resolve([]);
      // Sinon retourner le slot récurrent (vrai conflit quand ignoreRecurringSlotId absent)
      return Promise.resolve([
        {
          id: "slot-anglais",
          classId: "class-1",
          teacherUserId: "albert",
          room: "B45",
        },
      ]);
    },
  );
  prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);

  // findFirst pour récupérer le one-off existant
  prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue(EXISTING_ONE_OFF);
  // update retourne le one-off modifié
  prisma.classTimetableOneOffSlot.update.mockResolvedValue({
    ...EXISTING_ONE_OFF,
    room: "B46",
  });
});

// ─── Cas passants — toute modification sur le one-off doit réussir ────────────

describe("updateOneOffSlot — ne conflicte pas avec le slot récurrent source (regression)", () => {
  it("change de salle uniquement — pas de conflit (regression)", async () => {
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", { room: "B46" }),
    ).resolves.toBeDefined();
  });

  it("change d'horaire — pas de conflit avec le slot récurrent", async () => {
    prisma.classTimetableOneOffSlot.update.mockResolvedValue({
      ...EXISTING_ONE_OFF,
      startMinute: 520,
    });
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", {
        startMinute: 520,
      }),
    ).resolves.toBeDefined();
  });

  it("change heure de fin — pas de conflit", async () => {
    prisma.classTimetableOneOffSlot.update.mockResolvedValue({
      ...EXISTING_ONE_OFF,
      endMinute: 570,
    });
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", { endMinute: 570 }),
    ).resolves.toBeDefined();
  });

  it("change salle ET horaire — pas de conflit", async () => {
    prisma.classTimetableOneOffSlot.update.mockResolvedValue({
      ...EXISTING_ONE_OFF,
      startMinute: 520,
      room: "B46",
    });
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", {
        startMinute: 520,
        room: "B46",
      }),
    ).resolves.toBeDefined();
  });

  it("un one-off sans sourceSlotId détecte quand même un vrai conflit teacher", async () => {
    // One-off indépendant (pas de sourceSlotId)
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue({
      ...EXISTING_ONE_OFF,
      sourceSlotId: null,
    });
    // Part 2 : le slot récurrent est considéré comme vrai conflit (pas d'ignoreRecurringSlotId)
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-anglais",
        classId: "class-1",
        teacherUserId: "albert",
        room: "B45",
      },
    ]);

    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", { room: "B46" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève NotFoundException si le one-off n'existe pas", async () => {
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue(null);
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-missing", {
        room: "B46",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("lève BadRequestException si aucun champ n'est fourni", async () => {
    await expect(
      service.updateOneOffSlot(ADMIN, "school-1", "oof-1", {}),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── Vérification que ignoreRecurringSlotId est bien transmis ─────────────────

describe("updateOneOffSlot — passage de ignoreRecurringSlotId", () => {
  it("appelle ensureNoOccurrenceConflicts avec ignoreRecurringSlotId = sourceSlotId", async () => {
    const spy = jest.spyOn(service as any, "ensureNoOccurrenceConflicts");

    await service.updateOneOffSlot(ADMIN, "school-1", "oof-1", { room: "B46" });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreRecurringSlotId: "slot-anglais" }),
    );
  });

  it("n'envoie pas ignoreRecurringSlotId si le one-off n'a pas de sourceSlotId", async () => {
    prisma.classTimetableOneOffSlot.findFirst.mockResolvedValue({
      ...EXISTING_ONE_OFF,
      sourceSlotId: null,
    });
    prisma.classTimetableSlot.findMany.mockResolvedValue([]); // pas de conflit
    prisma.classTimetableOneOffSlot.update.mockResolvedValue({
      ...EXISTING_ONE_OFF,
    });

    const spy = jest.spyOn(service as any, "ensureNoOccurrenceConflicts");

    await service.updateOneOffSlot(ADMIN, "school-1", "oof-1", { room: "B46" });

    expect(spy).toHaveBeenCalledWith(
      expect.not.objectContaining({ ignoreRecurringSlotId: expect.anything() }),
    );
  });
});
