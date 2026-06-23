import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

const prisma = {
  $transaction: jest.fn(),
  room: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  classTimetableSlot: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableOneOffSlot: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableSlotException: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  schoolMembership: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  subject: { findFirst: jest.fn() },
  class: { findFirst: jest.fn() },
  classCurriculum: { findFirst: jest.fn() },
  classTimetableSubjectStyle: { findFirst: jest.fn(), upsert: jest.fn() },
};

const service = new TimetableService(prisma as never);

beforeEach(() => {
  jest.clearAllMocks();
});

function callEnsureNoSlotConflicts(input: Record<string, unknown>) {
  return (
    service as unknown as {
      ensureNoSlotConflicts: (input: Record<string, unknown>) => Promise<void>;
    }
  ).ensureNoSlotConflicts(input);
}

describe("ensureNoSlotConflicts — capacité et statut de salle", () => {
  const baseInput = {
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    weekday: 2,
    startMinute: 480,
    endMinute: 570,
    teacherUserId: "teacher-1",
    activeFromDate: null,
    activeToDate: null,
    locale: "fr" as const,
  };

  it("ne fait aucune vérification de salle si roomId est null", async () => {
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);

    await expect(
      callEnsureNoSlotConflicts({ ...baseInput, roomId: null }),
    ).resolves.toBeUndefined();
    expect(prisma.room.findUnique).not.toHaveBeenCalled();
  });

  it("rejette si la salle a le statut UNAVAILABLE", async () => {
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.room.findUnique.mockResolvedValue({
      id: "room-1",
      status: "UNAVAILABLE",
      maxConcurrentSlots: 1,
    });

    await expect(
      callEnsureNoSlotConflicts({ ...baseInput, roomId: "room-1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette une salle mono-créneau (maxConcurrentSlots=1) déjà réservée sur le créneau", async () => {
    prisma.classTimetableSlot.findMany
      .mockResolvedValueOnce([]) // classConflicts
      .mockResolvedValueOnce([]) // teacherConflicts
      .mockResolvedValueOnce([
        { id: "other-slot", activeFromDate: null, activeToDate: null },
      ]); // roomConflicts
    prisma.room.findUnique.mockResolvedValue({
      id: "room-1",
      status: "AVAILABLE",
      maxConcurrentSlots: 1,
    });

    await expect(
      callEnsureNoSlotConflicts({ ...baseInput, roomId: "room-1" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("autorise un gymnase polyvalent (maxConcurrentSlots=3) avec 2 réservations existantes", async () => {
    prisma.classTimetableSlot.findMany
      .mockResolvedValueOnce([]) // classConflicts
      .mockResolvedValueOnce([]) // teacherConflicts
      .mockResolvedValueOnce([
        { id: "slot-a", activeFromDate: null, activeToDate: null },
        { id: "slot-b", activeFromDate: null, activeToDate: null },
      ]); // roomConflicts
    prisma.room.findUnique.mockResolvedValue({
      id: "room-gym",
      status: "AVAILABLE",
      maxConcurrentSlots: 3,
    });

    await expect(
      callEnsureNoSlotConflicts({ ...baseInput, roomId: "room-gym" }),
    ).resolves.toBeUndefined();
  });

  it("rejette le gymnase polyvalent une fois le seuil de 3 occupations atteint", async () => {
    prisma.classTimetableSlot.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "slot-a", activeFromDate: null, activeToDate: null },
        { id: "slot-b", activeFromDate: null, activeToDate: null },
        { id: "slot-c", activeFromDate: null, activeToDate: null },
      ]);
    prisma.room.findUnique.mockResolvedValue({
      id: "room-gym",
      status: "AVAILABLE",
      maxConcurrentSlots: 3,
    });

    await expect(
      callEnsureNoSlotConflicts({ ...baseInput, roomId: "room-gym" }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe("resolveRoomReference", () => {
  function callResolveRoomReference(
    schoolId: string,
    roomId: string | null | undefined,
    room: string | null | undefined,
  ) {
    return (
      service as unknown as {
        resolveRoomReference: (
          schoolId: string,
          roomId: string | null | undefined,
          room: string | null | undefined,
          locale?: "fr" | "en",
        ) => Promise<{ roomId: string | null; room: string | null }>;
      }
    ).resolveRoomReference(schoolId, roomId, room);
  }

  it("résout via roomId si fourni et que la salle existe dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1", name: "B14" });

    const result = await callResolveRoomReference(
      "school-1",
      "room-1",
      undefined,
    );

    expect(result).toEqual({ roomId: "room-1", room: "B14" });
  });

  it("lève NotFoundException si roomId est fourni mais introuvable dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    await expect(
      callResolveRoomReference("school-1", "room-unknown", undefined),
    ).rejects.toThrow(NotFoundException);
  });

  it("retombe sur le texte libre et tente une correspondance par nom si roomId est absent", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-2" });

    const result = await callResolveRoomReference(
      "school-1",
      undefined,
      "Gymnase",
    );

    expect(result).toEqual({ roomId: "room-2", room: "Gymnase" });
  });

  it("retourne roomId null si le texte libre ne correspond à aucune salle connue", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    const result = await callResolveRoomReference(
      "school-1",
      undefined,
      "Salle inconnue",
    );

    expect(result).toEqual({ roomId: null, room: "Salle inconnue" });
  });

  it("retourne tout à null si ni roomId ni room ne sont fournis", async () => {
    const result = await callResolveRoomReference(
      "school-1",
      undefined,
      undefined,
    );

    expect(result).toEqual({ roomId: null, room: null });
    expect(prisma.room.findFirst).not.toHaveBeenCalled();
  });
});
