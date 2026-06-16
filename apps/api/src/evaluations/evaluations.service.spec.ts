import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { EvaluationsService } from "./evaluations.service.js";
import {
  translateEvaluationsError,
  type EvaluationsLocale,
} from "./evaluations.translations.js";

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
  class: { findFirst: jest.fn() },
  evaluation: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  evaluationType: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  evaluationAuditLog: { create: jest.fn() },
  subject: { findFirst: jest.fn() },
  subjectBranch: { findFirst: jest.fn(), findMany: jest.fn() },
  teacherClassSubject: { findFirst: jest.fn(), findMany: jest.fn() },
  enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
  student: { findFirst: jest.fn() },
  parentStudent: { findFirst: jest.fn() },
  studentTermReport: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  curriculumSubject: { findMany: jest.fn() },
  classSubjectOverride: { findMany: jest.fn() },
  $transaction: jest.fn(),
});

describe("EvaluationsService", () => {
  let service: EvaluationsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EvaluationsService);
  });

  describe("ensureClassAccessible (via listClassEvaluations)", () => {
    it("throws a translated NotFoundException when the class does not exist (fr default)", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(
          makeUser({ preferredLocale: "FR" }),
          "school-1",
          "class-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("fr", "evaluations.errors.classNotFound"),
        ),
      );
    });

    it("throws a translated NotFoundException when the class does not exist (en)", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(
          makeUser({ preferredLocale: "EN" }),
          "school-1",
          "class-1",
        ),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("en", "evaluations.errors.classNotFound"),
        ),
      );
    });

    it("defaults to fr when preferredLocale is undefined", async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.listClassEvaluations(makeUser(), "school-1", "class-1"),
      ).rejects.toThrow(
        new NotFoundException(
          translateEvaluationsError("fr", "evaluations.errors.classNotFound"),
        ),
      );
    });
  });

  it("each translated locale produces a distinct, non-empty message", () => {
    const locales: EvaluationsLocale[] = ["fr", "en"];
    const messages = locales.map((locale) =>
      translateEvaluationsError(locale, "evaluations.errors.classNotFound"),
    );
    expect(new Set(messages).size).toBe(locales.length);
    for (const message of messages) {
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });
});
