import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "../ui/button";
import { ConfettiBurst } from "./confetti-burst";
import type { QuizChapterDetail, QuizStage } from "./training-quiz-api";

const ENCOURAGEMENT_KEYS = [
  "trainingQuiz.levelComplete.encouragement.one",
  "trainingQuiz.levelComplete.encouragement.two",
  "trainingQuiz.levelComplete.encouragement.three",
  "trainingQuiz.levelComplete.encouragement.four",
];

function pickEncouragementKey(seed: string): string {
  const hash = seed
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ENCOURAGEMENT_KEYS[hash % ENCOURAGEMENT_KEYS.length];
}

export function LevelComplete({
  chapter,
  level,
  nextStage,
  onContinue,
  onBackToHome,
  t,
}: {
  chapter: QuizChapterDetail;
  level: QuizChapterDetail["levels"][number];
  // The next stage the learner is about to start, or null when this was the
  // chapter's last stage (a separate chapter-complete screen follows).
  nextStage: QuizStage | null;
  onContinue: () => void;
  onBackToHome: () => void;
  t: (key: string) => string;
}) {
  const stageKey = level.stage.toLowerCase();
  const encouragement = t(pickEncouragementKey(`${chapter.id}-${level.stage}`));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="relative overflow-hidden rounded-[20px] border border-border bg-surface p-6 text-center shadow-card">
        <ConfettiBurst />

        <span className="celebration-badge celebration-ring-pulse relative mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-teal to-accent-teal-dark text-white">
          <PartyPopper className="h-10 w-10" aria-hidden="true" />
        </span>

        <h1 className="celebration-rise-in mt-4 font-heading text-2xl font-bold text-text-primary">
          {t("trainingQuiz.levelComplete.title").replace(
            "{stage}",
            t(`trainingQuiz.chapter.stage.${stageKey}`),
          )}
        </h1>
        <p className="celebration-rise-in mt-1 text-sm font-semibold text-text-secondary">
          {chapter.title}
        </p>

        <div
          className="celebration-rise-in mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-teal-border bg-teal-surface px-4 py-2 font-heading text-lg font-bold text-accent-teal-dark"
          style={{ animationDelay: "0.1s" }}
        >
          {t("trainingQuiz.levelComplete.scoreLabel")
            .replace("{solved}", String(level.solvedQuestions))
            .replace("{total}", String(level.totalQuestions))}
        </div>

        <p
          className="celebration-rise-in mt-4 text-sm text-text-primary"
          style={{ animationDelay: "0.2s" }}
        >
          {encouragement}
        </p>

        <p
          className="celebration-rise-in mt-1 text-sm font-semibold text-primary"
          style={{ animationDelay: "0.3s" }}
        >
          {nextStage
            ? t("trainingQuiz.levelComplete.nextLevelHint").replace(
                "{stage}",
                t(`trainingQuiz.chapter.stage.${nextStage.toLowerCase()}`),
              )
            : t("trainingQuiz.levelComplete.chapterAlmostDoneHint")}
        </p>

        <div
          className="celebration-rise-in mt-5 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row"
          style={{ animationDelay: "0.35s" }}
        >
          <Button
            variant="secondary"
            onClick={onBackToHome}
            className="w-full sm:w-auto"
          >
            {t("trainingQuiz.chapter.back")}
          </Button>
          <Button onClick={onContinue} className="w-full sm:w-auto">
            {nextStage
              ? t("trainingQuiz.levelComplete.continueCta").replace(
                  "{stage}",
                  t(`trainingQuiz.chapter.stage.${nextStage.toLowerCase()}`),
                )
              : t("trainingQuiz.levelComplete.finishChapterCta")}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
