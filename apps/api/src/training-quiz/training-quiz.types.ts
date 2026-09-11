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
  stage: "DISCOVERY" | "PRACTICE" | "MASTERY";
  text: string;
  // Not populated for DISCOVERY — pure recall, no help offered there.
  hint: string | null;
  imageUrl: string | null;
  deepLinkRoute: string | null;
  solved: boolean;
  attemptsCount: number;
  options: QuizAnswerOptionPublic[];
};

export type QuizLevelSummary = {
  stage: "DISCOVERY" | "PRACTICE" | "MASTERY";
  totalQuestions: number;
  solvedQuestions: number;
  unlocked: boolean;
  // Objective shown on the level's intro page — a personalized editorial
  // text when authored for this (chapter, stage), otherwise a generic
  // fallback built from the chapter description.
  objective: string;
  // Whether this user has already dismissed this level's intro page —
  // persisted server-side so it does not reappear on reconnection.
  introSeen: boolean;
};

export type QuizChapterDetail = QuizChapterSummary & {
  levels: QuizLevelSummary[];
  questions: QuizQuestionPublic[];
};

export type QuizAnswerResult = {
  correct: boolean;
  alreadySolved: boolean;
  explanation: string;
  // Only populated on a MASTERY question — discovery/practice never reveal
  // which option was correct on a wrong attempt.
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
