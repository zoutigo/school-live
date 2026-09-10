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

const CHAPTER_WITH_QUESTION = {
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
  questions: [
    {
      id: "q1",
      order: 1,
      type: "MCQ_SINGLE",
      difficulty: "HARD",
      textFr: "Question fr",
      textEn: "Question en",
      hintFr: "Indice fr",
      hintEn: "Hint en",
      imageUrl: null,
      deepLinkRoute: "/children/{childId}/discipline",
      options: [
        {
          id: "opt-correct",
          order: 1,
          textFr: "Bonne réponse",
          textEn: "Correct answer",
        },
      ],
      progress: [{ solved: true, attemptsCount: 3 }],
    },
  ],
};

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

  describe("getChapter", () => {
    it("maps difficulty, hint and attempt count per locale", async () => {
      prisma.quizChapter.findFirst.mockResolvedValue(CHAPTER_WITH_QUESTION);

      const result = await service.getChapter(makeUser(), "chapter-1");

      expect(result.questions[0]).toEqual(
        expect.objectContaining({
          difficulty: "HARD",
          text: "Question fr",
          hint: "Indice fr",
          deepLinkRoute: "/children/{childId}/discipline",
          solved: true,
          attemptsCount: 3,
        }),
      );
    });

    it("falls back to English hint/text when preferredLocale is EN", async () => {
      prisma.quizChapter.findFirst.mockResolvedValue(CHAPTER_WITH_QUESTION);

      const result = await service.getChapter(
        makeUser({ preferredLocale: "EN" }),
        "chapter-1",
      );

      expect(result.questions[0].text).toBe("Question en");
      expect(result.questions[0].hint).toBe("Hint en");
    });

    it("never returns a hint for easy/medium questions", async () => {
      prisma.quizChapter.findFirst.mockResolvedValue({
        ...CHAPTER_WITH_QUESTION,
        questions: [
          { ...CHAPTER_WITH_QUESTION.questions[0], difficulty: "EASY" },
        ],
      });

      const result = await service.getChapter(makeUser(), "chapter-1");

      expect(result.questions[0].hint).toBeNull();
    });

    it("computes per-level unlock state, HARD locked until MEDIUM is cleared", async () => {
      const easySolved = {
        id: "q-easy",
        order: 1,
        type: "MCQ_SINGLE",
        difficulty: "EASY",
        textFr: "e",
        textEn: "e",
        hintFr: "h",
        hintEn: "h",
        imageUrl: null,
        deepLinkRoute: null,
        options: [],
        progress: [{ solved: true, attemptsCount: 1 }],
      };
      const mediumUnsolved = {
        ...easySolved,
        id: "q-medium",
        order: 2,
        difficulty: "MEDIUM",
        progress: [{ solved: false, attemptsCount: 1 }],
      };
      const hardQuestion = {
        ...easySolved,
        id: "q-hard",
        order: 3,
        difficulty: "HARD",
        progress: [],
      };
      prisma.quizChapter.findFirst.mockResolvedValue({
        ...CHAPTER_WITH_QUESTION,
        questions: [easySolved, mediumUnsolved, hardQuestion],
      });

      const result = await service.getChapter(makeUser(), "chapter-1");

      expect(result.levels).toEqual([
        {
          difficulty: "EASY",
          totalQuestions: 1,
          solvedQuestions: 1,
          unlocked: true,
        },
        {
          difficulty: "MEDIUM",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: true,
        },
        {
          difficulty: "HARD",
          totalQuestions: 1,
          solvedQuestions: 0,
          unlocked: false,
        },
      ]);
      // Locked level's options are withheld even though the question is listed.
      const hardEntry = result.questions.find((q) => q.id === "q-hard");
      expect(hardEntry?.options).toEqual([]);
    });
  });

  describe("submitAnswer", () => {
    function defaultChapterQuestions(difficulty: "EASY" | "MEDIUM" | "HARD") {
      const order = ["EASY", "MEDIUM", "HARD"] as const;
      const currentIndex = order.indexOf(difficulty);
      return order
        .filter((_, index) => index <= currentIndex)
        .map((d) =>
          d === difficulty
            ? { difficulty: d, progress: [] }
            : { difficulty: d, progress: [{ id: "solved" }] },
        );
    }

    function makeQuestion(
      difficulty: "EASY" | "MEDIUM" | "HARD",
      overrides: { chapterQuestions?: unknown[] } = {},
    ) {
      return {
        id: "q1",
        isActive: true,
        difficulty,
        explanationFr: "explication",
        explanationEn: "explanation",
        options: [
          { id: "opt-correct", isCorrect: true },
          { id: "opt-wrong", isCorrect: false },
        ],
        chapter: {
          questions:
            overrides.chapterQuestions ?? defaultChapterQuestions(difficulty),
        },
      };
    }
    const question = makeQuestion("HARD");

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
      expect(result.attemptsCount).toBe(1);
      expect(prisma.quizUserQuestionProgress.upsert).toHaveBeenCalled();
    });

    it("marks a retry-after-solved answer as alreadySolved without resetting solvedAt", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(question);
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue({
        solved: true,
        attemptsCount: 4,
      });
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: true,
        attemptsCount: 2,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-correct",
      ]);

      expect(result.alreadySolved).toBe(true);
      expect(result.attemptsCount).toBe(5);
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
      expect(result.attemptsCount).toBe(1);
    });

    it("still returns explanation and correctOptionIds on a HARD wrong answer", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(makeQuestion("HARD"));
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue(null);
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: false,
        attemptsCount: 1,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-wrong",
      ]);

      expect(result.explanation).toBe("explication");
      expect(result.correctOptionIds).toEqual(["opt-correct"]);
    });

    it("returns explanation but withholds correctOptionIds on an EASY wrong answer", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(makeQuestion("EASY"));
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue(null);
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: false,
        attemptsCount: 1,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-wrong",
      ]);

      expect(result.explanation).toBe("explication");
      expect(result.correctOptionIds).toEqual([]);
    });

    it("returns correctOptionIds on a correct EASY answer (nothing left to hide)", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(makeQuestion("EASY"));
      prisma.quizUserQuestionProgress.findUnique.mockResolvedValue(null);
      prisma.quizUserQuestionProgress.upsert.mockResolvedValue({
        solved: true,
        attemptsCount: 1,
      });

      const result = await service.submitAnswer(makeUser(), "q1", [
        "opt-correct",
      ]);

      expect(result.correctOptionIds).toEqual(["opt-correct"]);
    });

    it("rejects an answer submitted for a locked level", async () => {
      prisma.quizQuestion.findUnique.mockResolvedValue(
        makeQuestion("MEDIUM", {
          chapterQuestions: [
            { difficulty: "EASY", progress: [] },
            { difficulty: "MEDIUM", progress: [] },
          ],
        }),
      );

      await expect(
        service.submitAnswer(makeUser(), "q1", ["opt-correct"]),
      ).rejects.toThrow("This level is locked");
      expect(prisma.quizUserQuestionProgress.upsert).not.toHaveBeenCalled();
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
