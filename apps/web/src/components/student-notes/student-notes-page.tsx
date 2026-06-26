"use client";

import {
  BarChart3,
  CalendarDays,
  X,
  Medal,
  Sparkles,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChildModulePage } from "../family/child-module-page";
import { Card } from "../ui/card";
import { FormSelect } from "../ui/form-controls";
import { STUDENT_NOTES_DEMO_DATA } from "./student-notes-demo-data";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import type {
  StudentEvaluation,
  StudentNotesTerm,
  StudentNotesTermSnapshot,
  StudentNotesSequenceSnapshot,
  StudentNotesView,
  StudentSubjectNotes,
} from "./student-notes.types";

type Props = {
  schoolSlug: string;
  childId: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function formatScore(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value % 1 === 0 ? `${value}` : value.toFixed(2).replace(".", ",");
}

function formatDelta(
  t: TranslateFn,
  studentValue: number | null,
  classValue: number | null,
) {
  if (studentValue === null || classValue === null) {
    return null;
  }
  const delta = studentValue - classValue;
  if (Math.abs(delta) < 0.01) {
    return t("notes.student.hero.levelWithClass");
  }
  const prefix = delta > 0 ? "+" : "";
  return t("notes.student.hero.deltaVsClass").replace(
    "{value}",
    `${prefix}${delta.toFixed(2).replace(".", ",")}`,
  );
}

function formatEvaluationLabel(evaluation: StudentEvaluation) {
  const weightLabel = evaluation.weight ? ` x${evaluation.weight}` : "";
  return `${formatScore(evaluation.score)}/${formatScore(evaluation.maxScore)}${weightLabel}`;
}

function formatPlainEvaluationScore(
  t: TranslateFn,
  evaluation: StudentEvaluation,
) {
  if (evaluation.status === "ABSENT") {
    return { score: t("notes.student.evaluation.shortAbsent"), maxScore: null };
  }
  if (evaluation.status === "EXCUSED") {
    return {
      score: t("notes.student.evaluation.shortExcused"),
      maxScore: null,
    };
  }
  if (evaluation.status === "NOT_GRADED") {
    return {
      score: t("notes.student.evaluation.shortNotGraded"),
      maxScore: null,
    };
  }
  return {
    score: formatScore(evaluation.score),
    maxScore: formatScore(evaluation.maxScore),
  };
}

function buildRadarPoints(snapshot: {
  subjects: StudentSubjectNotes[];
  generalAverage: StudentNotesTermSnapshot["generalAverage"];
}) {
  const eligibleSubjects = snapshot.subjects.filter(
    (subject) =>
      subject.studentAverage !== null && subject.classAverage !== null,
  );
  const centerX = 180;
  const centerY = 180;
  const radius = 120;
  const angleStep = (Math.PI * 2) / Math.max(eligibleSubjects.length, 1);

  const buildSeries = (kind: "studentAverage" | "classAverage") =>
    eligibleSubjects
      .map((subject, index) => {
        const value = subject[kind] ?? 0;
        const normalizedRadius = (value / 20) * radius;
        const angle = -Math.PI / 2 + index * angleStep;
        const x = centerX + Math.cos(angle) * normalizedRadius;
        const y = centerY + Math.sin(angle) * normalizedRadius;
        return `${x},${y}`;
      })
      .join(" ");

  return {
    eligibleSubjects,
    studentSeries: buildSeries("studentAverage"),
    classSeries: buildSeries("classAverage"),
    centerX,
    centerY,
    radius,
  };
}

function PeriodHero({
  generalAverage,
  label,
  councilLabel,
  generatedAtLabel,
  subjects,
}: {
  generalAverage: StudentNotesTermSnapshot["generalAverage"];
  label: string;
  councilLabel: string;
  generatedAtLabel: string;
  subjects: StudentSubjectNotes[];
}) {
  const { t } = useTranslation();
  const bestSubject = [...subjects]
    .filter((subject) => subject.studentAverage !== null)
    .sort((a, b) => (b.studentAverage ?? 0) - (a.studentAverage ?? 0))[0];

  const watchSubject = [...subjects]
    .filter((subject) => subject.studentAverage !== null)
    .sort((a, b) => (a.studentAverage ?? 99) - (b.studentAverage ?? 99))[0];

  const stats = [
    {
      label: t("notes.student.hero.studentAverage"),
      value: formatScore(generalAverage.student),
      hint: formatDelta(t, generalAverage.student, generalAverage.class),
      icon: Medal,
    },
    {
      label: t("notes.student.hero.classAverage"),
      value: formatScore(generalAverage.class),
      hint: t("notes.student.hero.classAverageHint")
        .replace("{min}", formatScore(generalAverage.min))
        .replace("{max}", formatScore(generalAverage.max)),
      icon: TrendingUp,
    },
    {
      label: t("notes.student.hero.strongSubject"),
      value: bestSubject?.subjectLabel ?? "-",
      hint:
        bestSubject?.studentAverage != null
          ? `${formatScore(bestSubject.studentAverage)}/20`
          : t("notes.student.hero.noData"),
      icon: Sparkles,
    },
    {
      label: t("notes.student.hero.watchSubject"),
      value: watchSubject?.subjectLabel ?? "-",
      hint:
        watchSubject?.studentAverage != null
          ? `${formatScore(watchSubject.studentAverage)}/20`
          : t("notes.student.hero.noData"),
      icon: BarChart3,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[20px] border border-primary/15 bg-[linear-gradient(145deg,rgba(10,98,191,0.12),rgba(255,255,255,0.98)_48%,rgba(28,154,138,0.12))] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 h-20 w-40 bg-[radial-gradient(circle_at_bottom_left,rgba(28,154,138,0.20),transparent_70%)]" />
      <div className="relative grid gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-surface/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary min-[360px]:text-[11px] sm:text-xs sm:tracking-[0.18em]">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("notes.student.hero.badge")}
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-text-primary min-[360px]:text-xl sm:text-2xl">
                {label}
              </h3>
              <p className="mt-1 max-w-3xl text-[11px] text-text-secondary min-[360px]:text-xs sm:text-sm">
                {councilLabel}
              </p>
            </div>
          </div>

          <div className="rounded-[18px] border border-white/70 bg-white/82 px-4 py-3 text-left shadow-[0_12px_28px_rgba(10,98,191,0.08)] backdrop-blur sm:text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-secondary min-[360px]:text-[11px] sm:text-xs sm:tracking-[0.16em]">
              {t("notes.student.hero.publishedData")}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-text-primary min-[360px]:text-xs sm:text-sm">
              {generatedAtLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-[18px] border border-white/70 bg-white/78 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur sm:p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary min-[360px]:text-[11px] sm:text-xs sm:tracking-[0.16em]">
                    {stat.label}
                  </span>
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 font-heading text-base font-semibold text-text-primary min-[360px]:text-lg sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] text-text-secondary min-[360px]:text-[11px] sm:text-xs">
                  {stat.hint ?? "-"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ViewTabs({
  view,
  setView,
}: {
  view: StudentNotesView;
  setView: (view: StudentNotesView) => void;
}) {
  const { t } = useTranslation();
  const items: Array<{
    key: StudentNotesView;
    label: string;
    mobileLabel: string;
    description: string;
  }> = [
    {
      key: "evaluations",
      label: t("notes.student.tabs.evaluations.label"),
      mobileLabel: t("notes.student.tabs.evaluations.mobileLabel"),
      description: t("notes.student.tabs.evaluations.description"),
    },
    {
      key: "averages",
      label: t("notes.student.tabs.averages.label"),
      mobileLabel: t("notes.student.tabs.averages.mobileLabel"),
      description: t("notes.student.tabs.averages.description"),
    },
    {
      key: "charts",
      label: t("notes.student.tabs.charts.label"),
      mobileLabel: t("notes.student.tabs.charts.mobileLabel"),
      description: t("notes.student.tabs.charts.description"),
    },
  ];

  return (
    <div
      data-testid="notes-view-tabs"
      className="grid grid-cols-3 gap-2 pb-1 md:flex md:gap-3"
    >
      {items.map((item) => (
        <button
          key={item.key}
          data-testid={`notes-view-tab-${item.key}`}
          type="button"
          onClick={() => setView(item.key)}
          className={`group min-w-0 rounded-[8px] border px-2.5 py-2.5 text-left transition md:flex-1 md:rounded-[12px] md:p-4 ${
            view === item.key
              ? "border-primary bg-[linear-gradient(135deg,rgba(10,98,191,0.14),rgba(255,255,255,0.98))] shadow-[0_12px_24px_rgba(10,98,191,0.10)]"
              : "border-border bg-surface hover:border-primary/30 hover:shadow-card"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={`font-heading text-[13px] font-semibold min-[360px]:text-sm md:text-lg ${
                view === item.key ? "text-primary" : "text-text-primary"
              }`}
            >
              <span className="min-[360px]:hidden">{item.mobileLabel}</span>
              <span className="hidden min-[360px]:inline md:hidden">
                {item.mobileLabel}
              </span>
              <span className="hidden md:inline">{item.label}</span>
            </span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                view === item.key ? "bg-accent-teal" : "bg-border"
              }`}
            />
          </div>
          <p className="mt-2 hidden text-sm text-text-secondary md:block">
            {item.description}
          </p>
        </button>
      ))}
    </div>
  );
}

/** Chip badge "Examen" ou "Formative" si l'éval ne compte pas */
function EvalTypeBadge({
  isFinalExam,
  countsForAverage,
}: {
  isFinalExam: boolean;
  countsForAverage: boolean;
}) {
  const { t } = useTranslation();
  if (isFinalExam) {
    return (
      <span className="ml-1 inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">
        {t("notes.student.evaluation.examBadge")}
      </span>
    );
  }
  if (!countsForAverage) {
    return (
      <span
        className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700"
        title={t("notes.student.evaluation.legendFormative")}
      >
        <FlaskConical className="h-2.5 w-2.5" />
        <span>{t("notes.student.evaluation.formativeBadge")}</span>
      </span>
    );
  }
  return null;
}

function EvaluationChip({
  evaluation,
  onOpen,
}: {
  evaluation: StudentEvaluation;
  onOpen: (evaluation: StudentEvaluation) => void;
}) {
  const { t } = useTranslation();
  const ratio =
    evaluation.score !== null && evaluation.maxScore > 0
      ? evaluation.score / evaluation.maxScore
      : 0;
  const display = formatPlainEvaluationScore(t, evaluation);
  const isSpecialStatus =
    evaluation.status === "ABSENT" ||
    evaluation.status === "EXCUSED" ||
    evaluation.status === "NOT_GRADED";
  const tone = !evaluation.countsForAverage
    ? "text-amber-600"
    : evaluation.status === "ABSENT"
      ? "text-sky-600"
      : evaluation.status === "EXCUSED"
        ? "text-emerald-600"
        : evaluation.status === "NOT_GRADED"
          ? "text-slate-500"
          : ratio >= 0.75
            ? "text-accent-teal-dark"
            : ratio >= 0.5
              ? "text-primary-dark"
              : "text-notification";

  return (
    <button
      type="button"
      onClick={() => onOpen(evaluation)}
      className={
        isSpecialStatus
          ? `inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-5 transition hover:opacity-85 min-[360px]:text-[11px] ${tone} ${
              evaluation.status === "ABSENT"
                ? "border-sky-300 bg-sky-50"
                : evaluation.status === "EXCUSED"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-300 bg-slate-100"
            }`
          : !evaluation.countsForAverage
            ? `inline-flex items-baseline border-b border-dashed border-amber-400 px-0 py-0 text-[11px] font-semibold leading-6 transition hover:opacity-85 min-[360px]:text-[13px] sm:text-[15px] ${tone}`
            : `inline-flex items-baseline border-b border-transparent px-0 py-0 text-[11px] font-semibold leading-6 transition hover:border-current min-[360px]:text-[13px] sm:text-[15px] ${tone}`
      }
      title={formatEvaluationLabel(evaluation)}
    >
      <span>{display.score}</span>
      {display.maxScore && !isSpecialStatus ? (
        <span className="text-[9px] font-medium text-text-secondary/70">
          /{display.maxScore}
        </span>
      ) : null}
    </button>
  );
}

function EvaluationDetailModal({
  open,
  subject,
  evaluation,
  onClose,
}: {
  open: boolean;
  subject: StudentSubjectNotes | null;
  evaluation: StudentEvaluation | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !subject || !evaluation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("notes.student.evaluation.closeAria")}
        className="absolute inset-0 bg-text-primary/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-[22px] border border-border bg-surface p-5 shadow-[0_22px_60px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {t("notes.student.evaluation.detailTitle")}
            </p>
            <h3 className="mt-1 font-heading text-xl font-semibold text-text-primary">
              {subject.subjectLabel}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-text-secondary">{evaluation.label}</p>
              <EvalTypeBadge
                isFinalExam={evaluation.isFinalExam}
                countsForAverage={evaluation.countsForAverage}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-2 text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!evaluation.countsForAverage ? (
          <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <strong>
              {t("notes.student.evaluation.formativeWarningTitle")}
            </strong>{" "}
            — {t("notes.student.evaluation.formativeWarningBody")}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.evaluation.score")}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-primary">
              {formatPlainEvaluationScore(t, evaluation).score}
              {formatPlainEvaluationScore(t, evaluation).maxScore ? (
                <span className="ml-1 text-base font-medium text-text-secondary">
                  /{formatPlainEvaluationScore(t, evaluation).maxScore}
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.evaluation.status")}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-text-primary">
              {evaluation.status === "ABSENT"
                ? t("notes.student.evaluation.statusAbsent")
                : evaluation.status === "EXCUSED"
                  ? t("notes.student.evaluation.statusExcused")
                  : evaluation.status === "NOT_GRADED"
                    ? t("notes.student.evaluation.statusNotGraded")
                    : t("notes.student.evaluation.statusEntered")}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.evaluation.date")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {evaluation.recordedAt}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.evaluation.coefficient")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {evaluation.weight ? formatScore(evaluation.weight) : "1"}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3 sm:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.evaluation.context")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {t("notes.student.evaluation.contextValue")
                .replace("{classAverage}", formatScore(subject.classAverage))
                .replace("{classMin}", formatScore(subject.classMin))
                .replace("{classMax}", formatScore(subject.classMax))}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-card border border-border bg-background px-4 py-3 text-sm text-text-secondary">
          <p>
            {t("notes.student.evaluation.subjectAverage")}{" "}
            <span className="font-semibold text-text-primary">
              {formatScore(subject.studentAverage)}
            </span>
          </p>
          <p className="mt-1">
            {t("notes.student.evaluation.positioning")}{" "}
            <span className="font-semibold text-text-primary">
              {formatDelta(t, subject.studentAverage, subject.classAverage) ??
                t("notes.student.evaluation.noComparison")}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SubjectAverageDetailModal({
  open,
  subject,
  onClose,
}: {
  open: boolean;
  subject: StudentSubjectNotes | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !subject) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("notes.student.average.closeAria")}
        className="absolute inset-0 bg-text-primary/45 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-[22px] border border-border bg-surface p-5 shadow-[0_22px_60px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {t("notes.student.average.detailTitle")}
            </p>
            <h3 className="mt-1 font-heading text-xl font-semibold text-text-primary">
              {subject.subjectLabel}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {subject.teachers.join(" - ") ||
                t("notes.student.average.defaultSubject")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border p-2 text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.average.student")}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-primary">
              {formatScore(subject.studentAverage)}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.average.coefficient")}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold text-text-primary">
              {formatScore(subject.coefficient)}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.average.class")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {formatScore(subject.classAverage)}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-secondary">
              {t("notes.student.average.amplitude")}
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {t("notes.student.average.amplitudeValue")
                .replace("{min}", formatScore(subject.classMin))
                .replace("{max}", formatScore(subject.classMax))}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 rounded-card border border-border bg-background px-4 py-3 text-sm text-text-secondary">
          <p>
            {t("notes.student.average.positioning")}{" "}
            <span className="font-semibold text-text-primary">
              {formatDelta(t, subject.studentAverage, subject.classAverage) ??
                t("notes.student.average.noComparison")}
            </span>
          </p>
          <p>
            {t("notes.student.average.evaluationsCount")}{" "}
            <span className="font-semibold text-text-primary">
              {subject.evaluations.length}
            </span>
          </p>
          {subject.appreciation ? (
            <p>
              {t("notes.student.average.appreciation")}{" "}
              <span className="font-semibold text-text-primary">
                {subject.appreciation}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EvaluationsTable({ subjects }: { subjects: StudentSubjectNotes[] }) {
  const { t } = useTranslation();
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<StudentEvaluation | null>(null);
  const [selectedSubject, setSelectedSubject] =
    useState<StudentSubjectNotes | null>(null);
  const [selectedAverageSubject, setSelectedAverageSubject] =
    useState<StudentSubjectNotes | null>(null);

  if (subjects.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-background p-8 text-sm text-text-secondary">
        {t("notes.student.table.empty")}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
        <div className="hidden bg-[linear-gradient(90deg,#0A62BF,#1182D8)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white lg:grid lg:grid-cols-[190px_52px_90px_minmax(0,1fr)]">
          <span>{t("notes.student.table.subjects")}</span>
          <span>{t("notes.student.table.coefficient")}</span>
          <span>{t("notes.student.table.averages")}</span>
          <span>{t("notes.student.table.evaluations")}</span>
        </div>

        <div className="divide-y divide-border">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="px-4 py-3"
              data-testid={`evaluations-subject-row-${subject.id}`}
            >
              <div className="grid gap-3 lg:hidden">
                <div
                  data-testid={`evaluations-subject-header-${subject.id}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-heading text-[13px] font-semibold uppercase text-text-primary min-[360px]:text-sm sm:text-base">
                      {subject.subjectLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setSelectedAverageSubject(subject)}
                      className="text-[11px] font-semibold text-primary/80 transition hover:text-primary min-[360px]:text-xs sm:text-sm"
                      title={t("notes.student.table.averageDetailAria").replace(
                        "{subject}",
                        subject.subjectLabel,
                      )}
                    >
                      {formatScore(subject.studentAverage)}
                    </button>
                  </div>
                  <div className="shrink-0 text-right text-[11px] font-semibold text-text-primary min-[360px]:text-xs sm:text-sm">
                    <span className="mr-1 text-[8px] uppercase tracking-[0.08em] text-text-secondary min-[360px]:text-[9px] min-[360px]:tracking-[0.1em] sm:text-[10px] sm:tracking-[0.12em]">
                      {t("notes.student.table.coefficient")}
                    </span>
                    {subject.coefficient}
                  </div>
                </div>

                <div className="min-w-0">
                  <div
                    data-testid={`evaluations-notes-grid-${subject.id}`}
                    className="grid w-full grid-cols-4 gap-x-2 gap-y-2 text-[11px] leading-6 min-[360px]:grid-cols-5 min-[360px]:text-[13px] sm:grid-cols-[repeat(auto-fit,minmax(68px,max-content))] sm:gap-x-3 sm:text-[15px]"
                  >
                    {subject.evaluations.map((evaluation) => (
                      <span
                        key={evaluation.id}
                        className="inline-flex min-h-7 min-w-0 items-baseline justify-center whitespace-nowrap"
                      >
                        <EvaluationChip
                          evaluation={evaluation}
                          onOpen={(entry) => {
                            setSelectedSubject(subject);
                            setSelectedEvaluation(entry);
                          }}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hidden lg:grid lg:grid-cols-[190px_52px_90px_minmax(0,1fr)] lg:items-center">
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold uppercase text-text-primary">
                    {subject.subjectLabel}
                  </p>
                  {subject.teachers.length > 0 ? (
                    <p className="mt-1 text-[11px] text-text-secondary">
                      {subject.teachers.join(" - ")}
                    </p>
                  ) : null}
                </div>

                <div className="text-sm font-semibold text-text-primary">
                  {subject.coefficient}
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setSelectedAverageSubject(subject)}
                    className="text-sm font-semibold text-primary/80 transition hover:text-primary"
                    title={t("notes.student.table.averageDetailAria").replace(
                      "{subject}",
                      subject.subjectLabel,
                    )}
                  >
                    {formatScore(subject.studentAverage)}
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex max-w-full flex-wrap gap-x-4 gap-y-1 text-[15px] leading-7">
                    {subject.evaluations.map((evaluation) => (
                      <span
                        key={evaluation.id}
                        className="inline-flex items-center gap-1"
                      >
                        <EvaluationChip
                          evaluation={evaluation}
                          onOpen={(entry) => {
                            setSelectedSubject(subject);
                            setSelectedEvaluation(entry);
                          }}
                        />
                        <EvalTypeBadge
                          isFinalExam={evaluation.isFinalExam}
                          countsForAverage={evaluation.countsForAverage}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-2 bg-[linear-gradient(90deg,rgba(10,98,191,0.06),rgba(28,154,138,0.08))] px-4 py-3 lg:grid-cols-[190px_52px_90px_minmax(0,1fr)] lg:items-center">
            <div>
              <p className="font-heading text-[13px] font-semibold uppercase text-primary min-[360px]:text-sm sm:text-base">
                {t("notes.student.table.generalAverage")}
              </p>
            </div>
            <div className="text-sm text-text-secondary">-</div>
            <div className="text-[11px] font-semibold text-primary/80 min-[360px]:text-xs sm:text-sm">
              {formatScore(
                subjects.reduce(
                  (sum, subject) => sum + (subject.studentAverage ?? 0),
                  0,
                ) /
                  Math.max(
                    subjects.filter((s) => s.studentAverage !== null).length,
                    1,
                  ),
              )}
            </div>
            <div className="text-[10px] text-text-secondary min-[360px]:text-[11px] sm:text-xs">
              {t("notes.student.table.publishedSummary")}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-secondary">
        <span>
          <span className="font-semibold text-sky-600">
            {t("notes.student.evaluation.shortAbsent")}
          </span>{" "}
          {t("notes.student.evaluation.legendAbsent")}
        </span>
        <span>
          <span className="font-semibold text-emerald-600">
            {t("notes.student.evaluation.shortExcused")}
          </span>{" "}
          {t("notes.student.evaluation.legendExcused")}
        </span>
        <span>
          <span className="font-semibold text-slate-500">
            {t("notes.student.evaluation.shortNotGraded")}
          </span>{" "}
          {t("notes.student.evaluation.legendNotGraded")}
        </span>
        <span>
          <span className="font-semibold text-amber-600">
            {t("notes.student.evaluation.legendFormativeLabel")}
          </span>{" "}
          {t("notes.student.evaluation.legendFormative")}
        </span>
      </div>

      <EvaluationDetailModal
        open={selectedEvaluation !== null}
        subject={selectedSubject}
        evaluation={selectedEvaluation}
        onClose={() => {
          setSelectedEvaluation(null);
          setSelectedSubject(null);
        }}
      />
      <SubjectAverageDetailModal
        open={selectedAverageSubject !== null}
        subject={selectedAverageSubject}
        onClose={() => setSelectedAverageSubject(null)}
      />
    </>
  );
}

function AveragesTable({
  generalAverage,
  subjects,
}: {
  generalAverage: StudentNotesTermSnapshot["generalAverage"];
  subjects: StudentSubjectNotes[];
}) {
  const { t } = useTranslation();
  if (subjects.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-background p-8 text-sm text-text-secondary">
        {t("notes.student.averagesTable.empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_16px_34px_rgba(15,23,42,0.05)]">
      <div className="hidden grid-cols-[220px_60px_80px_80px_70px_70px_minmax(260px,1fr)] gap-0 bg-[linear-gradient(90deg,#0A62BF,#1182D8)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white lg:grid">
        <span className="text-left">
          {t("notes.student.averagesTable.discipline")}
        </span>
        <span className="text-center">
          {t("notes.student.averagesTable.coefficient")}
        </span>
        <span className="text-center">
          {t("notes.student.averagesTable.student")}
        </span>
        <span className="text-center">
          {t("notes.student.averagesTable.class")}
        </span>
        <span className="text-center">
          {t("notes.student.averagesTable.min")}
        </span>
        <span className="text-center">
          {t("notes.student.averagesTable.max")}
        </span>
        <span className="text-left">
          {t("notes.student.averagesTable.appreciation")}
        </span>
      </div>

      <div className="divide-y divide-border">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="px-4 py-3"
            data-testid={`averages-subject-row-${subject.id}`}
          >
            <div className="grid gap-3 lg:grid-cols-[220px_60px_80px_80px_70px_70px_minmax(260px,1fr)] lg:items-center lg:gap-0">
              <div className="grid gap-3 lg:block">
                <div className="flex items-baseline justify-between gap-3 lg:block">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <p className="font-heading text-base font-semibold uppercase text-text-primary">
                      {subject.subjectLabel}
                    </p>
                    <span className="font-heading text-lg font-semibold text-primary lg:hidden">
                      {formatScore(subject.studentAverage)}
                    </span>
                    <span className="text-[11px] text-text-secondary lg:hidden">
                      {t(
                        "notes.student.averagesTable.coefficientPrefix",
                      ).replace("{coefficient}", String(subject.coefficient))}
                    </span>
                  </div>
                  <p className="mt-1 hidden text-[11px] text-text-secondary lg:block">
                    {subject.teachers.join(" - ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary lg:hidden">
                  <span>
                    {t("notes.student.averagesTable.classPrefix")}{" "}
                    <span className="font-medium text-text-primary">
                      {formatScore(subject.classAverage)}
                    </span>
                  </span>
                  <span>
                    {t("notes.student.averagesTable.minPrefix")}{" "}
                    <span className="font-medium text-text-primary">
                      {formatScore(subject.classMin)}
                    </span>
                  </span>
                  <span>
                    {t("notes.student.averagesTable.maxPrefix")}{" "}
                    <span className="font-medium text-text-primary">
                      {formatScore(subject.classMax)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="hidden text-center text-sm font-semibold text-text-primary lg:block">
                {subject.coefficient}
              </div>
              <div className="hidden text-center font-heading text-lg font-semibold text-primary lg:block">
                {formatScore(subject.studentAverage)}
              </div>
              <div className="hidden lg:contents">
                <div className="text-center text-sm text-text-primary">
                  {formatScore(subject.classAverage)}
                </div>
                <div className="text-center text-sm text-text-primary">
                  {formatScore(subject.classMin)}
                </div>
                <div className="text-center text-sm text-text-primary">
                  {formatScore(subject.classMax)}
                </div>
              </div>
              <div className="grid gap-1.5 self-stretch">
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0A62BF,#1C9A8A)]"
                    style={{
                      width: `${((subject.studentAverage ?? 0) / 20) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-sm leading-5 text-text-secondary">
                  {subject.appreciation ?? "-"}
                </p>
              </div>
            </div>
          </div>
        ))}

        <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(10,98,191,0.06),rgba(28,154,138,0.08))] px-4 py-3 lg:grid-cols-[220px_60px_80px_80px_70px_70px_minmax(260px,1fr)] lg:items-center lg:gap-0">
          <div className="grid gap-2 lg:block">
            <div className="flex items-baseline justify-between gap-3 lg:block">
              <p className="font-heading text-base font-semibold uppercase text-primary">
                {t("notes.student.averagesTable.generalAverage")}
              </p>
              <span className="font-heading text-lg font-semibold text-primary lg:hidden">
                {formatScore(generalAverage.student)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary lg:hidden">
              <span>
                {t("notes.student.averagesTable.classPrefix")}{" "}
                <span className="font-medium text-text-primary">
                  {formatScore(generalAverage.class)}
                </span>
              </span>
              <span>
                {t("notes.student.averagesTable.minPrefix")}{" "}
                <span className="font-medium text-text-primary">
                  {formatScore(generalAverage.min)}
                </span>
              </span>
              <span>
                {t("notes.student.averagesTable.maxPrefix")}{" "}
                <span className="font-medium text-text-primary">
                  {formatScore(generalAverage.max)}
                </span>
              </span>
            </div>
          </div>
          <div className="hidden text-center lg:block">-</div>
          <div className="hidden text-center font-heading text-xl font-semibold text-primary lg:block">
            {formatScore(generalAverage.student)}
          </div>
          <div className="hidden text-center lg:block">
            {formatScore(generalAverage.class)}
          </div>
          <div className="hidden text-center lg:block">
            {formatScore(generalAverage.min)}
          </div>
          <div className="hidden text-center lg:block">
            {formatScore(generalAverage.max)}
          </div>
          <div className="text-sm text-text-secondary">
            {t("notes.student.averagesTable.globalPositioning")}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartsPanel({
  subjects,
  generalAverage,
}: {
  subjects: StudentSubjectNotes[];
  generalAverage: StudentNotesTermSnapshot["generalAverage"];
}) {
  const { t } = useTranslation();
  const radar = useMemo(
    () => buildRadarPoints({ subjects, generalAverage }),
    [subjects, generalAverage],
  );

  if (subjects.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-background p-8 text-sm text-text-secondary">
        {t("notes.student.charts.empty")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.95fr]">
      <Card
        title={t("notes.student.charts.comparisonTitle")}
        subtitle={t("notes.student.charts.comparisonSubtitle")}
        className="overflow-hidden border-primary/10 bg-[linear-gradient(180deg,rgba(10,98,191,0.05),#FFFFFF_20%,rgba(28,154,138,0.03))]"
      >
        <div className="grid gap-5">
          {subjects.map((subject) => (
            <div key={subject.id} className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">
                    {subject.subjectLabel}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("notes.student.charts.studentVsClass")
                      .replace(
                        "{studentAverage}",
                        formatScore(subject.studentAverage),
                      )
                      .replace(
                        "{classAverage}",
                        formatScore(subject.classAverage),
                      )}
                  </p>
                </div>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-text-secondary">
                  {t("notes.student.charts.classRange")
                    .replace("{min}", formatScore(subject.classMin))
                    .replace("{max}", formatScore(subject.classMax))}
                </span>
              </div>

              <div className="relative h-4 rounded-full bg-slate-100">
                <div
                  className="absolute top-0 h-4 rounded-full bg-[linear-gradient(90deg,rgba(10,98,191,0.24),rgba(28,154,138,0.30))]"
                  style={{
                    left: `${((subject.classMin ?? 0) / 20) * 100}%`,
                    width: `${(((subject.classMax ?? 0) - (subject.classMin ?? 0)) / 20) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-[3px] border-primary bg-white shadow"
                  style={{
                    left: `calc(${((subject.studentAverage ?? 0) / 20) * 100}% - 10px)`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-600 shadow"
                  style={{
                    left: `calc(${((subject.classAverage ?? 0) / 20) * 100}% - 8px)`,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-primary bg-white" />
              {t("notes.student.charts.legendStudentAverage")}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-600" />
              {t("notes.student.charts.legendClassAverage")}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-8 rounded-full bg-[linear-gradient(90deg,rgba(10,98,191,0.24),rgba(28,154,138,0.30))]" />
              {t("notes.student.charts.legendClassRange")}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={t("notes.student.charts.radarTitle")}
        subtitle={t("notes.student.charts.radarSubtitle")}
        className="border-primary/10 bg-[linear-gradient(180deg,rgba(28,154,138,0.06),#FFFFFF_18%,rgba(10,98,191,0.03))]"
      >
        <div className="grid gap-4">
          <div className="flex items-center justify-center overflow-x-auto">
            <svg
              viewBox="0 0 360 360"
              className="h-[260px] w-[260px] sm:h-[320px] sm:w-[320px]"
            >
              {[35, 60, 85, 110, 135].map((radius) => (
                <circle
                  key={radius}
                  cx={radar.centerX}
                  cy={radar.centerY}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-border"
                />
              ))}
              {radar.eligibleSubjects.map((subject, index) => {
                const angle =
                  -Math.PI / 2 +
                  index *
                    ((Math.PI * 2) /
                      Math.max(radar.eligibleSubjects.length, 1));
                const x = radar.centerX + Math.cos(angle) * radar.radius;
                const y = radar.centerY + Math.sin(angle) * radar.radius;
                const labelX =
                  radar.centerX + Math.cos(angle) * (radar.radius + 28);
                const labelY =
                  radar.centerY + Math.sin(angle) * (radar.radius + 28);

                return (
                  <g key={subject.id}>
                    <line
                      x1={radar.centerX}
                      y1={radar.centerY}
                      x2={x}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      className="fill-text-secondary text-[10px] font-semibold"
                    >
                      {subject.subjectLabel}
                    </text>
                  </g>
                );
              })}
              <polygon
                points={radar.classSeries}
                fill="rgba(71,85,105,0.12)"
                stroke="#475569"
                strokeWidth="2.2"
              />
              <polygon
                points={radar.studentSeries}
                fill="rgba(10,98,191,0.24)"
                stroke="#0A62BF"
                strokeWidth="2.8"
              />
              <circle
                cx={radar.centerX}
                cy={radar.centerY}
                r="4"
                fill="#0A62BF"
              />
            </svg>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-background p-3 text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">
                {t("notes.student.charts.radarReadingTitle")}
              </p>
              <p className="mt-1">
                {t("notes.student.charts.radarReadingText")}
              </p>
            </div>
            <div className="rounded-card border border-border bg-background p-3 text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">
                {t("notes.student.charts.comparisonLegendTitle")}
              </p>
              <p className="mt-1">
                {t("notes.student.charts.comparisonLegendText")}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Onglets Séquence 1 / Séquence 2 à l'intérieur d'un trimestre */
function SequenceTabs({
  sequences,
  activeSequence,
  onSelect,
}: {
  sequences: StudentNotesSequenceSnapshot[];
  activeSequence: string;
  onSelect: (seq: string) => void;
}) {
  const { t } = useTranslation();
  if (sequences.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sequences.map((seq) => (
        <button
          key={seq.sequence}
          type="button"
          onClick={() => onSelect(seq.sequence)}
          className={`rounded-[10px] border px-4 py-2 text-sm font-semibold transition ${
            activeSequence === seq.sequence
              ? "border-accent-teal bg-[linear-gradient(90deg,#1C9A8A,#239e91)] text-white shadow-[0_8px_18px_rgba(28,154,138,0.28)]"
              : "border-border bg-surface text-text-secondary hover:border-accent-teal/40 hover:text-accent-teal-dark"
          }`}
        >
          {seq.sequenceLabel}
          {!seq.isFirstSeq ? (
            <span className="ml-1.5 inline-block rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
              {t("notes.student.sequence.examFinalBadge")}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Vue séquence : affiche les évals + résumé */
function SequenceView({
  snapshot,
}: {
  snapshot: StudentNotesSequenceSnapshot;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<StudentNotesView>("evaluations");

  return (
    <div className="grid gap-5">
      {!snapshot.isFirstSeq ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">
              {t("notes.student.sequence.validationTitle")}
            </p>
            <p className="mt-0.5">
              {t("notes.student.sequence.validationText")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="order-1">
        <ViewTabs view={view} setView={setView} />
      </div>
      <div className="order-2">
        {view === "evaluations" ? (
          <EvaluationsTable subjects={snapshot.subjects} />
        ) : null}
        {view === "averages" ? (
          <AveragesTable
            generalAverage={snapshot.generalAverage}
            subjects={snapshot.subjects}
          />
        ) : null}
        {view === "charts" ? (
          <ChartsPanel
            subjects={snapshot.subjects}
            generalAverage={snapshot.generalAverage}
          />
        ) : null}
      </div>
      <div className="order-3">
        <PeriodHero
          generalAverage={snapshot.generalAverage}
          label={snapshot.sequenceLabel}
          councilLabel=""
          generatedAtLabel=""
          subjects={snapshot.subjects}
        />
      </div>
    </div>
  );
}

/** Vue trimestre : résumé général + sous-onglets séquence */
function TermView({ snapshot }: { snapshot: StudentNotesTermSnapshot }) {
  const { t } = useTranslation();
  const [activeSequence, setActiveSequence] = useState<string>(
    snapshot.sequences[0]?.sequence ?? "",
  );
  const [termView, setTermView] = useState<StudentNotesView>("evaluations");

  const activeSeqSnapshot =
    snapshot.sequences.find((s) => s.sequence === activeSequence) ??
    snapshot.sequences[0] ??
    null;

  const hasSequences = snapshot.sequences.length > 0;

  return (
    <div className="grid gap-5">
      {hasSequences ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-heading text-base font-semibold text-text-primary">
              {t("notes.student.sequence.detailBySequence")}
            </h4>
            <SequenceTabs
              sequences={snapshot.sequences}
              activeSequence={activeSequence}
              onSelect={setActiveSequence}
            />
          </div>

          {activeSeqSnapshot ? (
            <SequenceView snapshot={activeSeqSnapshot} />
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="order-1">
            <ViewTabs view={termView} setView={setTermView} />
          </div>
          <div className="order-2">
            {termView === "evaluations" ? (
              <EvaluationsTable subjects={snapshot.subjects} />
            ) : null}
            {termView === "averages" ? (
              <AveragesTable
                generalAverage={snapshot.generalAverage}
                subjects={snapshot.subjects}
              />
            ) : null}
            {termView === "charts" ? (
              <ChartsPanel
                subjects={snapshot.subjects}
                generalAverage={snapshot.generalAverage}
              />
            ) : null}
          </div>
        </div>
      )}

      <PeriodHero
        generalAverage={snapshot.generalAverage}
        label={snapshot.label}
        councilLabel={snapshot.councilLabel}
        generatedAtLabel={snapshot.generatedAtLabel}
        subjects={snapshot.subjects}
      />
    </div>
  );
}

export function StudentNotesPage({ schoolSlug, childId }: Props) {
  const { t } = useTranslation();
  const [selectedTerm, setSelectedTerm] = useState<StudentNotesTerm>("TERM_1");
  const [snapshots, setSnapshots] = useState(STUDENT_NOTES_DEMO_DATA);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNotes() {
      try {
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/students/${childId}/notes`,
          { credentials: "include" },
        );

        if (!response.ok) {
          throw new Error("notes-api-unavailable");
        }

        const payload = (await response.json()) as StudentNotesTermSnapshot[];
        if (!active || !Array.isArray(payload) || payload.length === 0) {
          return;
        }

        setSnapshots(payload);
        setWarning(null);
      } catch {
        if (!active) {
          return;
        }
        setSnapshots(STUDENT_NOTES_DEMO_DATA);
        setWarning(t("notes.student.page.demoWarning"));
      }
    }

    void loadNotes();
    return () => {
      active = false;
    };
  }, [schoolSlug, childId, t]);

  const snapshot =
    snapshots.find((entry) => entry.term === selectedTerm) ?? snapshots[0];

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="notes"
      title={t("notes.student.page.title")}
      subtitle={t("notes.student.page.subtitle")}
      summary={t("notes.student.page.summary")}
      bullets={[
        t("notes.student.page.bullet1"),
        t("notes.student.page.bullet2"),
        t("notes.student.page.bullet3"),
      ]}
      hidePrimaryTabs
      hideSecondaryTabs
      hideModuleHeader
      content={({ child }) => (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-heading text-xl font-semibold text-text-primary">
                  {t("notes.student.page.title")}
                </h1>
                <p className="mt-1 hidden text-sm text-text-secondary min-[360px]:block">
                  {t("notes.student.page.subtitleWithChild").replace(
                    "{childName}",
                    child ? `${child.lastName} ${child.firstName}` : "",
                  )}
                </p>
              </div>

              <div className="shrink-0 min-[360px]:hidden">
                <label className="block">
                  <span className="sr-only">
                    {t("notes.student.page.chooseTerm")}
                  </span>
                  <FormSelect
                    data-testid="notes-term-select-mobile"
                    aria-label={t("notes.student.page.chooseTerm")}
                    value={selectedTerm}
                    onChange={(event) =>
                      setSelectedTerm(event.target.value as StudentNotesTerm)
                    }
                    className="min-w-[132px] bg-surface px-3 py-2 text-xs font-semibold"
                  >
                    {snapshots.map((term) => (
                      <option key={term.term} value={term.term}>
                        {term.label}
                      </option>
                    ))}
                  </FormSelect>
                </label>
              </div>
            </div>

            <p className="w-full text-sm text-text-secondary min-[360px]:hidden">
              {child
                ? t("notes.student.page.mobileSubtitle").replace(
                    "{childName}",
                    `${child.firstName} ${child.lastName}`,
                  )
                : t("notes.student.page.mobileSubtitleNoChild")}
            </p>
          </div>

          {warning ? (
            <div className="rounded-[18px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-text-secondary">
              {warning}
            </div>
          ) : null}

          <div className="hidden min-[360px]:flex min-[360px]:flex-wrap min-[360px]:gap-2">
            {snapshots.map((term) => (
              <button
                key={term.term}
                type="button"
                onClick={() => setSelectedTerm(term.term)}
                className={`shrink-0 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition ${
                  selectedTerm === term.term
                    ? "border-primary bg-[linear-gradient(90deg,#0A62BF,#1182D8)] text-white shadow-[0_12px_24px_rgba(10,98,191,0.22)]"
                    : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-primary"
                }`}
              >
                {term.label}
              </button>
            ))}
          </div>

          {snapshot ? <TermView snapshot={snapshot} /> : null}
        </div>
      )}
    />
  );
}
