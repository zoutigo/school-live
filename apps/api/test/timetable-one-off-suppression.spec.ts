/**
 * Régression : quand un one-off slot possède un sourceSlotId, l'occurrence
 * récurrente du même jour doit disparaître de la liste des occurrences.
 *
 * Bug : resolveOccurrencesForDateRange ignorait sourceSlotId → le slot récurrent
 * ET le one-off apparaissaient tous les deux dans l'agenda (double entrée).
 */
import { TimetableService } from "../src/timetable/timetable.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// lundi 27 avril 2026 (confirmé par l'émulateur)
const MONDAY = new Date(Date.UTC(2026, 3, 27));

function makeSlot(id: string, weekday = 1, start = 525, end = 600) {
  return {
    id,
    weekday,
    startMinute: start,
    endMinute: end,
    activeFromDate: null,
    activeToDate: null,
    room: "B45",
    subject: { id: "sub-anglais", name: "Anglais" },
    teacherUser: {
      id: "albert",
      firstName: "Albert",
      lastName: "M",
      email: null,
    },
  };
}

function makeOneOff(
  id: string,
  occurrenceDate: Date,
  start: number,
  end: number,
  sourceSlotId: string | null,
  status: "PLANNED" | "CANCELLED" = "PLANNED",
) {
  return {
    id,
    occurrenceDate,
    startMinute: start,
    endMinute: end,
    room: "B45",
    status,
    sourceSlotId,
    subject: { id: "sub-anglais", name: "Anglais" },
    teacherUser: {
      id: "albert",
      firstName: "Albert",
      lastName: "M",
      email: null,
    },
  };
}

// Accès à la méthode privée via cast
function resolveOccurrences(service: TimetableService, params: any) {
  return (service as any).resolveOccurrencesForDateRange(params) as Array<{
    source: string;
    status: string;
    occurrenceDate: string;
    startMinute: number;
    endMinute: number;
    slotId?: string;
    oneOffSlotId?: string;
  }>;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const prisma = {};
const service = new TimetableService(prisma as never);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("resolveOccurrencesForDateRange — suppression par one-off sourceSlotId", () => {
  it("supprime l'occurrence récurrente quand un one-off PLANNED la remplace (regression)", () => {
    const slot = makeSlot("slot-anglais");
    // one-off 08:40-10:00 remplace le slot récurrent 08:45-10:00
    const oneOff = makeOneOff("oof-1", MONDAY, 520, 600, "slot-anglais");

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: MONDAY,
      slots: [slot],
      oneOffSlots: [oneOff],
      slotExceptions: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ONE_OFF");
    expect(result[0].startMinute).toBe(520);
    expect(result[0].oneOffSlotId).toBe("oof-1");
  });

  it("supprime l'occurrence récurrente quand un one-off CANCELLED la remplace", () => {
    const slot = makeSlot("slot-anglais");
    const oneOff = makeOneOff(
      "oof-cancel",
      MONDAY,
      525,
      600,
      "slot-anglais",
      "CANCELLED",
    );

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: MONDAY,
      slots: [slot],
      oneOffSlots: [oneOff],
      slotExceptions: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ONE_OFF");
    expect(result[0].status).toBe("CANCELLED");
  });

  it("garde l'occurrence récurrente si le one-off n'a pas de sourceSlotId (créneau indépendant)", () => {
    const slot = makeSlot("slot-anglais");
    // one-off sans sourceSlotId — créneau sur un autre horaire, sans lien avec le récurrent
    const oneOff = makeOneOff("oof-independent", MONDAY, 750, 840, null);

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: MONDAY,
      slots: [slot],
      oneOffSlots: [oneOff],
      slotExceptions: [],
    });

    expect(result).toHaveLength(2);
    expect(result.some((o) => o.source === "RECURRING")).toBe(true);
    expect(result.some((o) => o.source === "ONE_OFF")).toBe(true);
  });

  it("supprime uniquement l'occurrence du bon lundi (le lundi suivant reste récurrent)", () => {
    const slot = makeSlot("slot-anglais"); // lundi récurrent (weekday=1)
    const NEXT_MONDAY = new Date(Date.UTC(2026, 4, 4)); // lundi 4 mai 2026
    // one-off lundi 27 avril remplace seulement cette date
    const oneOff = makeOneOff("oof-monday", MONDAY, 520, 600, "slot-anglais");

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: NEXT_MONDAY,
      slots: [slot],
      oneOffSlots: [oneOff],
      slotExceptions: [],
    });

    const firstMonday = result.filter((o) => o.occurrenceDate === "2026-04-27");
    const secondMonday = result.filter(
      (o) => o.occurrenceDate === "2026-05-04",
    );

    // 27 avril → one-off (récurrent supprimé)
    expect(firstMonday).toHaveLength(1);
    expect(firstMonday[0].source).toBe("ONE_OFF");

    // 4 mai → récurrent intact
    expect(secondMonday).toHaveLength(1);
    expect(secondMonday[0].source).toBe("RECURRING");
  });

  it("ne supprime pas un slot récurrent différent (sourceSlotId non correspondant)", () => {
    const slotA = makeSlot("slot-anglais", 1, 525, 600);
    const slotB = makeSlot("slot-maths", 1, 660, 750);
    // one-off remplace slot-anglais uniquement
    const oneOff = makeOneOff("oof-1", MONDAY, 520, 600, "slot-anglais");

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: MONDAY,
      slots: [slotA, slotB],
      oneOffSlots: [oneOff],
      slotExceptions: [],
    });

    expect(result).toHaveLength(2);
    const mathsOcc = result.find((o) => o.source === "RECURRING");
    expect(mathsOcc?.slotId).toBe("slot-maths");
    const anglaisOcc = result.find((o) => o.source === "ONE_OFF");
    expect(anglaisOcc?.oneOffSlotId).toBe("oof-1");
  });

  it("le one-off prend bien le pas sur un slot exception CANCEL quand les deux existent", () => {
    const slot = makeSlot("slot-anglais");
    const exception = {
      id: "exc-1",
      slotId: "slot-anglais",
      occurrenceDate: MONDAY,
      type: "CANCEL" as const,
      subjectId: null,
      teacherUserId: null,
      startMinute: null,
      endMinute: null,
      room: null,
      reason: "Férié",
      slot: {
        id: "slot-anglais",
        weekday: 1,
        startMinute: 525,
        endMinute: 600,
        room: "B45",
        subject: { id: "sub-anglais", name: "Anglais" },
        teacherUser: {
          id: "albert",
          firstName: "Albert",
          lastName: "M",
          email: null,
        },
      },
      subject: null,
      teacherUser: null,
    };
    const oneOff = makeOneOff("oof-1", MONDAY, 520, 600, "slot-anglais");

    const result = resolveOccurrences(service, {
      fromDate: MONDAY,
      toDate: MONDAY,
      slots: [slot],
      oneOffSlots: [oneOff],
      slotExceptions: [exception],
    });

    // Le one-off supprime le récurrent avant même qu'on regarde l'exception
    // → seul le one-off apparaît
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("ONE_OFF");
  });
});
