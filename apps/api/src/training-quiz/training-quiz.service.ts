import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AppRole } from "../auth/auth.types.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  QuizAnswerResult,
  QuizChapterDetail,
  QuizChapterSummary,
  QuizLevelSummary,
  QuizScoreSummary,
} from "./training-quiz.types.js";

type Locale = "FR" | "EN";
type Stage = "DISCOVERY" | "PRACTICE" | "MASTERY";

const STAGE_ORDER: Stage[] = ["DISCOVERY", "PRACTICE", "MASTERY"];

// Fallback objective text used whenever nobody has authored a personalized
// `QuizChapterLevel.objective(Fr|En)` for this (chapter, stage) yet — keeps
// the level intro page working immediately for every existing module.
const OBJECTIVE_FALLBACK: Record<
  Locale,
  Record<Stage, (title: string, description: string) => string>
> = {
  FR: {
    DISCOVERY: (title, description) =>
      `Découvrez les bases du module « ${title} » : ${description}`,
    PRACTICE: (title) =>
      `Mettez en pratique ce que vous avez découvert sur « ${title} », directement dans l'application.`,
    MASTERY: (title) =>
      `Validez votre maîtrise du module « ${title} » sans aide, pour consolider ce que vous avez appris.`,
  },
  EN: {
    DISCOVERY: (title, description) =>
      `Discover the basics of the "${title}" module: ${description}`,
    PRACTICE: (title) =>
      `Put what you discovered about "${title}" into practice, directly in the app.`,
    MASTERY: (title) =>
      `Prove you've mastered the "${title}" module on your own, to lock in what you've learned.`,
  },
};

@Injectable()
export class TrainingQuizService {
  constructor(private readonly prisma: PrismaService) {}

  // A stage is unlocked when every question of the previous stage is solved
  // (DISCOVERY is always unlocked). Assumes `questions` all belong to one
  // chapter.
  private computeLevels(
    questions: Array<{ stage: Stage; solved: boolean }>,
    options?: {
      locale: Locale;
      chapterTitle: string;
      chapterDescription: string;
      objectivesByStage: Map<Stage, string>;
      introSeenStages: Set<Stage>;
    },
  ): QuizLevelSummary[] {
    const levels: QuizLevelSummary[] = [];
    let previousStageCleared = true;
    for (const stage of STAGE_ORDER) {
      const stageQuestions = questions.filter((q) => q.stage === stage);
      const totalQuestions = stageQuestions.length;
      const solvedQuestions = stageQuestions.filter((q) => q.solved).length;
      const objective = options
        ? (options.objectivesByStage.get(stage) ??
          OBJECTIVE_FALLBACK[options.locale][stage](
            options.chapterTitle,
            options.chapterDescription,
          ))
        : "";
      levels.push({
        stage,
        totalQuestions,
        solvedQuestions,
        unlocked: previousStageCleared,
        objective,
        introSeen: options ? options.introSeenStages.has(stage) : false,
      });
      previousStageCleared =
        totalQuestions > 0 && solvedQuestions === totalQuestions;
    }
    return levels;
  }

  private resolveRole(user: AuthenticatedUser): AppRole | null {
    if (user.activeRole) {
      return user.activeRole;
    }
    if (user.memberships.length > 0) {
      return user.memberships[0].role;
    }
    if (user.platformRoles.length > 0) {
      return user.platformRoles[0];
    }
    return null;
  }

  private resolveLocale(user: AuthenticatedUser): Locale {
    return user.preferredLocale === "EN" ? "EN" : "FR";
  }

