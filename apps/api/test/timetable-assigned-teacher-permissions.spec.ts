import { ForbiddenException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

type SchoolRole =
  | "SCHOOL_ADMIN"
  | "SCHOOL_MANAGER"
  | "SUPERVISOR"
  | "TEACHER"
  | "PARENT"
  | "STUDENT";

function makeUser(id: string, schoolRole: SchoolRole) {
  return {
    id,
    firstName: "User",
    lastName: id,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: schoolRole }],
    profileCompleted: true,
  };
}

const prisma = {
  classTimetableSlot: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  classTimetableSlotException: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const service = new TimetableService(prisma as never);

function makeClassEntity() {
  return {
    id: "class-1",
    name: "6e C",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    academicLevelId: null,
    curriculumId: null,
    referentTeacherUserId: "referent-1",
  };
}

function makeSlot() {
  return {
    id: "slot-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    subjectId: "sub-1",
    teacherUserId: "teacher-1",
    weekday: 2,
    startMinute: 480,
    endMinute: 540,
    activeFromDate: new Date("2099-01-01T00:00:00.000Z"),
    activeToDate: new Date("2099-12-31T00:00:00.000Z"),
    room: "B45",
    roomId: null,
    subject: { id: "sub-1", name: "Maths" },
    teacherUser: {
      id: "teacher-1",
      firstName: "Albert",
      lastName: "Mvondo",
      email: "teacher@example.test",
    },
  };
}

function makeException() {
  const slot = makeSlot();
  return {
    id: "exc-1",
    schoolId: "school-1",
    schoolYearId: "sy-1",
    classId: "class-1",
    slotId: slot.id,
    occurrenceDate: new Date("2026-04-14T00:00:00.000Z"),
    type: "OVERRIDE" as const,
    subjectId: slot.subjectId,
    teacherUserId: slot.teacherUserId,
    startMinute: 500,
    endMinute: 560,
    room: "B45",
    roomId: null,
    reason: null,
    slot,
    subject: slot.subject,
    teacherUser: slot.teacherUser,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (service as any).getEffectiveSchoolId = (_user: unknown, schoolId: string) =>
    schoolId;
  (service as any).ensureClassInSchool = jest
    .fn()
    .mockResolvedValue(makeClassEntity());
  (service as any).ensureSchoolYearInSchool = jest.fn().mockResolvedValue({
    id: "sy-1",
    startsAt: new Date("2099-01-01T00:00:00.000Z"),
    endsAt: new Date("2099-12-31T00:00:00.000Z"),
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
  (service as any).ensureAutoSubjectStyleExists = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoSlotConflicts = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).ensureNoOccurrenceConflicts = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).resolveRoomReference = jest.fn().mockResolvedValue({
    room: "B45",
    roomId: null,
  });
  (service as any).assertMinuteRange = jest.fn();
  (service as any).assertActiveDateRange = jest.fn();
  (service as any).toDateOnly = (value: string) =>
    new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
  (service as any).dateToYmd = (value: Date) =>
    value.toISOString().slice(0, 10);
  (service as any).emitTimetableChange = jest.fn().mockResolvedValue(undefined);

  prisma.classTimetableSlot.findFirst.mockResolvedValue(makeSlot());
  prisma.classTimetableSlot.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      ...makeSlot(),
      ...data,
      id: "slot-created",
    }),
  );
  prisma.classTimetableSlot.update.mockResolvedValue(makeSlot());
  prisma.classTimetableSlot.delete.mockResolvedValue(undefined);

  prisma.classTimetableSlotException.findFirst.mockResolvedValue(
    makeException(),
  );
  prisma.classTimetableSlotException.upsert.mockResolvedValue(makeException());
  prisma.classTimetableSlotException.update.mockResolvedValue(makeException());
  prisma.classTimetableSlotException.delete.mockResolvedValue(undefined);
});

describe("assigned teacher permissions on recurring timetable items", () => {
  it("autorise l'enseignant affecté à créer sa série récurrente", async () => {
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.createSlot(user as never, "school-1", "class-1", {
        schoolYearId: "sy-1",
        weekday: 2,
        startMinute: 480,
        endMinute: 540,
        subjectId: "sub-1",
        teacherUserId: "teacher-1",
        room: "B45",
      }),
    ).resolves.toBeDefined();
  });

  it("autorise l'enseignant affecté à modifier sa série récurrente", async () => {
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.updateSlot(user as never, "school-1", "slot-1", { room: "B45" }),
    ).resolves.toBeDefined();
  });

  it("autorise l'enseignant affecté à supprimer sa série récurrente", async () => {
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.deleteSlot(user as never, "school-1", "slot-1"),
    ).resolves.toEqual({ id: "slot-1", deleted: true });
  });

  it("autorise l'enseignant affecté à modifier une occurrence de sa série", async () => {
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.createSlotException(user as never, "school-1", "slot-1", {
        occurrenceDate: "2026-04-14",
        type: "OVERRIDE",
        subjectId: "sub-1",
        teacherUserId: "teacher-1",
        startMinute: 500,
        endMinute: 560,
        room: "B45",
      }),
    ).resolves.toBeDefined();
  });

  it("refuse à un autre enseignant de modifier la série d'un collègue", async () => {
    const user = makeUser("teacher-2", "TEACHER");

    await expect(
      service.updateSlot(user as never, "school-1", "slot-1", { room: "B45" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse à un autre enseignant de créer une série pour son collègue", async () => {
    const user = makeUser("teacher-2", "TEACHER");

    await expect(
      service.createSlot(user as never, "school-1", "class-1", {
        schoolYearId: "sy-1",
        weekday: 2,
        startMinute: 480,
        endMinute: 540,
        subjectId: "sub-1",
        teacherUserId: "teacher-1",
        room: "B45",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
