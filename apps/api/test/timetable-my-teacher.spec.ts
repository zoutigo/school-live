import { ForbiddenException } from "@nestjs/common";
import { TimetableService } from "../src/timetable/timetable.service.js";

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
  platformRoles: Array<"SUPER_ADMIN" | "ADMIN"> = [],
) {
  return {
    id,
    firstName: "User",
    lastName: id,
    platformRoles,
    memberships: [{ schoolId: "school-1", role: schoolRole }],
    profileCompleted: true,
  };
}

const prisma = {
  schoolMembership: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  teacherClassSubject: { findMany: jest.fn() },
};

const service = new TimetableService(prisma as never);

beforeEach(() => {
  jest.clearAllMocks();
  (service as any).getEffectiveSchoolId = (_user: unknown, schoolId: string) =>
    schoolId;
  (service as any).getActiveSchoolYearIdOrThrow = jest
    .fn()
    .mockResolvedValue("sy-1");
  (service as any).ensureSchoolYearInSchool = jest
    .fn()
    .mockResolvedValue(undefined);
  (service as any).parseDateRange = jest.fn().mockReturnValue({
    fromDate: new Date("2026-04-14T00:00:00.000Z"),
    toDate: new Date("2026-04-14T00:00:00.000Z"),
  });
  (service as any).fetchClassTimetableData = jest.fn();

  prisma.schoolMembership.findFirst.mockResolvedValue({ id: "membership-1" });
  prisma.user.findUnique.mockResolvedValue({
    id: "teacher-1",
    firstName: "Albert",
    lastName: "Mvondo",
    email: "albert@example.test",
  });
  prisma.teacherClassSubject.findMany.mockResolvedValue([
    {
      classId: "class-1",
      class: {
        id: "class-1",
        name: "6e C",
        schoolId: "school-1",
        schoolYearId: "sy-1",
        academicLevelId: null,
        curriculumId: null,
        referentTeacherUserId: "referent-1",
      },
    },
  ]);
});

describe("myTeacherTimetable", () => {
  it("agrège l'agenda de l'enseignant courant sans passer par le statut de referent", async () => {
    const user = makeUser("teacher-1", "TEACHER");
    (service as any).fetchClassTimetableData.mockResolvedValue({
      slots: [
        {
          id: "slot-1",
          weekday: 2,
          startMinute: 480,
          endMinute: 540,
          teacherUser: { id: "teacher-1" },
        },
        {
          id: "slot-2",
          weekday: 2,
          startMinute: 600,
          endMinute: 660,
          teacherUser: { id: "teacher-other" },
        },
      ],
      oneOffSlots: [],
      slotExceptions: [],
      occurrences: [
        {
          id: "occ-1",
          source: "RECURRING",
          status: "PLANNED",
          occurrenceDate: "2026-04-14",
          weekday: 2,
          startMinute: 480,
          endMinute: 540,
          room: "B45",
          roomId: null,
          reason: null,
          subject: { id: "ang", name: "Anglais" },
          teacherUser: {
            id: "teacher-1",
            firstName: "Albert",
            lastName: "Mvondo",
            email: null,
          },
          slotId: "slot-1",
        },
        {
          id: "occ-2",
          source: "RECURRING",
          status: "PLANNED",
          occurrenceDate: "2026-04-14",
          weekday: 2,
          startMinute: 600,
          endMinute: 660,
          room: "B46",
          roomId: null,
          reason: null,
          subject: { id: "math", name: "Maths" },
          teacherUser: {
            id: "teacher-other",
            firstName: "Other",
            lastName: "Teacher",
            email: null,
          },
          slotId: "slot-2",
        },
      ],
      calendarEvents: [],
      subjectStyles: [{ subjectId: "ang", colorHex: "#11C5C6" }],
    });

    const result = await service.myTeacherTimetable(user as never, "school-1", {
      fromDate: "2026-04-14",
      toDate: "2026-04-14",
    });

    expect(prisma.teacherClassSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-1",
          schoolYearId: "sy-1",
          teacherUserId: "teacher-1",
        }),
      }),
    );
    expect(result.teacher.id).toBe("teacher-1");
    expect(result.classes).toHaveLength(1);
    expect(result.occurrences).toEqual([
      expect.objectContaining({
        id: "occ-1",
        classId: "class-1",
        className: "6e C",
        schoolYearId: "sy-1",
      }),
    ]);
    expect(result.occurrenceContexts).toEqual([
      {
        occurrenceId: "occ-1",
        classId: "class-1",
        className: "6e C",
        schoolYearId: "sy-1",
      },
    ]);
    expect(result.slots).toEqual([
      expect.objectContaining({
        id: "slot-1",
      }),
    ]);
  });

  it("refuse qu'un enseignant lise l'agenda d'un autre enseignant", async () => {
    const user = makeUser("teacher-1", "TEACHER");

    await expect(
      service.myTeacherTimetable(user as never, "school-1", {
        teacherUserId: "teacher-2",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("autorise un SCHOOL_ADMIN à cibler un autre enseignant", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    (service as any).fetchClassTimetableData.mockResolvedValue({
      slots: [],
      oneOffSlots: [],
      slotExceptions: [],
      occurrences: [],
      calendarEvents: [],
      subjectStyles: [],
    });

    await service.myTeacherTimetable(user as never, "school-1", {
      teacherUserId: "teacher-1",
      schoolYearId: "sy-1",
    });

    expect(prisma.schoolMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school-1",
          userId: "teacher-1",
          role: "TEACHER",
        }),
      }),
    );
  });

  it("rejette un utilisateur ciblé qui n'est pas enseignant dans l'école", async () => {
    const user = makeUser("admin-1", "SCHOOL_ADMIN");
    prisma.schoolMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.myTeacherTimetable(user as never, "school-1", {
        teacherUserId: "teacher-404",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
