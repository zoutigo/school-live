import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  room: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableSlot: { findMany: jest.fn() },
  classTimetableOneOffSlot: { findMany: jest.fn() },
  classTimetableSlotException: { findMany: jest.fn() },
  $transaction: jest.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
};

const mailService = {};

const roomStatusChangeNotificationsService = {
  enqueue: jest.fn(),
};

const service = new ManagementService(
  prisma as never,
  mailService as never,
  roomStatusChangeNotificationsService as never,
);

const currentUser = {
  id: "admin-1",
  firstName: "Aline",
  lastName: "Admin",
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((ops: Array<Promise<unknown>>) =>
    Promise.all(ops),
  );
});

describe("ManagementService — Room CRUD", () => {
  it("crée une salle avec les valeurs par défaut", async () => {
    prisma.room.findUnique.mockResolvedValue(null);
    prisma.room.create.mockResolvedValue({
      id: "room-1",
      schoolId: "school-1",
      name: "Gymnase",
      description: null,
      capacity: null,
      maxConcurrentSlots: 1,
      status: "AVAILABLE",
    });

    const result = await service.createRoom("school-1", { name: "Gymnase" });

    expect(prisma.room.create).toHaveBeenCalledWith({
      data: {
        schoolId: "school-1",
        name: "Gymnase",
        description: undefined,
        capacity: undefined,
        maxConcurrentSlots: 1,
        status: "AVAILABLE",
      },
    });
    expect(result.name).toBe("Gymnase");
  });

  it("rejette la création si une salle du même nom existe déjà dans l'école", async () => {
    prisma.room.findUnique.mockResolvedValue({ id: "room-existing" });

    await expect(
      service.createRoom("school-1", { name: "Gymnase" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.room.create).not.toHaveBeenCalled();
  });

  it("rejette la création si le nom est vide", async () => {
    await expect(service.createRoom("school-1", { name: "" })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("met à jour une salle existante sans déclencher de notification quand aucun acteur n'est fourni", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });
    prisma.room.update.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "MAINTENANCE",
    });

    const result = await service.updateRoom("school-1", "room-1", {
      status: "MAINTENANCE",
    });

    expect(prisma.room.update).toHaveBeenCalledWith({
      where: { id: "room-1" },
      data: {
        name: undefined,
        description: undefined,
        capacity: undefined,
        maxConcurrentSlots: undefined,
        status: "MAINTENANCE",
      },
    });
    expect(result.status).toBe("MAINTENANCE");
    expect(roomStatusChangeNotificationsService.enqueue).not.toHaveBeenCalled();
  });

  it("déclenche une notification de changement de statut de salle quand le statut change et qu'un acteur est fourni", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });
    prisma.room.update.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "MAINTENANCE",
    });

    await service.updateRoom(
      "school-1",
      "room-1",
      { status: "MAINTENANCE" },
      currentUser,
    );

    expect(roomStatusChangeNotificationsService.enqueue).toHaveBeenCalledWith({
      schoolId: "school-1",
      roomId: "room-1",
      roomName: "B14",
      previousStatus: "AVAILABLE",
      newStatus: "MAINTENANCE",
      actorUserId: "admin-1",
      actorFullName: "Aline Admin",
    });
  });

  it("ne déclenche pas de notification quand le statut ne change pas, même avec un acteur fourni", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });
    prisma.room.findUnique.mockResolvedValue(null);
    prisma.room.update.mockResolvedValue({
      id: "room-1",
      name: "Salle B",
      status: "AVAILABLE",
    });

    await service.updateRoom(
      "school-1",
      "room-1",
      { name: "Salle B" },
      currentUser,
    );

    expect(roomStatusChangeNotificationsService.enqueue).not.toHaveBeenCalled();
  });

  it("propage l'erreur si l'enqueue de la notification de statut échoue", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });
    prisma.room.update.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "UNAVAILABLE",
    });
    roomStatusChangeNotificationsService.enqueue.mockRejectedValue(
      new Error("redis down"),
    );

    await expect(
      service.updateRoom(
        "school-1",
        "room-1",
        { status: "UNAVAILABLE" },
        currentUser,
      ),
    ).rejects.toThrow("redis down");
  });

  it("lève NotFoundException si la salle à mettre à jour n'existe pas dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    await expect(
      service.updateRoom("school-1", "room-unknown", { status: "MAINTENANCE" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("lève BadRequestException si aucun champ n'est fourni à la mise à jour", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });

    await expect(service.updateRoom("school-1", "room-1", {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejette la mise à jour si le nouveau nom est déjà utilisé par une autre salle", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });
    prisma.room.findUnique.mockResolvedValue({ id: "room-2" });

    await expect(
      service.updateRoom("school-1", "room-1", { name: "Salle B" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("supprime une salle existante", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });
    prisma.room.delete.mockResolvedValue({});

    const result = await service.deleteRoom("school-1", "room-1");

    expect(prisma.room.delete).toHaveBeenCalledWith({
      where: { id: "room-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("lève NotFoundException à la suppression d'une salle inexistante", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteRoom("school-1", "room-unknown"),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("ManagementService — listAvailableRooms", () => {
  it("marque une salle mono-créneau comme indisponible si elle est déjà occupée sur le créneau", async () => {
    prisma.room.findMany.mockResolvedValue([
      {
        id: "room-1",
        schoolId: "school-1",
        name: "B14",
        maxConcurrentSlots: 1,
        status: "AVAILABLE",
      },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      { roomId: "room-1" },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([]);

    const result = await service.listAvailableRooms("school-1", {
      weekday: 2,
      startMinute: 480,
      endMinute: 570,
    });

    expect(result).toHaveLength(1);
    expect(result[0].isAvailable).toBe(false);
    expect(result[0].occupiedSlots).toBe(1);
  });

  it("garde une salle polyvalente disponible si l'occupation reste sous le seuil maxConcurrentSlots", async () => {
    prisma.room.findMany.mockResolvedValue([
      {
        id: "room-gym",
        schoolId: "school-1",
        name: "Gymnase",
        maxConcurrentSlots: 3,
        status: "AVAILABLE",
      },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      { roomId: "room-gym" },
      { roomId: "room-gym" },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([]);

    const result = await service.listAvailableRooms("school-1", {
      weekday: 2,
      startMinute: 480,
      endMinute: 570,
    });

    expect(result[0].occupiedSlots).toBe(2);
    expect(result[0].isAvailable).toBe(true);
  });

  it("marque une salle indisponible si son statut n'est pas AVAILABLE, même sans occupation", async () => {
    prisma.room.findMany.mockResolvedValue([
      {
        id: "room-1",
        schoolId: "school-1",
        name: "B14",
        maxConcurrentSlots: 1,
        status: "MAINTENANCE",
      },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany.mockResolvedValue([]);

    const result = await service.listAvailableRooms("school-1", {
      weekday: 2,
      startMinute: 480,
      endMinute: 570,
    });

    expect(result[0].isAvailable).toBe(false);
  });
});

describe("ManagementService — listRooms (pagination/search/filtres)", () => {
  it("applique page=1/limit=20 par défaut et retourne items + meta via schoolId seul", async () => {
    prisma.room.findMany.mockResolvedValue([{ id: "room-1", name: "B14" }]);
    prisma.room.count.mockResolvedValue(1);

    const result = await service.listRooms("school-1", {});

    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "school-1" },
        orderBy: [{ name: "asc" }],
        skip: 0,
        take: 20,
      }),
    );
    expect(prisma.room.count).toHaveBeenCalledWith({
      where: { schoolId: "school-1" },
    });
    expect(result).toEqual({
      items: [{ id: "room-1", name: "B14" }],
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it("applique page/limit demandés et calcule skip", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.count.mockResolvedValue(0);

    await service.listRooms("school-1", { page: 3, limit: 10 });

    expect(prisma.room.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it("filtre par recherche sur le nom OU la description", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.count.mockResolvedValue(0);

    await service.listRooms("school-1", { search: "gym" });

    const where = prisma.room.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      schoolId: "school-1",
      AND: [
        {
          OR: [
            { name: { contains: "gym", mode: "insensitive" } },
            { description: { contains: "gym", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("filtre par statut", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.count.mockResolvedValue(0);

    await service.listRooms("school-1", { status: "MAINTENANCE" });

    const where = prisma.room.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      schoolId: "school-1",
      AND: [{ status: "MAINTENANCE" }],
    });
  });

  it("filtre par simultanéité SINGLE (maxConcurrentSlots = 1)", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.count.mockResolvedValue(0);

    await service.listRooms("school-1", { simultaneity: "SINGLE" });

    const where = prisma.room.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      schoolId: "school-1",
      AND: [{ maxConcurrentSlots: 1 }],
    });
  });

  it("filtre par simultanéité MULTIPLE (maxConcurrentSlots > 1)", async () => {
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.count.mockResolvedValue(0);

    await service.listRooms("school-1", { simultaneity: "MULTIPLE" });

    const where = prisma.room.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      schoolId: "school-1",
      AND: [{ maxConcurrentSlots: { gt: 1 } }],
    });
  });

  it("lève BadRequestException si la plage de disponibilité est invalide (toDate < fromDate)", async () => {
    await expect(
      service.listRooms("school-1", {
        availabilityFromDate: "2026-01-11",
        availabilityToDate: "2026-01-05",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException si la plage horaire de disponibilité est invalide", async () => {
    await expect(
      service.listRooms("school-1", {
        availabilityFromDate: "2026-01-05",
        availabilityStartMinute: 600,
        availabilityEndMinute: 500,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("exclut une salle occupée sur le créneau demandé (disponibilité date unique)", async () => {
    // 2026-01-05 est un lundi (weekday=1)
    prisma.room.findMany.mockResolvedValue([
      { id: "room-1", name: "B14", maxConcurrentSlots: 1 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        roomId: "room-1",
        weekday: 1,
        activeFromDate: null,
        activeToDate: null,
      },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([]) // override détaillées
      .mockResolvedValueOnce([]); // cancel/override (suppression)

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("inclut une salle libre sur le créneau demandé (disponibilité date unique)", async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: "room-1", name: "B14", maxConcurrentSlots: 1 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("exclut une salle qui n'est libre qu'un jour sur une plage de dates (règle : libre sur toute la plage)", async () => {
    // 2026-01-05 (lundi, weekday=1) occupé, 2026-01-06 (mardi, weekday=2) libre
    prisma.room.findMany.mockResolvedValue([
      { id: "room-1", name: "B14", maxConcurrentSlots: 1 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        roomId: "room-1",
        weekday: 1,
        activeFromDate: null,
        activeToDate: null,
      },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityToDate: "2026-01-06",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("inclut une salle libre chaque jour d'une plage de dates", async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: "room-1", name: "B14", maxConcurrentSlots: 1 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityToDate: "2026-01-06",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("respecte maxConcurrentSlots > 1 : occupation partielle reste disponible", async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: "room-gym", name: "Gymnase", maxConcurrentSlots: 2 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        roomId: "room-gym",
        weekday: 1,
        activeFromDate: null,
        activeToDate: null,
      },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
    });

    expect(result.items).toHaveLength(1);
  });

  it("pagine en mémoire les résultats filtrés par disponibilité", async () => {
    prisma.room.findMany.mockResolvedValue([
      { id: "room-1", name: "Salle A", maxConcurrentSlots: 1 },
      { id: "room-2", name: "Salle B", maxConcurrentSlots: 1 },
      { id: "room-3", name: "Salle C", maxConcurrentSlots: 1 },
    ]);
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.listRooms("school-1", {
      availabilityFromDate: "2026-01-05",
      availabilityStartMinute: 480,
      availabilityEndMinute: 570,
      page: 2,
      limit: 1,
    });

    expect(result.total).toBe(3);
    expect(result.items).toEqual([
      { id: "room-2", name: "Salle B", maxConcurrentSlots: 1 },
    ]);
  });
});

describe("ManagementService — getRoom", () => {
  it("retourne la salle si elle existe dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });

    const result = await service.getRoom("school-1", "room-1");

    expect(prisma.room.findFirst).toHaveBeenCalledWith({
      where: { id: "room-1", schoolId: "school-1" },
    });
    expect(result).toEqual({
      id: "room-1",
      name: "B14",
      status: "AVAILABLE",
    });
  });

  it("lève NotFoundException si la salle n'existe pas dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    await expect(service.getRoom("school-1", "room-unknown")).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe("ManagementService — getRoomCalendar", () => {
  it("lève NotFoundException si la salle n'existe pas dans l'école", async () => {
    prisma.room.findFirst.mockResolvedValue(null);

    await expect(
      service.getRoomCalendar(
        "school-1",
        "room-unknown",
        "2026-01-05",
        "2026-01-11",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("lève BadRequestException si les dates sont invalides", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });

    await expect(
      service.getRoomCalendar("school-1", "room-1", "not-a-date", "2026-01-11"),
    ).rejects.toThrow(BadRequestException);
  });

  it("retourne les occurrences récurrentes pour la salle sur la plage de dates, triées", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });
    // 2026-01-05 is a Monday (weekday=1), 2026-01-06 is a Tuesday (weekday=2)
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        weekday: 1,
        startMinute: 480,
        endMinute: 570,
        activeFromDate: null,
        activeToDate: null,
        class: { id: "class-1", name: "6eme A" },
        subject: { id: "sub-1", name: "Maths" },
        teacherUser: { firstName: "Alice", lastName: "Martin" },
      },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([]) // exceptions overriding to this room
      .mockResolvedValueOnce([]); // cancel/override exceptions across school

    const result = await service.getRoomCalendar(
      "school-1",
      "room-1",
      "2026-01-05",
      "2026-01-11",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      occurrenceDate: "2026-01-05",
      className: "6eme A",
      subjectName: "Maths",
      teacherName: "Alice Martin",
    });
  });

  it("supprime l'occurrence récurrente si une exception CANCEL existe pour cette date", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });
    prisma.classTimetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-1",
        weekday: 1,
        startMinute: 480,
        endMinute: 570,
        activeFromDate: null,
        activeToDate: null,
        class: { id: "class-1", name: "6eme A" },
        subject: { id: "sub-1", name: "Maths" },
        teacherUser: { firstName: "Alice", lastName: "Martin" },
      },
    ]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          slotId: "slot-1",
          occurrenceDate: new Date("2026-01-05T00:00:00.000Z"),
        },
      ]);

    const result = await service.getRoomCalendar(
      "school-1",
      "room-1",
      "2026-01-05",
      "2026-01-05",
    );

    expect(result).toHaveLength(0);
  });

  it("inclut les créneaux ponctuels (one-off) planifiés dans la plage", async () => {
    prisma.room.findFirst.mockResolvedValue({ id: "room-1" });
    prisma.classTimetableSlot.findMany.mockResolvedValue([]);
    prisma.classTimetableOneOffSlot.findMany.mockResolvedValue([
      {
        id: "oneoff-1",
        occurrenceDate: new Date("2026-01-07T00:00:00.000Z"),
        startMinute: 600,
        endMinute: 660,
        class: { id: "class-2", name: "5eme B" },
        subject: { id: "sub-2", name: "Sport" },
        teacherUser: { firstName: "Paul", lastName: "Durand" },
      },
    ]);
    prisma.classTimetableSlotException.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getRoomCalendar(
      "school-1",
      "room-1",
      "2026-01-05",
      "2026-01-11",
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      occurrenceDate: "2026-01-07",
      className: "5eme B",
      subjectName: "Sport",
      teacherName: "Paul Durand",
    });
  });
});
