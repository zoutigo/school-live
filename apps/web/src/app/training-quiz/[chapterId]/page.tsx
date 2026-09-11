"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Lightbulb,
  Lock,
  PartyPopper,
  X,
} from "lucide-react";
import { AppShell } from "../../../components/layout/app-shell";
import { Button } from "../../../components/ui/button";
import { useTranslation } from "../../../i18n/useTranslation";
import {
  getChapter,
  listChapters,
  markLevelIntroSeen,
  submitAnswer,
  type QuizAnswerOption,
  type QuizAnswerResult,
  type QuizChapterDetail,
  type QuizChapterSummary,
  type QuizStage,
  type QuizQuestion,
} from "../../../components/training-quiz/training-quiz-api";
import { TrainingQuizIcon } from "../../../components/training-quiz/training-quiz-icon";
import { LevelIntro } from "../../../components/training-quiz/level-intro";
import { LevelComplete } from "../../../components/training-quiz/level-complete";
import { ConfettiBurst } from "../../../components/training-quiz/confetti-burst";

const STAGE_ORDER: QuizStage[] = ["DISCOVERY", "PRACTICE", "MASTERY"];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// Cooldown (seconds) applied before "Retry" is re-enabled, indexed by the
// number of wrong attempts made so far on this question (a single honest
// mistake stays free). Deliberately steep past that — up to 8 minutes — to
// make random clicking through options a genuinely unattractive strategy
// rather than a shortcut around thinking about the hint/explanation.
const RETRY_COOLDOWN_SECONDS = [0, 120, 240, 480];

function retryCooldownFor(attemptsCount: number): number {
  const index = Math.min(
    Math.max(attemptsCount - 1, 0),
    RETRY_COOLDOWN_SECONDS.length - 1,
  );
  return RETRY_COOLDOWN_SECONDS[index];
}

function formatCooldown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let s = seed || 1;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const STAGE_STYLES: Record<QuizStage, string> = {
  DISCOVERY: "bg-teal-surface text-accent-teal-dark border-teal-border",
  PRACTICE: "bg-warm-surface text-warm-accent-dark border-warm-border",
  MASTERY: "bg-[#FBEAE8] text-mark-red border-mark-red/40",
};

type GlobalMe = { schoolSlug?: string | null };
type ParentMe = { linkedStudents?: Array<{ id: string }> };

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

