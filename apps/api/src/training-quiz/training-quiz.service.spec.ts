import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TrainingQuizService } from "./training-quiz.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" }],
    activeRole: "PARENT",
    preferredLocale: "FR",
    ...overrides,
  };
}

const makePrismaMock = () => ({
  quizChapter: { findMany: jest.fn(), findFirst: jest.fn() },
  quizQuestion: { findUnique: jest.fn() },
  quizUserQuestionProgress: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
});

describe("TrainingQuizService", () => {
  let service: TrainingQuizService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TrainingQuizService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(TrainingQuizService);
  });

  describe("listChapters", () => {
    it("returns an empty list when the user has no resolvable role", async () => {
      const result = await service.listChapters(
        makeUser({ activeRole: null, memberships: [], platformRoles: [] }),
      );
      expect(result).toEqual([]);
      expect(prisma.quizChapter.findMany).not.toHaveBeenCalled();
    });

    it("scopes chapters to the active role and locale, computing progress", async () => {
      prisma.quizChapter.findMany.mockResolvedValue([
        {
          id: "chapter-1",
          moduleKey: "discipline",
          order: 1,
          icon: "shield",
          colorFrom: "#111",
          colorTo: "#222",
          titleFr: "Discipline",
          titleEn: "Discipline",
          descriptionFr: "desc fr",
          descriptionEn: "desc en",
          questions: [
            { id: "q1", progress: [{ id: "p1" }] },
            { id: "q2", progress: [] },
          ],
        },
      ]);

      const result = await service.listChapters(makeUser());

      expect(prisma.quizChapter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: "PARENT", isActive: true } }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: "chapter-1",
          title: "Discipline",
          totalQuestions: 2,
          solvedQuestions: 1,
        }),
      ]);
    });

    it("falls back to English content when preferredLocale is EN", async () => {
      prisma.quizChapter.findMany.mockResolvedValue([
        {
          id: "chapter-1",
          moduleKey: "discipline",
          order: 1,
          icon: "shield",
          colorFrom: "#111",
          colorTo: "#222",
          titleFr: "Discipline",
          titleEn: "Discipline (EN)",
          descriptionFr: "desc fr",
          descriptionEn: "desc en",
          questions: [],
        },
      ]);

      const result = await service.listChapters(
        makeUser({ preferredLocale: "EN" }),
      );

      expect(result[0].title).toBe("Discipline (EN)");
    });
  });

  describe("submitAnswer", () => {
    const question = {
      id: "q1",
      isActive: true,
      explanationFr: "explication",
      explanationEn: "explanation",
      options: [
        { id: "opt-correct", isCorrect: true },
        { id: "opt-wrong", isCorrect: false },
      ],
    };

    it("rejects unknown option ids", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(question);

      await expect(
        service.submitAnswer(makeUser(), "q1", ["not-an-option"]),
      ).rejects.toThrow("Invalid option selection");
    });

    it("marks the answer correct and persists first-solve progress", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(question);
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue(null);
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: true,
        attemptsCount: 1,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-correct",
      ]);

      expect(result.correct).toBe(true);
      expect(result.alreadySolved).toBe(false);
      expect(result.explanation).toBe("explication");
      expect(prisma.quizUserQuestionProgress.upsert).toHaveBeenCalled();
    });

    it("marks a retry-after-solved answer as alreadySolved without resetting solvedAt", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(question);
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue({
        solved: true,
      });
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: true,
        attemptsCount: 2,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-correct",
      ]);

      expect(result.alreadySolved).toBe(true);
      const updateArg =
        prisma.quizUserQuestionProgress.upsert.mock.calls[0][0].update;
      expect(updateArg.solvedAt).toBeUndefined();
    });

    it("marks a wrong answer as not correct without throwing", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(question);
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue(null);
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: false,
        attemptsCount: 1,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-wrong",
      ]);

      expect(result.correct).toBe(false);
    });
  });

  describe("getScore", () => {
    it("computes a weighted global percent across chapters", async () => {
      prisma.quizChapter.findMany.mockResolvedValue([
        {
          id: "c1",
          moduleKey: "discipline",
          titleFr: "Discipline",
          titleEn: "Discipline",
          questions: [
            { id: "q1", progress: [{ id: "p1" }] },
            { id: "q2", progress: [] },
          ],
        },
      ]);

      const result = await service.getScore(makeUser());

      expect(result.totalQuestions).toBe(2);
      expect(result.solvedQuestions).toBe(1);
      expect(result.globalPercent).toBe(50);
      expect(result.chapters[0].percent).toBe(50);
    });
  });
});
