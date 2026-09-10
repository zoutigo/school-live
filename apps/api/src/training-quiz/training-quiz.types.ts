export type QuizChapterSummary = {
  id: string;
  moduleKey: string;
  order: number;
  icon: string;
  colorFrom: string;
  colorTo: string;
  title: string;
  description: string;
  totalQuestions: number;
  solvedQuestions: number;
};

export type QuizAnswerOptionPublic = {
  id: string;
  order: number;
  text: string;
};

export type QuizQuestionPublic = {
  id: string;
  order: number;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  text: string;
  // Only populated for HARD questions — easy/medium levels don't offer a hint.
  hint: string | null;
  imageUrl: string | null;
  deepLinkRoute: string | null;
  solved: boolean;
  attemptsCount: number;
  options: QuizAnswerOptionPublic[];
};

export type QuizLevelSummary = {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalQuestions: number;
  solvedQuestions: number;
  unlocked: boolean;
};

export type QuizChapterDetail = QuizChapterSummary & {
  levels: QuizLevelSummary[];
  questions: QuizQuestionPublic[];
};

export type QuizAnswerResult = {
  correct: boolean;
  alreadySolved: boolean;
  explanation: string;
  // Only populated on a HARD question — easy/medium never reveal which
  // option was correct on a wrong attempt.
  correctOptionIds: string[];
  attemptsCount: number;
};

export type QuizScoreSummary = {
  globalPercent: number;
  totalQuestions: number;
  solvedQuestions: number;
  chapters: Array<{
    chapterId: string;
    moduleKey: string;
    title: string;
    percent: number;
    totalQuestions: number;
    solvedQuestions: number;
  }>;
};