  async listChapters(user: AuthenticatedUser): Promise<QuizChapterSummary[]> {
    const role = this.resolveRole(user);
    if (!role) {
      return [];
    }
    const locale = this.resolveLocale(user);

    const chapters = await this.prisma.quizChapter.findMany({
      where: { role, isActive: true },
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: { isActive: true },
          select: {
            id: true,
            progress: {
              where: { userId: user.id, solved: true },
              select: { id: true },
            },
          },
        },
      },
    });

    return chapters.map((chapter) => ({
      id: chapter.id,
      moduleKey: chapter.moduleKey,
      order: chapter.order,
      icon: chapter.icon,
      colorFrom: chapter.colorFrom,
      colorTo: chapter.colorTo,
      title: locale === "EN" ? chapter.titleEn : chapter.titleFr,
      description:
        locale === "EN" ? chapter.descriptionEn : chapter.descriptionFr,
      totalQuestions: chapter.questions.length,
      solvedQuestions: chapter.questions.filter((q) => q.progress.length > 0)
        .length,
    }));
  }

  async getChapter(
    user: AuthenticatedUser,
    chapterId: string,
  ): Promise<QuizChapterDetail> {
    const role = this.resolveRole(user);
    const locale = this.resolveLocale(user);

    const chapter = await this.prisma.quizChapter.findFirst({
      where: { id: chapterId, role: role ?? undefined, isActive: true },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            options: { orderBy: { order: "asc" } },
            progress: { where: { userId: user.id } },
          },
        },
        levels: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    const introsSeen = await this.prisma.quizUserLevelIntroSeen.findMany({
      where: { userId: user.id, chapterId: chapter.id },
      select: { stage: true },
    });

    const objectivesByStage = new Map<Stage, string>();
    for (const level of chapter.levels) {
      const objective = locale === "EN" ? level.objectiveEn : level.objectiveFr;
      if (objective) {
        objectivesByStage.set(level.stage, objective);
      }
    }

    const levels = this.computeLevels(
      chapter.questions.map((question) => ({
        stage: question.stage,
        solved: question.progress[0]?.solved ?? false,
      })),
      {
        locale,
        chapterTitle: locale === "EN" ? chapter.titleEn : chapter.titleFr,
        chapterDescription:
          locale === "EN" ? chapter.descriptionEn : chapter.descriptionFr,
        objectivesByStage,
        introSeenStages: new Set(introsSeen.map((row) => row.stage)),
      },
    );
    const unlockedStages = new Set(
      levels.filter((level) => level.unlocked).map((level) => level.stage),
    );

    return {
      id: chapter.id,
      moduleKey: chapter.moduleKey,
      order: chapter.order,
      icon: chapter.icon,
      colorFrom: chapter.colorFrom,
      colorTo: chapter.colorTo,
      title: locale === "EN" ? chapter.titleEn : chapter.titleFr,
      description:
        locale === "EN" ? chapter.descriptionEn : chapter.descriptionFr,
      totalQuestions: chapter.questions.length,
      solvedQuestions: chapter.questions.filter((q) => q.progress[0]?.solved)
        .length,
      levels,
      questions: chapter.questions.map((question) => ({
        id: question.id,
        order: question.order,
        type: question.type,
        stage: question.stage,
        text: locale === "EN" ? question.textEn : question.textFr,
        hint:
          question.stage !== "DISCOVERY"
            ? locale === "EN"
              ? question.hintEn
              : question.hintFr
            : null,
        imageUrl: question.imageUrl,
        deepLinkRoute: question.deepLinkRoute,
        solved: question.progress[0]?.solved ?? false,
        attemptsCount: question.progress[0]?.attemptsCount ?? 0,
        options: unlockedStages.has(question.stage)
          ? question.options.map((option) => ({
              id: option.id,
              order: option.order,
              text: locale === "EN" ? option.textEn : option.textFr,
            }))
          : [],
      })),
    };
  }

  async submitAnswer(
    user: AuthenticatedUser,
    questionId: string,
    optionIds: string[],
  ): Promise<QuizAnswerResult> {
    const locale = this.resolveLocale(user);

    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: true,
        chapter: {
          include: {
            questions: {
              where: { isActive: true },
              select: {
                stage: true,
                progress: {
                  where: { userId: user.id, solved: true },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException("Question not found");
    }

    const levels = this.computeLevels(
      question.chapter.questions.map((q) => ({
        stage: q.stage,
        solved: q.progress.length > 0,
      })),
    );
    const levelUnlocked =
      levels.find((level) => level.stage === question.stage)?.unlocked ?? false;
    if (!levelUnlocked) {
      throw new BadRequestException("This level is locked");
    }

    const validIds = new Set(question.options.map((o) => o.id));
    if (optionIds.length === 0 || !optionIds.every((id) => validIds.has(id))) {
      throw new BadRequestException("Invalid option selection");
    }

    const correctOptionIds = question.options
      .filter((o) => o.isCorrect)
      .map((o) => o.id);
    const selectedSet = new Set(optionIds);
    const correctSet = new Set(correctOptionIds);
    const correct =
      selectedSet.size === correctSet.size &&
      [...selectedSet].every((id) => correctSet.has(id));

    const existing = await this.prisma.quizUserQuestionProgress.findUnique({
      where: {
        userId_questionId: { userId: user.id, questionId: question.id },
      },
    });
    const wasAlreadySolved = existing?.solved ?? false;
    const attemptsCount = (existing?.attemptsCount ?? 0) + 1;

    await this.prisma.quizUserQuestionProgress.upsert({
      where: {
        userId_questionId: { userId: user.id, questionId: question.id },
      },
      create: {
        userId: user.id,
        questionId: question.id,
        attemptsCount: 1,
        solved: correct,
        solvedAt: correct ? new Date() : null,
        lastAnsweredAt: new Date(),
      },
      update: {
        attemptsCount: { increment: 1 },
        solved: correct ? true : undefined,
        solvedAt: correct && !wasAlreadySolved ? new Date() : undefined,
        lastAnsweredAt: new Date(),
      },
    });

    return {
      correct,
      alreadySolved: wasAlreadySolved,
      explanation:
        locale === "EN" ? question.explanationEn : question.explanationFr,
      // Discovery/practice never reveal which option was correct on a miss —
      // the learner is redirected to the app instead of being handed the
      // answer.
      correctOptionIds:
        correct || question.stage === "MASTERY" ? correctOptionIds : [],
      attemptsCount,
    };
  }

  async markLevelIntroSeen(
    user: AuthenticatedUser,
    chapterId: string,
    stage: string,
  ): Promise<{ ok: true }> {
    if (!STAGE_ORDER.includes(stage as Stage)) {
      throw new BadRequestException("Invalid stage");
    }
    const chapter = await this.prisma.quizChapter.findUnique({
      where: { id: chapterId },
      select: { id: true },
    });
    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }
    await this.prisma.quizUserLevelIntroSeen.upsert({
      where: {
        userId_chapterId_stage: {
          userId: user.id,
          chapterId,
          stage: stage as Stage,
        },
      },
      create: { userId: user.id, chapterId, stage: stage as Stage },
      update: {},
    });
    return { ok: true };
  }

  async getScore(user: AuthenticatedUser): Promise<QuizScoreSummary> {
    const role = this.resolveRole(user);
    const locale = this.resolveLocale(user);
    if (!role) {
      return {
        globalPercent: 0,
        totalQuestions: 0,
        solvedQuestions: 0,
        chapters: [],
      };
    }

    const chapters = await this.prisma.quizChapter.findMany({
      where: { role, isActive: true },
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: { isActive: true },
          select: {
            id: true,
            progress: {
              where: { userId: user.id, solved: true },
              select: { id: true },
            },
          },
        },
      },
    });

    let totalQuestions = 0;
    let solvedQuestions = 0;
    const chapterScores = chapters.map((chapter) => {
      const total = chapter.questions.length;
      const solved = chapter.questions.filter(
        (q) => q.progress.length > 0,
      ).length;
      totalQuestions += total;
      solvedQuestions += solved;
      return {
        chapterId: chapter.id,
        moduleKey: chapter.moduleKey,
        title: locale === "EN" ? chapter.titleEn : chapter.titleFr,
        percent: total === 0 ? 0 : Math.round((solved / total) * 100),
        totalQuestions: total,
        solvedQuestions: solved,
      };
    });

    return {
      globalPercent:
        totalQuestions === 0
          ? 0
          : Math.round((solvedQuestions / totalQuestions) * 100),
      totalQuestions,
      solvedQuestions,
      chapters: chapterScores,
    };
  }
}
