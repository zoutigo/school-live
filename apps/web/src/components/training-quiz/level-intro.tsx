import { Compass, ListChecks, Sparkles, Target } from "lucide-react";
import { Button } from "../ui/button";
import { TrainingQuizIcon } from "./training-quiz-icon";
import type { QuizChapterDetail, QuizStage } from "./training-quiz-api";

const STAGE_ICONS: Record<QuizStage, typeof Compass> = {
  DISCOVERY: Compass,
  PRACTICE: Target,
  MASTERY: Sparkles,
};

// One system-wide rule set per stage (mechanics are identical across every
// module), keyed to i18n so the copy stays translated and centrally edited.
const STAGE_RULE_KEYS: Record<QuizStage, string[]> = {
  DISCOVERY: [
    "trainingQuiz.levelIntro.rules.discovery.retry",
    "trainingQuiz.levelIntro.rules.discovery.noHint",
    "trainingQuiz.levelIntro.rules.discovery.noReveal",
  ],
  PRACTICE: [
    "trainingQuiz.levelIntro.rules.practice.hint",
    "trainingQuiz.levelIntro.rules.practice.appVisit",
    "trainingQuiz.levelIntro.rules.practice.cooldown",
  ],
  MASTERY: [
    "trainingQuiz.levelIntro.rules.mastery.hint",
    "trainingQuiz.levelIntro.rules.mastery.reveal",
    "trainingQuiz.levelIntro.rules.mastery.cooldown",
  ],
};

export function LevelIntro({
  chapter,
  level,
  onStart,
  onBack,
  starting,
  t,
}: {
  chapter: QuizChapterDetail;
  level: QuizChapterDetail["levels"][number];
  onStart: () => void;
  onBack: () => void;
  starting: boolean;
  t: (key: string) => string;
}) {
  const stageKey = level.stage.toLowerCase();
  const StageIcon = STAGE_ICONS[level.stage];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="celebration-rise-in rounded-[20px] border border-border bg-surface p-6 text-center shadow-card">
        <span
          className="celebration-badge mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full text-white"
          style={{
            background: `linear-gradient(135deg, ${chapter.colorFrom}, ${chapter.colorTo})`,
          }}
        >
          <TrainingQuizIcon name={chapter.icon} className="h-8 w-8" />
        </span>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {chapter.title}
        </p>
        <h1 className="mt-1 flex items-center justify-center gap-2 font-heading text-xl font-bold text-text-primary">
          <StageIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          {t(`trainingQuiz.chapter.stage.${stageKey}`)}
        </h1>

        <div className="mt-5 rounded-card border border-teal-border bg-teal-surface p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-accent-teal-dark">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            {t("trainingQuiz.levelIntro.objectiveLabel")}
          </p>
          <p className="mt-1.5 text-sm text-text-primary">{level.objective}</p>
        </div>

        <div className="mt-4 rounded-card border border-warm-border bg-warm-surface p-4 text-left">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-warm-accent-dark">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {t("trainingQuiz.levelIntro.rulesLabel")}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-sm text-text-primary">
            {STAGE_RULE_KEYS[level.stage].map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warm-accent-dark"
                  aria-hidden="true"
                />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-medium text-text-secondary">
            {t("trainingQuiz.levelIntro.questionsCount").replace(
              "{count}",
              String(level.totalQuestions),
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onBack}
            className="w-full sm:w-auto"
          >
            {t("trainingQuiz.chapter.back")}
          </Button>
          <Button
            onClick={onStart}
            disabled={starting}
            className="w-full sm:w-auto"
          >
            {level.solvedQuestions > 0
              ? t("trainingQuiz.levelIntro.continueCta")
              : t("trainingQuiz.levelIntro.startCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
