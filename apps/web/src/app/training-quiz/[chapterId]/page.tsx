"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, PartyPopper, X } from "lucide-react";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  getChapter,
  submitAnswer,
  type QuizAnswerResult,
  type QuizChapterDetail,
  type QuizQuestion,
} from "../../../components/training-quiz/training-quiz-api";
import { TrainingQuizIcon } from "../../../components/training-quiz/training-quiz-icon";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type GlobalMe = { schoolSlug?: string | null };

function MissionTrail({
  questions,
  currentIndex,
  onSelect,
}: {
  questions: QuizQuestion[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {questions.map((question, index) => {
        const isCurrent = index === currentIndex;
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Mission ${index + 1}`}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-heading text-xs font-bold transition-all duration-200 motion-reduce:transition-none",
              question.solved
                ? "border-accent-teal bg-accent-teal text-white"
                : isCurrent
                  ? "border-primary bg-surface text-primary scale-110"
                  : "border-border bg-surface text-text-secondary",
            ].join(" ")}
          >
            {question.solved ? <Check className="h-4 w-4" /> : index + 1}
          </button>
        );
      })}
    </div>
  );
}

export default function TrainingQuizChapterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ chapterId: string }>();
  const chapterId = params.chapterId;

  const [ready, setReady] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState<string | null>(null);
  const [chapter, setChapter] = useState<QuizChapterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);

  const boot = useCallback(async () => {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as GlobalMe;
      setSchoolSlug(me.schoolSlug ?? null);

      const data = await getChapter(chapterId);
      setChapter(data);
      const firstUnsolved = data.questions.findIndex((q) => !q.solved);
      setCurrentIndex(firstUnsolved === -1 ? 0 : firstUnsolved);
    } catch {
      setError(t("trainingQuiz.errors.load"));
    } finally {
      setReady(true);
    }
  }, [chapterId, router, t]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const question = chapter?.questions[currentIndex] ?? null;
  const isLast = chapter
    ? currentIndex === chapter.questions.length - 1
    : false;

  const schoolBase = schoolSlug ? `/schools/${schoolSlug}` : "";

  function toggleOption(optionId: string) {
    if (result || !question) return;
    if (question.type === "MCQ_MULTI") {
      setSelected((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId],
      );
    } else {
      setSelected([optionId]);
    }
  }

  async function handleValidate() {
    if (!question || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer(question.id, selected);
      setResult(res);
      if (res.correct) {
        setChapter((prev) =>
          prev
            ? {
                ...prev,
                solvedQuestions: question.solved
                  ? prev.solvedQuestions
                  : prev.solvedQuestions + 1,
                questions: prev.questions.map((q) =>
                  q.id === question.id ? { ...q, solved: true } : q,
                ),
              }
            : prev,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  function goToIndex(index: number) {
    setCurrentIndex(index);
    setSelected([]);
    setResult(null);
  }

  function handleNext() {
    if (!chapter) return;
    if (isLast) {
      setFinished(true);
      return;
    }
    goToIndex(currentIndex + 1);
  }

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

  if (error || !chapter) {
    return (
      <AppShell
        schoolSlug={schoolSlug}
        schoolName={t("trainingQuiz.shellName")}
      >
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-notification">
            {error ?? t("trainingQuiz.errors.load")}
          </p>
        </div>
      </AppShell>
    );
  }

  if (finished) {
    return (
      <AppShell
        schoolSlug={schoolSlug}
        schoolName={t("trainingQuiz.shellName")}
      >
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
          <span
            className="inline-flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, ${chapter.colorFrom}, ${chapter.colorTo})`,
            }}
          >
            <PartyPopper className="h-10 w-10" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {t("trainingQuiz.chapter.completeTitle")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("trainingQuiz.chapter.completeSubtitle")}
          </p>
          <Button
            onClick={() => router.push("/training-quiz")}
            className="mt-4"
          >
            {t("trainingQuiz.chapter.completeBackCta")}
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <AppShell schoolSlug={schoolSlug} schoolName={t("trainingQuiz.shellName")}>
      <div className="mx-auto max-w-4xl px-4 py-3 lg:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push("/training-quiz")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("trainingQuiz.chapter.back")}
          </button>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: `linear-gradient(135deg, ${chapter.colorFrom}, ${chapter.colorTo})`,
              }}
            >
              <TrainingQuizIcon name={chapter.icon} className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-heading text-sm font-bold leading-tight text-text-primary">
                {chapter.title}
              </h1>
              <p className="text-xs font-semibold text-text-secondary">
                {t("trainingQuiz.chapter.missionLabel")
                  .replace("{current}", String(currentIndex + 1))
                  .replace("{total}", String(chapter.questions.length))}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <MissionTrail
            questions={chapter.questions}
            currentIndex={currentIndex}
            onSelect={(index) => goToIndex(index)}
          />
        </div>

        <div className="mt-2 rounded-[20px] border border-border bg-surface p-4 shadow-card lg:flex lg:gap-5">
          {question.imageUrl ? (
            <div className="mb-3 overflow-hidden rounded-card lg:mb-0 lg:w-32 lg:shrink-0">
              <img
                src={question.imageUrl}
                alt=""
                className="mx-auto h-20 w-auto lg:h-auto lg:w-full"
              />
            </div>
          ) : null}

          <div className="lg:flex-1">
            <h2 className="font-heading text-base font-semibold text-text-primary">
              {question.text}
            </h2>
            {question.type === "MCQ_MULTI" ? (
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {t("trainingQuiz.chapter.multiHint")}
              </p>
            ) : null}

            <div className="mt-3 flex flex-col gap-2">
              {question.options.map((option) => {
                const isSelected = selected.includes(option.id);
                const isCorrectOption = result?.correctOptionIds.includes(
                  option.id,
                );
                let stateClasses =
                  "border-border bg-background hover:border-primary/60";
                if (result) {
                  if (isCorrectOption) {
                    stateClasses = "border-accent-teal bg-teal-surface";
                  } else if (isSelected && !isCorrectOption) {
                    stateClasses = "border-mark-red bg-[#FBEAE8]";
                  } else {
                    stateClasses = "border-border bg-background opacity-60";
                  }
                } else if (isSelected) {
                  stateClasses = "border-primary bg-teal-highlight/40";
                }

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={!!result}
                    onClick={() => toggleOption(option.id)}
                    className={`flex items-center justify-between rounded-card border-2 px-4 py-2.5 text-left text-sm font-medium text-text-primary transition-colors duration-200 motion-reduce:transition-none ${stateClasses}`}
                  >
                    <span>{option.text}</span>
                    {result && isCorrectOption ? (
                      <Check
                        className="h-5 w-5 shrink-0 text-accent-teal"
                        aria-hidden="true"
                      />
                    ) : result && isSelected && !isCorrectOption ? (
                      <X
                        className="h-5 w-5 shrink-0 text-mark-red"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {result ? (
              <div
                className={`mt-3 rounded-card border p-3 ${
                  result.correct
                    ? "border-teal-border bg-teal-surface"
                    : "border-warm-border bg-warm-surface"
                }`}
              >
                <p className="font-heading text-sm font-bold text-text-primary">
                  {result.correct
                    ? t("trainingQuiz.chapter.correctTitle")
                    : t("trainingQuiz.chapter.incorrectTitle")}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {result.explanation}
                </p>
                {!result.correct ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    {t("trainingQuiz.chapter.retryHint")}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {result.correct ? (
                    <Button onClick={handleNext}>
                      {isLast
                        ? t("trainingQuiz.chapter.finish")
                        : t("trainingQuiz.chapter.next")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setResult(null);
                        setSelected([]);
                      }}
                    >
                      {t("trainingQuiz.chapter.retry")}
                    </Button>
                  )}
                  {question.deepLinkRoute ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`${schoolBase}${question.deepLinkRoute}`)
                      }
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {t("trainingQuiz.chapter.deepLinkCta")}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  onClick={handleValidate}
                  disabled={selected.length === 0 || submitting}
                >
                  {t("trainingQuiz.chapter.validate")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
