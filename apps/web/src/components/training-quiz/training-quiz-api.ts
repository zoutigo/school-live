import { getCsrfTokenCookie } from "../../lib/auth-cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function csrfHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const token = getCsrfTokenCookie();
  return token ? { ...headers, "x-csrf-token": token } : headers;
}

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

export type QuizQuestionType = "MCQ_SINGLE" | "MCQ_MULTI" | "TRUE_FALSE";
export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

export type QuizAnswerOption = { id: string; order: number; text: string };

export type QuizQuestion = {
  id: string;
  order: number;
  type: QuizQuestionType;
  difficulty: QuizDifficulty;
  text: string;
  hint: string;
  imageUrl: string | null;
  deepLinkRoute: string | null;
  solved: boolean;
  attemptsCount: number;
  options: QuizAnswerOption[];
};

export type QuizChapterDetail = QuizChapterSummary & {
  questions: QuizQuestion[];
};

export type QuizAnswerResult = {
  correct: boolean;
  alreadySolved: boolean;
  explanation: string;
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

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Training quiz request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function listChapters(): Promise<QuizChapterSummary[]> {
  const res = await fetch(`${API_URL}/training-quiz/chapters`, {
    credentials: "include",
  });
  return handle(res);
}

export async function getChapter(
  chapterId: string,
): Promise<QuizChapterDetail> {
  const res = await fetch(`${API_URL}/training-quiz/chapters/${chapterId}`, {
    credentials: "include",
  });
  return handle(res);
}

export async function submitAnswer(
  questionId: string,
  optionIds: string[],
): Promise<QuizAnswerResult> {
  const res = await fetch(
    `${API_URL}/training-quiz/questions/${questionId}/answer`,
    {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ optionIds }),
    },
  );
  return handle(res);
}

export async function getScore(): Promise<QuizScoreSummary> {
  const res = await fetch(`${API_URL}/training-quiz/score`, {
    credentials: "include",
  });
  return handle(res);
}
