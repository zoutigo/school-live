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
