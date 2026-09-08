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
  QuizScoreSummary,
} from "./training-quiz.types.js";

type Locale = "FR" | "EN";

@Injectable()
export class TrainingQuizService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

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
      questions: chapter.questions.map((question) => ({
        id: question.id,
        order: question.order,
        type: question.type,
        difficulty: question.difficulty,
        text: locale === "EN" ? question.textEn : question.textFr,
        hint: locale === "EN" ? question.hintEn : question.hintFr,
        imageUrl: question.imageUrl,
        deepLinkRoute: question.deepLinkRoute,
        solved: question.progress[0]?.solved ?? false,
        attemptsCount: question.progress[0]?.attemptsCount ?? 0,
        options: question.options.map((option) => ({
          id: option.id,
          order: option.order,
          text: locale === "EN" ? option.textEn : option.textFr,
        })),
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
      include: { options: true },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException("Question not found");
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
      correctOptionIds,
      attemptsCount,
    };
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
