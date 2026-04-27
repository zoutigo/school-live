/**
 * Régression : createOneOffSlot avec sourceSlotId ne doit pas conflictuer
 * avec le slot récurrent source.
 *
 * Bug : ensureNoOccurrenceConflicts n'ignorait pas le slot récurrent parent
 * alors que sourceSlotId était fourni, provoquant une fausse erreur
 * "Conflicting occurrence for class" quand on modifiait une seule occurrence.
 */
import { BadRequestException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(id: string) {
  return {
    id,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" as const }],
    profileCompleted: true,
    firstName: "Admin",
    lastName: id,
  };
}

// Occurrence résolue simulant le créneau récurrent Anglais lundi 08:45-10:00
function makeAnglaisOccurrence(slotId = "slot-anglais") {
  return {
    id: slotId,
    source: "RECURRING" as const,
    status: "PLANNED" as const,
    occurrenceDate: "2026-04-27",
    weekday: 1,
    startMinute: 525, // 08:45
    endMinute: 600, // 10:00
    room: "B45",
    reason: null,
    subject: { id: "sub-anglais", name: "Anglais" },
    teacherUser: {
      id: "albert",
      firstName: "Albert",
      lastName: "Mvondo",
      email: null,
    },
    slotId,
    exceptionId: undefined,
    oneOffSlotId: undefined,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const prisma = {
  classTimetableSlot: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  classTimetableOneOffSlot: { findMany: jest.fn(), create: jest.fn() },
  classTimetableSlotException: { findMany: jest.fn() },
  classTimetableSubjectStyle: { findFirst: jest.fn(), upsert: jest.fn() },
  schoolMembership: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  subject: { findFirst: jest.fn() },
  classCurriculum: { findFirst: jest.fn() },
};

const service = new TimetableService(prisma as never);

const ADMIN = makeUser("admin-1");

const ONE_OFF_PAYLOAD_BASE = {
  schoolYearId: "sy-1",
  occurrenceDate: "2026-04-27",
  startMinute: 520, // 08:40 — 5 min avant le slot source (525)
  endMinute: 600, // 10:00
  subjectId: "sub-anglais",
  teacherUserId: "albert",
  room: "B45",
  status: "PLANNED" as const,
};

beforeEach(() => {
  jest.clearAllMocks();

  // Stubs de base
  (service as any).getEffectiveSchoolId = (_u: unknown, s: string) => s;
  (service as any).assertMinuteRange = jest.fn();
  (service as any).toDateOnly = (s: string) => new Date(s);
  (service as any).dateToYmd = (d: Date) => d.toISOString().slice(0, 10);
  (service as any).weekdayMondayFirst = () => 1; // lundi

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
  (service as any).ensureAutoSubjectStyleExists = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).assertCanManageOneOffSlot = jest
    .fn()
    .mockResolvedValue(undefined);

  // fetchClassTimetableData retourne l'occurrence Anglais 08:45-10:00
  (service as any).fetchClassTimetableData = jest.fn().mockResolvedValue({
    slots: [],
    oneOffSlots: [],
    slotExceptions: [],
    calendarEvents: [],
    subjectStyles: [],
    occurrences: [makeAnglaisOccurrence("slot-anglais")],
  });

  // Requêtes directes de ensureNoOccurrenceConflicts (parties 2-4) : aucun conflit
  prisma.classTimetableSlotException.findMany.mockResolvedValue([]); // suppressedRecurring
  prisma.classTimetableSlot.findMany.mockResolvedValue([]); // recurringRows
  prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]); // oneOffRows + create

  prisma.classTimetableOneOffSlot.create.mockResolvedValue({ id: "oof-new" });
});

// ─── Régression principale ────────────────────────────────────────────────────

describe("createOneOffSlot — conflit avec le slot récurrent source", () => {
  it("n'échoue PAS quand le nouveau créneau chevauche son slot source (regression)", async () => {
    // 08:40-10:00 chevauche 08:45-10:00 → faux conflit avant le fix
    await expect(
      service.createOneOffSlot(ADMIN, "school-1", "class-1", {
        ...ONE_OFF_PAYLOAD_BASE,
        sourceSlotId: "slot-anglais", // ← le slot source est fourni
      }),
    ).resolves.toBeDefined();
  });

  it("lève BadRequestException quand sourceSlotId est absent et qu'il y a un vrai chevauchement", async () => {
    // Même occurrence dans fetchClassTimetableData, mais pas de sourceSlotId
    await expect(
      service.createOneOffSlot(ADMIN, "school-1", "class-1", {
        ...ONE_OFF_PAYLOAD_BASE,
        // pas de sourceSlotId
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException quand sourceSlotId est fourni mais qu'un AUTRE slot conflicte", async () => {
    // fetchClassTimetableData retourne deux occurrences :
    // - slot-anglais (le source, doit être ignoré)
    // - slot-autre (un autre cours sur le même créneau)
    (service as any).fetchClassTimetableData = jest.fn().mockResolvedValue({
      slots: [],
      oneOffSlots: [],
      slotExceptions: [],
      calendarEvents: [],
      subjectStyles: [],
      occurrences: [
        makeAnglaisOccurrence("slot-anglais"),
        {
          ...makeAnglaisOccurrence("slot-autre"),
          slotId: "slot-autre",
          id: "slot-autre",
          subject: { id: "sub-maths", name: "Maths" },
        },
      ],
    });

    await expect(
      service.createOneOffSlot(ADMIN, "school-1", "class-1", {
        ...ONE_OFF_PAYLOAD_BASE,
        sourceSlotId: "slot-anglais", // le source est ignoré, mais slot-autre conflicte
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("n'échoue PAS si les temps ne se chevauchent pas (contrôle sain)", async () => {
    // 10:05-11:00 — après la fin du slot Anglais (10:00)
    await expect(
      service.createOneOffSlot(ADMIN, "school-1", "class-1", {
        ...ONE_OFF_PAYLOAD_BASE,
        startMinute: 605, // 10:05
        endMinute: 660, // 11:00
        // pas de sourceSlotId
      }),
    ).resolves.toBeDefined();
  });
});

// ─── Vérification que fetchClassTimetableData reçoit les bons paramètres ────

describe("createOneOffSlot — passage de ignoreRecurringSlotId", () => {
  it("appelle ensureNoOccurrenceConflicts avec ignoreRecurringSlotId = sourceSlotId", async () => {
    const spy = jest.spyOn(service as any, "ensureNoOccurrenceConflicts");

    await service.createOneOffSlot(ADMIN, "school-1", "class-1", {
      ...ONE_OFF_PAYLOAD_BASE,
      sourceSlotId: "slot-anglais",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreRecurringSlotId: "slot-anglais" }),
    );
  });

  it("appelle ensureNoOccurrenceConflicts sans ignoreRecurringSlotId quand sourceSlotId est absent", async () => {
    // Pour ce test, on stub fetchClassTimetableData sans occurrence conflictuelle
    (service as any).fetchClassTimetableData = jest.fn().mockResolvedValue({
      slots: [],
      oneOffSlots: [],
      slotExceptions: [],
      calendarEvents: [],
      subjectStyles: [],
      occurrences: [],
    });

    const spy = jest.spyOn(service as any, "ensureNoOccurrenceConflicts");

    await service.createOneOffSlot(ADMIN, "school-1", "class-1", {
      ...ONE_OFF_PAYLOAD_BASE,
      startMinute: 605,
      endMinute: 660,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.not.objectContaining({ ignoreRecurringSlotId: expect.anything() }),
    );
  });
});
