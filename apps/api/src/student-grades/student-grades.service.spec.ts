import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { StudentGradesService } from "./student-grades.service.js";
import {
  translateStudentGradesError,
  type StudentGradesLocale,
} from "./student-grades.translations.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  studentGrade: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  class: { findFirst: jest.fn() },
  student: { findFirst: jest.fn() },
  enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
  subject: { findFirst: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
  classSubjectOverride: { findFirst: jest.fn() },
  school: { findUnique: jest.fn() },
  schoolYear: { findMany: jest.fn() },
  $transaction: jest.fn(),
});

describe("StudentGradesService", () => {
  let service: StudentGradesService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        StudentGradesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudentGradesService);
  });

  describe("remove", () => {
    it("throws a translated NotFoundException when the grade does not exist (fr)", async () => {
      prisma.studentGrade.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(
          makeUser({ preferredLocale: "FR" }),
          "school-1",
          "grade-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateStudentGradesError(
            "fr",
            "studentGrades.errors.gradeNotFound",
          ),
        ),
      );
    });

    it("throws a translated NotFoundException when the grade does not exist (en)", async () => {
      prisma.studentGrade.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(
          makeUser({ preferredLocale: "EN" }),
          "school-1",
          "grade-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateStudentGradesError(
            "en",
            "studentGrades.errors.gradeNotFound",
          ),
        ),
      );
    });
  });

  describe("getEffectiveSchoolId (via list)", () => {
    it("throws a translated ForbiddenException when the user is not bound to the school (fr default)", async () => {
      const user = makeUser({
        memberships: [{ schoolId: "other-school", role: "SCHOOL_ADMIN" }],
      });

      await expect(service.list(user, "school-1", {})).rejects.toThrow(
        new ForbiddenException(
          translateStudentGradesError(
            "fr",
            "studentGrades.errors.userNotBoundToSchool",
          ),
        ),
      );
    });

    it("throws a translated ForbiddenException when the user is not bound to the school (en)", async () => {
      const user = makeUser({
        preferredLocale: "EN",
        memberships: [{ schoolId: "other-school", role: "SCHOOL_ADMIN" }],
      });

      await expect(service.list(user, "school-1", {})).rejects.toThrow(
        new ForbiddenException(
          translateStudentGradesError(
            "en",
            "studentGrades.errors.userNotBoundToSchool",
          ),
        ),
      );
    });
  });

  describe("activeRole branching — context()", () => {
    const schoolYear = { id: "sy-1", label: "2025-2026" };
    const school = { activeSchoolYearId: "sy-1" };
    const teacherClassSubjectRow = {
      classId: "class-1",
      subjectId: "sub-1",
      schoolYearId: "sy-1",
      class: { name: "6e A" },
      subject: { name: "Maths" },
    };

    beforeEach(() => {
      prisma.school.findUnique.mockResolvedValue(school);
      prisma.schoolYear.findMany.mockResolvedValue([schoolYear]);
      prisma.enrollment.findMany.mockResolvedValue([]);
    });

    it("SCHOOL_ADMIN activeRole → returns all TeacherClassSubject (admin branch)", async () => {
      prisma.teacherClassSubject.findMany.mockResolvedValue([
        teacherClassSubjectRow,
      ]);
      const user = makeUser({
        activeRole: "SCHOOL_ADMIN",
        memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
      });

      const result = await service.context(user, "school-1");

      expect(prisma.teacherClassSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            teacherUserId: expect.anything(),
          }),
        }),
      );
      expect(result.assignments).toHaveLength(1);
    });

    it("TEACHER activeRole with SCHOOL_ADMIN membership → teacher branch (only own assignments)", async () => {
      prisma.teacherClassSubject.findMany.mockResolvedValue([
        teacherClassSubjectRow,
      ]);
      const user = makeUser({
        id: "teacher-user-1",
        activeRole: "TEACHER",
        memberships: [
          { schoolId: "school-1", role: "SCHOOL_ADMIN" },
          { schoolId: "school-1", role: "TEACHER" },
        ],
      });

      await service.context(user, "school-1");

      expect(prisma.teacherClassSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherUserId: "teacher-user-1" }),
        }),
      );
    });

    it("PARENT activeRole → returns empty assignments", async () => {
      const user = makeUser({
        activeRole: "PARENT",
        memberships: [
          { schoolId: "school-1", role: "PARENT" },
          { schoolId: "school-1", role: "TEACHER" },
        ],
      });

      const result = await service.context(user, "school-1");

      expect(prisma.teacherClassSubject.findMany).not.toHaveBeenCalled();
      expect(result.assignments).toHaveLength(0);
    });

    it("SCHOOL_MANAGER activeRole → admin branch", async () => {
      prisma.teacherClassSubject.findMany.mockResolvedValue([
        teacherClassSubjectRow,
      ]);
      const user = makeUser({
        activeRole: "SCHOOL_MANAGER",
        memberships: [{ schoolId: "school-1", role: "SCHOOL_MANAGER" }],
      });

      const result = await service.context(user, "school-1");

      expect(result.assignments).toHaveLength(1);
      expect(prisma.teacherClassSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            teacherUserId: expect.anything(),
          }),
        }),
      );
    });
  });

  describe("activeRole branching — list()", () => {
    const grade = {
      id: "grade-1",
      subject: { id: "sub-1", name: "Maths" },
      class: { id: "class-1", name: "6e A" },
      student: { id: "stu-1", firstName: "Bob", lastName: "Smith" },
    };

    it("SCHOOL_ADMIN activeRole → returns all grades", async () => {
      prisma.studentGrade.findMany.mockResolvedValue([grade]);
      const user = makeUser({
        activeRole: "SCHOOL_ADMIN",
        memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
      });

      const result = await service.list(user, "school-1", {});

      expect(result).toHaveLength(1);
      expect(prisma.teacherClassSubject.findMany).not.toHaveBeenCalled();
    });

    it("TEACHER activeRole with dual SCHOOL_ADMIN+TEACHER memberships → scoped to teacher assignments", async () => {
      prisma.teacherClassSubject.findMany.mockResolvedValue([]);
      const user = makeUser({
        id: "teacher-user-1",
        activeRole: "TEACHER",
        memberships: [
          { schoolId: "school-1", role: "SCHOOL_ADMIN" },
          { schoolId: "school-1", role: "TEACHER" },
        ],
      });

      const result = await service.list(user, "school-1", {});

      expect(prisma.teacherClassSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherUserId: "teacher-user-1" }),
        }),
      );
      expect(result).toEqual([]);
    });

    it("no matching activeRole → throws ForbiddenException", async () => {
      const user = makeUser({
        activeRole: "PARENT",
        memberships: [
          { schoolId: "school-1", role: "PARENT" },
          { schoolId: "school-1", role: "TEACHER" },
          { schoolId: "school-1", role: "SCHOOL_ADMIN" },
        ],
      });

      await expect(service.list(user, "school-1", {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  it("each translated locale produces a distinct, non-empty message", () => {
    const locales: StudentGradesLocale[] = ["fr", "en"];
    const messages = locales.map((locale) =>
      translateStudentGradesError(locale, "studentGrades.errors.gradeNotFound"),
    );
    expect(new Set(messages).size).toBe(locales.length);
    for (const message of messages) {
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });
});
