"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { AppShell } from "../../components/layout/app-shell";
import { useTranslation } from "../../i18n/useTranslation";
import { usePageHelp } from "../../store/page-help";
import { ProgressRing } from "../../components/training-quiz/progress-ring";
import { TrainingQuizIcon } from "../../components/training-quiz/training-quiz-icon";
import {
  getScore,
  listChapters,
  type QuizChapterSummary,
  type QuizScoreSummary,
} from "../../components/training-quiz/training-quiz-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type GlobalMe = { schoolSlug?: string | null };

function ScorePanel({
  score,
  t,
  className = "",
}: {
  score: QuizScoreSummary | null;
  t: (key: string) => string;
  className?: string;
}) {
  const percent = score?.globalPercent ?? 0;
  const encouragement =
    score === null || score.solvedQuestions === 0
      ? t("trainingQuiz.score.encouragementEmpty")
      : percent >= 100
        ? t("trainingQuiz.score.encouragementDone")
        : t("trainingQuiz.score.encouragementProgress");

  return (
    <div
      className={`rounded-[20px] border border-border bg-surface p-5 shadow-card ${className}`}
    >
      <p className="font-heading text-sm font-semibold uppercase tracking-wide text-text-secondary">
        {t("trainingQuiz.score.title")}
      </p>
      <div className="mt-4 flex items-center gap-4">
        <ProgressRing percent={percent} size={72} strokeWidth={7}>
          <span className="font-heading text-lg font-bold text-text-primary">
            {percent}%
          </span>
        </ProgressRing>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {t("trainingQuiz.score.globalLabel")}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{encouragement}</p>
        </div>
      </div>
    </div>
  );
}

function ChapterCard({
  chapter,
  t,
  onOpen,
}: {
  chapter: QuizChapterSummary;
  t: (key: string) => string;
  onOpen: () => void;
}) {
  const percent =
    chapter.totalQuestions === 0
      ? 0
      : Math.round((chapter.solvedQuestions / chapter.totalQuestions) * 100);
  const cta =
    percent >= 100
      ? t("trainingQuiz.list.completeCta")
      : chapter.solvedQuestions > 0
        ? t("trainingQuiz.list.continueCta")
        : t("trainingQuiz.list.startCta");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-start gap-4 rounded-[20px] border border-border bg-surface p-5 text-left shadow-card transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_10px_20px_rgba(0,0,0,0.12)]"
          style={{
            background: `linear-gradient(135deg, ${chapter.colorFrom}, ${chapter.colorTo})`,
          }}
        >
          <TrainingQuizIcon name={chapter.icon} className="h-7 w-7" />
        </span>
        <ProgressRing percent={percent} size={48} strokeWidth={5}>
          <span className="text-xs font-bold text-text-primary">
            {percent}%
          </span>
        </ProgressRing>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold text-text-primary">
          {chapter.title}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          {chapter.description}
        </p>
      </div>

      <div className="mt-auto flex w-full items-center justify-between pt-2">
        <span className="text-xs font-medium text-text-secondary">
          {t("trainingQuiz.list.missionsCount").replace(
            "{count}",
            String(chapter.totalQuestions),
          )}
        </span>
        <span className="font-heading text-sm font-semibold text-primary transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
          {cta}
        </span>
      </div>
    </button>
  );
}

export default function TrainingQuizPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [chapters, setChapters] = useState<QuizChapterSummary[]>([]);
  const [score, setScore] = useState<QuizScoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePageHelp({
    title: t("trainingQuiz.list.title"),
    sections: [
      {
        title: t("trainingQuiz.list.title"),
        body: [t("trainingQuiz.list.subtitle")],
      },
    ],
  });

  const boot = useCallback(async () => {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as GlobalMe;
      setSchoolSlug(me.schoolSlug ?? null);

      const [chaptersData, scoreData] = await Promise.all([
        listChapters(),
        getScore(),
      ]);
      setChapters(chaptersData);
      setScore(scoreData);
    } catch {
      setError(t("trainingQuiz.errors.load"));
    } finally {
      setReady(true);
    }
  }, [router, t]);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (!ready) {
    return (
      <AppShell
        schoolSlug={schoolSlug}
        schoolName={t("trainingQuiz.shellName")}
      >
        <div className="flex h-48 items-center justify-center text-sm text-text-secondary">
          {t("common.loading")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("trainingQuiz.shellName")}>
      <div className="mx-auto max-w-6xl px-4 py-8 lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-warm-highlight text-warm-accent-dark">
              <Trophy className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-primary">
                {t("trainingQuiz.list.title")}
              </h1>
              <p className="text-sm text-text-secondary">
                {t("trainingQuiz.list.subtitle")}
              </p>
            </div>
          </div>

          <ScorePanel score={score} t={t} className="mt-6 lg:hidden" />

          {error ? (
            <p className="mt-6 text-sm text-notification">{error}</p>
          ) : chapters.length === 0 ? (
            <p className="mt-8 text-sm text-text-secondary">
              {t("trainingQuiz.list.empty")}
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {chapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  t={t}
                  onOpen={() => router.push(`/training-quiz/${chapter.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block lg:w-72 lg:shrink-0">
          <ScorePanel score={score} t={t} />
        </aside>
      </div>
    </AppShell>
  );
}