function LevelTabs({
  levels,
  currentLevel,
  onSelect,
  t,
}: {
  levels: QuizChapterDetail["levels"];
  currentLevel: QuizStage;
  onSelect: (stage: QuizStage) => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
      role="tablist"
      aria-label={t("trainingQuiz.chapter.stage.discovery")}
    >
      {levels.map((level) => {
        if (level.totalQuestions === 0) return null;
        const isCurrent = level.stage === currentLevel;
        const stageKey = level.stage.toLowerCase();
        return (
          <button
            key={level.stage}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            disabled={!level.unlocked}
            title={
              level.unlocked ? undefined : t("trainingQuiz.chapter.levelLocked")
            }
            onClick={() => level.unlocked && onSelect(level.stage)}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors duration-200 motion-reduce:transition-none",
              !level.unlocked
                ? "cursor-not-allowed border-border bg-background text-text-secondary/50"
                : isCurrent
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-text-secondary hover:border-primary/60",
            ].join(" ")}
          >
            {level.unlocked ? (
              level.solvedQuestions === level.totalQuestions ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null
            ) : (
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t(`trainingQuiz.chapter.stage.${stageKey}`)}
            <span className="font-normal opacity-80">
              {t("trainingQuiz.chapter.levelProgress")
                .replace("{solved}", String(level.solvedQuestions))
                .replace("{total}", String(level.totalQuestions))}
            </span>
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
  const [linkedChildId, setLinkedChildId] = useState<string | null>(null);
  const [chapter, setChapter] = useState<QuizChapterDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentLevel, setCurrentLevel] = useState<QuizStage>("DISCOVERY");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [attemptRound, setAttemptRound] = useState(0);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);
  const [hasVisitedDeepLink, setHasVisitedDeepLink] = useState(false);
  const [showLevelIntro, setShowLevelIntro] = useState(false);
  const [startingLevel, setStartingLevel] = useState(false);
  const [levelJustCompleted, setLevelJustCompleted] = useState<
    QuizChapterDetail["levels"][number] | null
  >(null);
  const [nextModuleSuggestion, setNextModuleSuggestion] =
    useState<QuizChapterSummary | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const boot = useCallback(async () => {
    try {
      const meRes = await fetch(`${API_URL}/me`, { credentials: "include" });
      if (!meRes.ok) {
        router.replace("/");
        return;
      }
      const me = (await meRes.json()) as GlobalMe;
      setSchoolSlug(me.schoolSlug ?? null);

      const [data] = await Promise.all([
        getChapter(chapterId),
        me.schoolSlug
          ? fetch(`${API_URL}/schools/${me.schoolSlug}/me`, {
              credentials: "include",
            })
              .then((res) =>
                res.ok ? (res.json() as Promise<ParentMe>) : null,
              )
              .then((parentMe) =>
                setLinkedChildId(parentMe?.linkedStudents?.[0]?.id ?? null),
              )
              .catch(() => undefined)
          : Promise.resolve(undefined),
      ]);
      setChapter(data);

      const firstUnfinishedLevel =
        data.levels.find(
          (level) =>
            level.unlocked &&
            level.totalQuestions > 0 &&
            level.solvedQuestions < level.totalQuestions,
        ) ?? data.levels.find((level) => level.totalQuestions > 0);
      const stage = firstUnfinishedLevel?.stage ?? "DISCOVERY";
      setCurrentLevel(stage);
      const levelQuestions = data.questions.filter((q) => q.stage === stage);
      const firstUnsolved = levelQuestions.findIndex((q) => !q.solved);
      setCurrentIndex(firstUnsolved === -1 ? 0 : firstUnsolved);
      setShowLevelIntro(
        data.levels.find((level) => level.stage === stage)?.introSeen === false,
      );
    } catch {
      setError(t("trainingQuiz.errors.load"));
    } finally {
      setReady(true);
    }
  }, [chapterId, router, t]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  const levelQuestions = useMemo(
    () => chapter?.questions.filter((q) => q.stage === currentLevel) ?? [],
    [chapter, currentLevel],
  );
  const question = levelQuestions[currentIndex] ?? null;
  const isLastInLevel = currentIndex === levelQuestions.length - 1;
  const isLastLevelWithQuestions = chapter
    ? STAGE_ORDER.filter(
        (s) => chapter.levels.find((l) => l.stage === s)?.totalQuestions,
      ).at(-1) === currentLevel
    : true;
  const isLast = isLastInLevel && isLastLevelWithQuestions;
  // Only the Practice stage requires visiting the real app screen before a
  // retry is allowed — Discovery is free recall, Mastery is self-contained.
  const isPracticeStage = question ? question.stage === "PRACTICE" : false;

  const schoolBase = schoolSlug ? `/schools/${schoolSlug}` : "";

  const displayedOptions: QuizAnswerOption[] = useMemo(() => {
    if (!question) return [];
    return shuffle(
      question.options,
      question.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) +
        attemptRound * 97,
    );
  }, [question, attemptRound]);

  const resolvedDeepLink = useMemo(() => {
    if (!question?.deepLinkRoute) return null;
    if (question.deepLinkRoute.includes("{childId}")) {
      if (!linkedChildId) return null;
      return question.deepLinkRoute.replace("{childId}", linkedChildId);
    }
    return question.deepLinkRoute;
  }, [question, linkedChildId]);

  function startCooldown(seconds: number) {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    if (seconds <= 0) {
      setCooldownSecondsLeft(0);
      return;
    }
    setCooldownSecondsLeft(seconds);
    cooldownTimer.current = setInterval(() => {
      setCooldownSecondsLeft((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

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
        // A correct answer can unlock the next stage. The API only sends real
        // `options` for stages that were already unlocked when the chapter was
        // fetched, so a stage unlocked purely by local state would render its
        // questions with an empty option list — refetch to get real options
        // for the newly-unlocked stage instead of patching state locally.
        try {
          const fresh = await getChapter(chapterId);
          setChapter(fresh);
        } catch {
          setChapter((prev) => {
            if (!prev) return prev;
            const questions = prev.questions.map((q) =>
              q.id === question.id ? { ...q, solved: true } : q,
            );
            const levels: QuizChapterDetail["levels"] = [];
            let previousLevelCleared = true;
            for (const stage of STAGE_ORDER) {
              const levelQs = questions.filter((q) => q.stage === stage);
              const totalQuestions = levelQs.length;
              const solvedQuestions = levelQs.filter((q) => q.solved).length;
              const prevLevel = prev.levels.find((l) => l.stage === stage);
              levels.push({
                stage,
                totalQuestions,
                solvedQuestions,
                unlocked: previousLevelCleared,
                objective: prevLevel?.objective ?? "",
                introSeen: prevLevel?.introSeen ?? false,
              });
              previousLevelCleared =
                totalQuestions > 0 && solvedQuestions === totalQuestions;
            }
            return {
              ...prev,
              solvedQuestions: question.solved
                ? prev.solvedQuestions
                : prev.solvedQuestions + 1,
              questions,
              levels,
            };
          });
        }
      } else {
        if (res.attemptsCount >= 2) {
          setHintOpen(true);
        }
        startCooldown(retryCooldownFor(res.attemptsCount));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetQuestionState() {
    setSelected([]);
    setResult(null);
    setHintOpen(false);
    setAttemptRound(0);
    setCooldownSecondsLeft(0);
    setHasVisitedDeepLink(false);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
  }

  function goToIndex(index: number) {
    setCurrentIndex(index);
    resetQuestionState();
  }

  function goToLevel(stage: QuizStage) {
    setCurrentLevel(stage);
    setCurrentIndex(0);
    resetQuestionState();
    setShowLevelIntro(
      chapter?.levels.find((level) => level.stage === stage)?.introSeen ===
        false,
    );
  }

  async function handleStartLevel() {
    if (!chapter) return;
    setStartingLevel(true);
    try {
      await markLevelIntroSeen(chapter.id, currentLevel);
      setChapter((prev) =>
        prev
          ? {
              ...prev,
              levels: prev.levels.map((level) =>
                level.stage === currentLevel
                  ? { ...level, introSeen: true }
                  : level,
              ),
            }
          : prev,
      );
      setShowLevelIntro(false);
    } finally {
      setStartingLevel(false);
    }
  }

  async function handleLevelCompleteContinue() {
    const completedLevel = levelJustCompleted;
    setLevelJustCompleted(null);
    if (!completedLevel || !chapter) return;
    const nextLevel = STAGE_ORDER.slice(
      STAGE_ORDER.indexOf(completedLevel.stage) + 1,
    ).find((s) => chapter.levels.find((l) => l.stage === s)?.totalQuestions);
    if (nextLevel) {
      goToLevel(nextLevel);
      return;
    }
    try {
      const chapters = await listChapters();
      const suggestion = chapters.find(
        (c) =>
          c.id !== chapter.id &&
          c.totalQuestions > 0 &&
          c.solvedQuestions < c.totalQuestions,
      );
      setNextModuleSuggestion(suggestion ?? null);
    } catch {
      setNextModuleSuggestion(null);
    }
    setFinished(true);
  }

  function handleRetry() {
    if (cooldownSecondsLeft > 0) return;
    if (isPracticeStage && !hasVisitedDeepLink) return;
    setResult(null);
    setSelected([]);
    setAttemptRound((prev) => prev + 1);
  }

  function handleNext() {
    if (!chapter) return;
    if (isLastInLevel) {
      const completedLevel = chapter.levels.find(
        (l) => l.stage === currentLevel,
      );
      if (completedLevel) {
        setLevelJustCompleted(completedLevel);
      }
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
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3 overflow-hidden px-4 py-16 text-center">
          <ConfettiBurst />
          <span
            className="celebration-badge celebration-ring-pulse relative inline-flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, ${chapter.colorFrom}, ${chapter.colorTo})`,
            }}
          >
            <PartyPopper className="h-10 w-10" aria-hidden="true" />
          </span>
          <h1 className="celebration-rise-in font-heading text-2xl font-bold text-text-primary">
            {t("trainingQuiz.chapter.completeTitle")}
          </h1>
          <p
            className="celebration-rise-in text-sm text-text-secondary"
            style={{ animationDelay: "0.1s" }}
          >
            {t("trainingQuiz.chapter.completeSubtitle")}
          </p>
          <div
            className="celebration-rise-in inline-flex items-center gap-2 rounded-full border border-teal-border bg-teal-surface px-4 py-2 font-heading text-lg font-bold text-accent-teal-dark"
            style={{ animationDelay: "0.15s" }}
          >
            {t("trainingQuiz.chapter.completeScore").replace(
              "{total}",
              String(chapter.totalQuestions),
            )}
          </div>

          {nextModuleSuggestion ? (
            <div
              className="celebration-rise-in mt-3 w-full rounded-[20px] border border-primary/40 bg-teal-highlight/30 p-4 text-left"
              style={{ animationDelay: "0.2s" }}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {t("trainingQuiz.chapter.nextModuleLabel")}
              </p>
              <p className="mt-1 font-heading text-base font-semibold text-text-primary">
                {nextModuleSuggestion.title}
              </p>
              <Button
                onClick={() =>
                  router.push(`/training-quiz/${nextModuleSuggestion.id}`)
                }
                className="mt-3 w-full sm:w-auto"
              >
                {t("trainingQuiz.chapter.nextModuleCta")}
              </Button>
            </div>
          ) : null}

          <Button
            variant={nextModuleSuggestion ? "secondary" : "primary"}
            onClick={() => router.push("/training-quiz")}
            className="celebration-rise-in mt-2"
            style={{ animationDelay: "0.25s" }}
          >
            {t("trainingQuiz.chapter.completeBackCta")}
          </Button>
        </div>
      </AppShell>
    );
  }

  if (levelJustCompleted) {
    const nextStage =
      STAGE_ORDER.slice(STAGE_ORDER.indexOf(levelJustCompleted.stage) + 1).find(
        (s) => chapter.levels.find((l) => l.stage === s)?.totalQuestions,
      ) ?? null;
    return (
      <AppShell
        schoolSlug={schoolSlug}
        schoolName={t("trainingQuiz.shellName")}
      >
        <LevelComplete
          chapter={chapter}
          level={levelJustCompleted}
          nextStage={nextStage}
          onContinue={handleLevelCompleteContinue}
          onBackToHome={() => router.push("/training-quiz")}
          t={t}
        />
      </AppShell>
    );
  }

  if (showLevelIntro) {
    const levelInfo = chapter.levels.find((l) => l.stage === currentLevel);
    if (levelInfo) {
      return (
        <AppShell
          schoolSlug={schoolSlug}
          schoolName={t("trainingQuiz.shellName")}
        >
          <LevelIntro
            chapter={chapter}
            level={levelInfo}
            onStart={handleStartLevel}
            onBack={() => router.push("/training-quiz")}
            starting={startingLevel}
            t={t}
          />
        </AppShell>
      );
    }
  }

  if (!question) {
    return null;
  }

  const stageKey = question.stage.toLowerCase() as
    | "discovery"
    | "practice"
    | "mastery";

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
                  .replace("{total}", String(levelQuestions.length))}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <LevelTabs
            levels={chapter.levels}
            currentLevel={currentLevel}
            onSelect={goToLevel}
            t={t}
          />
        </div>

        <div className="mt-2">
          <MissionTrail
            questions={levelQuestions}
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
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-heading text-base font-semibold text-text-primary">
                {question.text}
              </h2>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLES[question.stage]}`}
              >
                {t(`trainingQuiz.chapter.stage.${stageKey}`)}
              </span>
            </div>
            {question.type === "MCQ_MULTI" ? (
              <p className="mt-1 text-xs font-medium text-text-secondary">
                {t("trainingQuiz.chapter.multiHint")}
              </p>
            ) : null}

            <div className="mt-3 flex flex-col gap-2">
              {displayedOptions.map((option) => {
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

            {question.stage !== "DISCOVERY" && question.hint ? (
              <div className="mt-3">
                {!result ? (
                  <button
                    type="button"
                    onClick={() => setHintOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-accent-dark hover:underline"
                  >
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                    {hintOpen
                      ? t("trainingQuiz.chapter.hintHideCta")
                      : t("trainingQuiz.chapter.hintShowCta")}
                  </button>
                ) : null}
                {hintOpen ? (
                  <p className="mt-1.5 rounded-card border border-warm-border bg-warm-surface px-3 py-2 text-xs text-text-secondary">
                    {question.hint}
                  </p>
                ) : null}
              </div>
            ) : null}

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
                    {isPracticeStage
                      ? t("trainingQuiz.chapter.findAnswerInApp")
                      : question.stage === "DISCOVERY"
                        ? t("trainingQuiz.chapter.discoveryRetryHint")
                        : result.attemptsCount >= 2
                          ? t("trainingQuiz.chapter.hintAutoSuggest")
                          : t("trainingQuiz.chapter.retryHint")}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  {result.correct ? (
                    <Button onClick={handleNext} className="w-full sm:w-auto">
                      {isLast
                        ? t("trainingQuiz.chapter.finish")
                        : t("trainingQuiz.chapter.next")}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={handleRetry}
                      disabled={
                        cooldownSecondsLeft > 0 ||
                        (isPracticeStage && !hasVisitedDeepLink)
                      }
                      className="w-full sm:w-auto"
                    >
                      {cooldownSecondsLeft > 0
                        ? t("trainingQuiz.chapter.retryCooldown").replace(
                            "{time}",
                            formatCooldown(cooldownSecondsLeft),
                          )
                        : t("trainingQuiz.chapter.retry")}
                    </Button>
                  )}
                  {resolvedDeepLink ? (
                    <Button
                      variant={
                        !result.correct && isPracticeStage ? "primary" : "ghost"
                      }
                      onClick={() => {
                        setHasVisitedDeepLink(true);
                        router.push(`${schoolBase}${resolvedDeepLink}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      {hasVisitedDeepLink ? (
                        <Check
                          className="mr-1.5 h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                      {hasVisitedDeepLink
                        ? t("trainingQuiz.chapter.deepLinkVisited")
                        : t("trainingQuiz.chapter.deepLinkCta")}
                    </Button>
                  ) : null}
                </div>
                {!result.correct &&
                isPracticeStage &&
                cooldownSecondsLeft === 0 &&
                !hasVisitedDeepLink ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    {t("trainingQuiz.chapter.retryNeedsDeepLinkHint")}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3">
                <Button
                  onClick={handleValidate}
                  disabled={selected.length === 0 || submitting}
                  className="w-full sm:w-auto"
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
