import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { GradePublishedNotificationsService } from "../notifications/grade-published-notifications.service.js";
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
  evaluation: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
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

const makeGradeNotificationsMock = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
});

function makeEvaluation(
  overrides: Partial<{
    id: string;
    subjectId: string;
    sequence: string;
    isFinalExam: boolean;
    maxScore: number;
    coefficient: number;
    status: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    scheduledAt: Date | null;
    scores: Array<{ studentId: string; score: number | null; status: string }>;
    subject: { id: string; name: string };
    subjectBranch: null;
    evaluationType: { id: string; code: string; label: string };
    attachments: never[];
    _count: { scores: number };
  }> = {},
) {
  return {
    id: "eval-1",
    subjectId: "subject-1",
    sequence: "SEQ_1",
    isFinalExam: false,
    maxScore: 20,
    coefficient: 1,
    status: "PUBLISHED",
    title: "Devoir 1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    scheduledAt: null,
    scores: [],
    subject: { id: "subject-1", name: "Maths" },
    subjectBranch: null,
    evaluationType: { id: "type-1", code: "DEVOIR", label: "Devoir" },
    attachments: [],
    _count: { scores: 0 },
    ...overrides,
  };
}

describe("EvaluationsService", () => {
  let service: EvaluationsService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const gradeNotifications = makeGradeNotificationsMock();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GradePublishedNotificationsService,
          useValue: gradeNotifications,
        },
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

  describe("listClassEvaluations — sequence fields", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.teacherClassSubject.findMany.mockResolvedValue([]);
    });

    it("derives term from sequence (SEQ_1 → TERM_1)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_1" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_1");
    });

    it("derives term from sequence (SEQ_3 → TERM_2)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_3" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_2");
    });

    it("derives term from sequence (SEQ_5 → TERM_3)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_5" }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].term).toBe("TERM_3");
    });

    it("countsForAverage=true for odd sequence + formative (SEQ_1, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_1", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=true for odd sequence + final exam (SEQ_3, isFinalExam=true)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_3", isFinalExam: true }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=false for even sequence + formative (SEQ_2, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_2", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(false);
    });

    it("countsForAverage=true for even sequence + final exam (SEQ_4, isFinalExam=true)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_4", isFinalExam: true }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(true);
    });

    it("countsForAverage=false for even sequence + formative (SEQ_6, isFinalExam=false)", async () => {
      prisma.evaluation.findMany.mockResolvedValue([
        makeEvaluation({ sequence: "SEQ_6", isFinalExam: false }),
      ]);

      const result = await service.listClassEvaluations(
        makeUser(),
        "school-1",
        "class-1",
      );

      expect(result[0].countsForAverage).toBe(false);
    });

    it("returns correct term and countsForAverage for all 6 sequences", async () => {
      const expectations = [
        { sequence: "SEQ_1", isFinalExam: false, term: "TERM_1", counts: true },
        {
          sequence: "SEQ_2",
          isFinalExam: false,
          term: "TERM_1",
          counts: false,
        },
        { sequence: "SEQ_2", isFinalExam: true, term: "TERM_1", counts: true },
        { sequence: "SEQ_3", isFinalExam: false, term: "TERM_2", counts: true },
        {
          sequence: "SEQ_4",
          isFinalExam: false,
          term: "TERM_2",
          counts: false,
        },
        { sequence: "SEQ_4", isFinalExam: true, term: "TERM_2", counts: true },
        { sequence: "SEQ_5", isFinalExam: false, term: "TERM_3", counts: true },
        {
          sequence: "SEQ_6",
          isFinalExam: false,
          term: "TERM_3",
          counts: false,
        },
        { sequence: "SEQ_6", isFinalExam: true, term: "TERM_3", counts: true },
      ];

      for (const { sequence, isFinalExam, term, counts } of expectations) {
        prisma.evaluation.findMany.mockResolvedValue([
          makeEvaluation({ sequence: sequence as never, isFinalExam }),
        ]);

        const result = await service.listClassEvaluations(
          makeUser(),
          "school-1",
          "class-1",
        );

        expect(result[0].term).toBe(term);
        expect(result[0].countsForAverage).toBe(counts);
      }
    });
  });

  describe("createEvaluation / updateEvaluation — description avec image", () => {
    const classEntity = {
      id: "class-1",
      name: "6ème A",
      schoolYearId: "year-1",
    };

    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue(classEntity);
      prisma.evaluationType.upsert.mockResolvedValue({});
      prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
      prisma.evaluationType.findFirst.mockResolvedValue({ id: "type-1" });
      prisma.evaluationAuditLog.create.mockResolvedValue({});
    });

    it.each(["png", "jpg", "jpeg", "webp", "gif", "heic"])(
      "conserve une description composée uniquement d'une image .%s (sans texte) à la création",
      async (ext) => {
        prisma.evaluation.create.mockResolvedValue(
          makeEvaluation({ id: "eval-1" }),
        );

        await service.createEvaluation(makeUser(), "school-1", "class-1", {
          subjectId: "subject-1",
          evaluationTypeId: "type-1",
          title: "Interro 1",
          description: `<div><img src="https://cdn.example.com/x.${ext}" /></div>`,
          coefficient: 1,
          maxScore: 20,
          sequence: "SEQ_1" as never,
        });

        const createArgs = prisma.evaluation.create.mock.calls[0][0] as {
          data: { description: string | null };
        };
        expect(createArgs.data.description).not.toBeNull();
        expect(createArgs.data.description).toContain("<img");
      },
    );

    it.each(["png", "jpg", "jpeg", "webp", "gif", "heic"])(
      "conserve une description composée uniquement d'une image .%s lors d'une modification",
      async (ext) => {
        const html = `<div><img src="https://cdn.example.com/y.${ext}" /></div>`;
        prisma.evaluation.findFirst.mockResolvedValue(
          makeEvaluation({ id: "eval-1", subjectId: "subject-1" }),
        );
        prisma.evaluation.update.mockResolvedValue(
          makeEvaluation({ id: "eval-1" }),
        );

        await service.updateEvaluation(
          makeUser(),
          "school-1",
          "class-1",
          "eval-1",
          { description: html },
        );

        const updateArgs = prisma.evaluation.update.mock.calls[0][0] as {
          data: { description: string | null };
        };
        expect(updateArgs.data.description).not.toBeNull();
        expect(updateArgs.data.description).toContain("<img");
      },
    );
  });
});
