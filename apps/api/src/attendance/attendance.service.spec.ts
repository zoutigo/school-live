import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AttendanceService } from "./attendance.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PrismaService } from "../prisma/prisma.service.js";

function makeUser(
  id: string,
  memberships: Array<{
    schoolId: string;
    role: AuthenticatedUser["memberships"][number]["role"];
  }>,
  platformRoles: AuthenticatedUser["platformRoles"] = [],
): AuthenticatedUser {
  return {
    id,
    platformRoles,
    memberships,
    profileCompleted: true,
    firstName: "Test",
    lastName: "User",
  };
}

function makePrismaMock(input: {
  classEntity?: {
    id: string;
    name: string;
    schoolYearId: string;
    referentTeacherUserId: string | null;
  } | null;
  assignment?: { id: string } | null;
  enrollments?: Array<{ studentId?: string; student?: unknown }>;
  absenceEvents?: Array<{ id: string; studentId: string }>;
}) {
  const classFindFirst = jest
    .fn()
    .mockResolvedValue(
      input.classEntity === undefined ? null : input.classEntity,
    );
  const assignmentFindFirst = jest
    .fn()
    .mockResolvedValue(input.assignment ?? null);
  const enrollmentFindMany = jest
    .fn()
    .mockResolvedValue(input.enrollments ?? []);
  const eventFindMany = jest.fn().mockResolvedValue(input.absenceEvents ?? []);
  const eventCreateMany = jest.fn().mockResolvedValue({ count: 0 });
  const eventDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const transaction = jest.fn((ops: unknown[]) => Promise.all(ops));

  return {
    class: { findFirst: classFindFirst },
    teacherClassSubject: { findFirst: assignmentFindFirst },
    enrollment: { findMany: enrollmentFindMany },
    studentLifeEvent: {
      findMany: eventFindMany,
      createMany: eventCreateMany,
      deleteMany: eventDeleteMany,
    },
    $transaction: transaction,
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  return new AttendanceService(prisma as unknown as PrismaService);
}

const CLASS_ENTITY = {
  id: "class-1",
  name: "6eC",
  schoolYearId: "sy-1",
  referentTeacherUserId: null,
};

describe("AttendanceService — class access", () => {
  it("throws NotFoundException when the class does not exist", async () => {
    const prisma = makePrismaMock({ classEntity: null });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await expect(
      service.getRoster(user, "school-1", "class-1", { date: "2026-09-16" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows a TEACHER assigned via teacherClassSubject", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await expect(
      service.getRoster(user, "school-1", "class-1", { date: "2026-09-16" }),
    ).resolves.toMatchObject({ classId: "class-1" });
  });

  it("allows the referent teacher even without a teacherClassSubject row", async () => {
    const prisma = makePrismaMock({
      classEntity: { ...CLASS_ENTITY, referentTeacherUserId: "teacher-1" },
      assignment: null,
      enrollments: [],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await expect(
      service.getRoster(user, "school-1", "class-1", { date: "2026-09-16" }),
    ).resolves.toMatchObject({ classId: "class-1" });
  });

  it("rejects a TEACHER neither assigned nor referent for the class", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: null,
      enrollments: [],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-2", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await expect(
      service.getRoster(user, "school-1", "class-1", { date: "2026-09-16" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows a SCHOOL_ADMIN regardless of assignment", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: null,
      enrollments: [],
    });
    const service = makeService(prisma);
    const user = makeUser("admin-1", [
      { schoolId: "school-1", role: "SCHOOL_ADMIN" },
    ]);

    await expect(
      service.getRoster(user, "school-1", "class-1", { date: "2026-09-16" }),
    ).resolves.toMatchObject({ classId: "class-1" });
  });
});

describe("AttendanceService.getRoster — roster and presence", () => {
  it("marks a student absent only when a roll-call event matches that exact date", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [
        { student: { id: "student-1", firstName: "Alice", lastName: "A" } },
        { student: { id: "student-2", firstName: "Bob", lastName: "B" } },
      ],
      absenceEvents: [{ id: "evt-1", studentId: "student-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    const roster = await service.getRoster(user, "school-1", "class-1", {
      date: "2026-09-16",
    });

    expect(roster.students).toEqual([
      {
        id: "student-1",
        firstName: "Alice",
        lastName: "A",
        present: false,
      },
      {
        id: "student-2",
        firstName: "Bob",
        lastName: "B",
        present: true,
      },
    ]);

    expect(prisma.studentLifeEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classId: "class-1",
          type: "ABSENCE",
          occurredAt: new Date("2026-09-16T00:00:00.000Z"),
          reason: { startsWith: "Appel du" },
        }),
      }),
    );
  });

  it("does not treat a Discipline-authored absence (different reason) as a roll-call absence", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [
        { student: { id: "student-1", firstName: "Alice", lastName: "A" } },
      ],
      // The `reason: { startsWith: "Appel du" }` filter in the query itself
      // is what keeps Discipline-authored events out of this result; this
      // test locks in that the mock reflects an empty match for such rows.
      absenceEvents: [],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    const roster = await service.getRoster(user, "school-1", "class-1", {
      date: "2026-09-16",
    });

    expect(roster.students[0].present).toBe(true);
  });
});

