import { ForbiddenException } from "@nestjs/common";
import { StudentGradesService } from "../src/student-grades/student-grades.service";

describe("StudentGradesService access rules", () => {
  const prisma = {
    student: { findFirst: jest.fn() },
    class: { findFirst: jest.fn() },
    subject: { findFirst: jest.fn() },
    teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
    enrollment: { findFirst: jest.fn() },
    classSubjectOverride: { findFirst: jest.fn() },
    studentGrade: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new StudentGradesService(prisma as never);

  beforeEach(() => {
    Object.values(prisma).forEach((value) => {
      Object.values(value).forEach((fn) => {
        if (typeof fn === "function") {
          fn.mockReset?.();
        }
      });
    });

    prisma.student.findFirst.mockResolvedValue({ id: "student-1" });
    prisma.class.findFirst.mockResolvedValue({
      id: "class-1",
      schoolYearId: "sy-1",
      curriculumId: null,
    });
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
    prisma.enrollment.findFirst.mockResolvedValue({ id: "enroll-1" });
    prisma.classSubjectOverride.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      async (operations: Array<Promise<unknown>>) => Promise.all(operations),
    );
  });

  it("blocks teacher create when assignment missing", async () => {
    prisma.teacherClassSubject.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          id: "teacher-1",
          platformRoles: [],
          memberships: [{ schoolId: "school-1", role: "TEACHER" }],
          profileCompleted: true,
          firstName: "A",
          lastName: "B",
          email: "t@test.com",
        },
        "school-1",
        {
          studentId: "student-1",
          classId: "class-1",
          subjectId: "subject-1",
          value: 15,
          maxValue: 20,
          term: "TERM_1",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks parent access to the technical student-grades listing", async () => {
    await expect(
      service.list(
        {
          id: "parent-1",
          platformRoles: [],
          memberships: [{ schoolId: "school-1", role: "PARENT" }],
          profileCompleted: true,
          firstName: "P",
          lastName: "Q",
          email: "p@test.com",
        },
        "school-1",
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("limits student listing to the authenticated student profile", async () => {
    prisma.student.findFirst.mockResolvedValue({ id: "student-own" });
    prisma.studentGrade.findMany.mockResolvedValue([{ id: "grade-own" }]);

    await service.list(
      {
        id: "user-student",
        platformRoles: [],
        memberships: [{ schoolId: "school-1", role: "STUDENT" }],
        profileCompleted: true,
        firstName: "S",
        lastName: "T",
        email: "s@test.com",
      },
      "school-1",
      {},
    );

    expect(prisma.studentGrade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: "student-own" }),
      }),
    );
  });
});