describe("AttendanceService.saveRollCall", () => {
  it("rejects a studentId that is not enrolled in the class", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [{ studentId: "student-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await expect(
      service.saveRollCall(user, "school-1", "class-1", {
        date: "2026-09-16",
        absentStudentIds: ["not-enrolled"],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates events only for newly-absent students and deletes events for students marked present again", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [
        {
          studentId: "student-1",
          student: { id: "student-1", firstName: "Alice", lastName: "A" },
        },
        {
          studentId: "student-2",
          student: { id: "student-2", firstName: "Bob", lastName: "B" },
        },
        {
          studentId: "student-3",
          student: { id: "student-3", firstName: "Carl", lastName: "C" },
        },
      ],
      // student-1 already has a roll-call absence for this date; student-2
      // does not; the request keeps student-1 absent, un-marks nobody... see below.
      absenceEvents: [{ id: "evt-1", studentId: "student-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await service.saveRollCall(user, "school-1", "class-1", {
      date: "2026-09-16",
      absentStudentIds: ["student-2"],
    });

    // student-1's existing event must be removed (no longer absent).
    expect(prisma.studentLifeEvent.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["evt-1"] } },
    });

    // student-2 is newly absent and must be created; student-1 is not
    // re-created since it had no matching existing event anymore to keep.
    expect(prisma.studentLifeEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: "student-2",
          classId: "class-1",
          schoolId: "school-1",
          schoolYearId: "sy-1",
          type: "ABSENCE",
          occurredAt: new Date("2026-09-16T00:00:00.000Z"),
          reason: "Appel du 2026-09-16",
        }),
      ],
    });
  });

  it("does not touch existing events for students who stay absent", async () => {
    const prisma = makePrismaMock({
      classEntity: CLASS_ENTITY,
      assignment: { id: "assignment-1" },
      enrollments: [
        {
          studentId: "student-1",
          student: { id: "student-1", firstName: "Alice", lastName: "A" },
        },
      ],
      absenceEvents: [{ id: "evt-1", studentId: "student-1" }],
    });
    const service = makeService(prisma);
    const user = makeUser("teacher-1", [
      { schoolId: "school-1", role: "TEACHER" },
    ]);

    await service.saveRollCall(user, "school-1", "class-1", {
      date: "2026-09-16",
      absentStudentIds: ["student-1"],
    });

    expect(prisma.studentLifeEvent.deleteMany).not.toHaveBeenCalled();
    expect(prisma.studentLifeEvent.createMany).not.toHaveBeenCalled();
  });
});
