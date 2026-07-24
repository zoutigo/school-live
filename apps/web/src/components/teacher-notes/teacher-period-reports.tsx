"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Medal,
  MessageCircle,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { FormTextarea } from "../ui/form-controls";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
} from "../student-notes/student-notes.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const ALL_TERMS: StudentNotesTerm[] = ["TERM_1", "TERM_2", "TERM_3"];

export type CouncilDrafts = Record<
  string,
  { generalAppreciation: string; subjects: Record<string, string> }
>;

type Student = { id: string; firstName: string; lastName: string };

type Props = {
  schoolSlug: string;
  className: string;
  students: Student[];
  term: StudentNotesTerm;
  onTermChange: (term: StudentNotesTerm) => void;
  drafts: CouncilDrafts;
  onSaveAppreciation: (
    studentId: string,
    patch: {
      generalAppreciation?: string;
      subject?: { subjectId: string; value: string };
    },
  ) => Promise<void>;
  isSubmitting: boolean;
};

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

function termLabel(t: TranslateFn, term: StudentNotesTerm) {
  if (term === "TERM_1") return t("notes.teacher.terms.term1");
  if (term === "TERM_2") return t("notes.teacher.terms.term2");
  return t("notes.teacher.terms.term3");
}

function ReportHero({ snapshot }: { snapshot: StudentNotesTermSnapshot }) {
  const { t } = useTranslation();
  const { generalAverage, subjects } = snapshot;

  const bestSubject = [...subjects]
    .filter((subject) => subject.studentAverage !== null)
    .sort((a, b) => (b.studentAverage ?? 0) - (a.studentAverage ?? 0))[0];
  const watchSubject = [...subjects]
    .filter((subject) => subject.studentAverage !== null)
    .sort((a, b) => (a.studentAverage ?? 99) - (b.studentAverage ?? 99))[0];

  const stats = [
    {
      id: "student-avg",
      label: t("notes.student.hero.studentAverage"),
      value: formatScore(generalAverage.student),
      hint: formatDelta(t, generalAverage.student, generalAverage.class),
      icon: Medal,
    },
    {
      id: "class-avg",
      label: t("notes.student.hero.classAverage"),
      value: formatScore(generalAverage.class),
      hint: t("notes.student.hero.classAverageHint")
        .replace("{min}", formatScore(generalAverage.min))
        .replace("{max}", formatScore(generalAverage.max)),
      icon: TrendingUp,
    },
    {
      id: "best-subject",
      label: t("notes.student.hero.strongSubject"),
      value: bestSubject?.subjectLabel ?? "-",
      hint:
        bestSubject?.studentAverage != null
          ? `${formatScore(bestSubject.studentAverage)}/20`
          : t("notes.student.hero.noData"),
      icon: Sparkles,
    },
    {
      id: "watch-subject",
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
    <section
      data-testid="teacher-reports-hero"
      className="relative mt-3 overflow-hidden rounded-[20px] border border-primary/15 bg-[linear-gradient(145deg,rgba(10,98,191,0.12),rgba(255,255,255,0.98)_48%,rgba(28,154,138,0.12))] p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-5"
    >
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative grid gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-surface/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            {t("notes.student.hero.badge")}
          </div>
          <p className="font-heading text-sm font-bold text-warm-accent-dark sm:text-base">
            {snapshot.label}
          </p>
        </div>
        <p className="text-[11px] text-text-secondary sm:text-xs">
          {snapshot.councilLabel}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.id}
                data-testid={`teacher-reports-stat-${stat.id}`}
                className="rounded-[16px] border border-white/70 bg-white/78 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-text-secondary sm:text-[10px]">
                    {stat.label}
                  </span>
                  <div className="shrink-0 rounded-full bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mt-2 truncate font-heading text-base font-semibold text-text-primary">
                  {stat.value}
                </p>
                <p className="mt-1 line-clamp-2 text-[10px] text-text-secondary">
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

function AppreciationEditor(props: {
  value: string;
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
  testIdPrefix: string;
}) {
  const { t } = useTranslation();

  if (props.editing) {
    return (
      <div
        data-testid={`${props.testIdPrefix}-editor`}
        className="rounded-[14px] border border-primary bg-surface p-3"
      >
        <FormTextarea
          data-testid={`${props.testIdPrefix}-input`}
          value={props.draft}
          onChange={(event) => props.onDraftChange(event.target.value)}
          className="min-h-[80px]"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            data-testid={`${props.testIdPrefix}-cancel`}
            onClick={props.onCancel}
            className="rounded-[8px] border border-border px-3 py-1.5 text-sm font-semibold text-text-secondary"
          >
            {t("notes.teacher.reports.cancel")}
          </button>
          <button
            type="button"
            data-testid={`${props.testIdPrefix}-save`}
            onClick={() => void props.onSave()}
            disabled={props.isSaving}
            className="rounded-[8px] bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("notes.teacher.reports.saveField")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={`${props.testIdPrefix}-display`}
      onClick={props.onStartEdit}
      className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-border bg-background px-4 py-3 text-left"
    >
      <span className="line-clamp-2 text-sm text-text-primary">
        {props.value || t("notes.teacher.reports.noAppreciation")}
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <MessageCircle className="h-5 w-5" />
      </span>
    </button>
  );
}

export function TeacherPeriodReports({
  schoolSlug,
  className,
  students,
  onTermChange,
  drafts,
  onSaveAppreciation,
  isSubmitting,
}: Props) {
  const { t } = useTranslation();
  const sortedStudents = useMemo(
    () =>
      [...students].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      ),
    [students],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<{
    studentId: string;
    term: StudentNotesTerm;
  } | null>(null);
  const [studentNotes, setStudentNotes] = useState<
    Record<string, StudentNotesTermSnapshot[]>
  >({});
  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [generalDraft, setGeneralDraft] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState("");

  useEffect(() => {
    if (!expandedStudentId || studentNotes[expandedStudentId]) {
      return;
    }
    let active = true;
    setLoadingStudentId(expandedStudentId);
    void fetch(
      `${API_URL}/schools/${schoolSlug}/students/${expandedStudentId}/notes`,
      { credentials: "include" },
    )
      .then((response) => (response.ok ? response.json() : []))
      .then((payload: StudentNotesTermSnapshot[]) => {
        if (!active) return;
        setStudentNotes((prev) => ({
          ...prev,
          [expandedStudentId]: Array.isArray(payload) ? payload : [],
        }));
      })
      .catch(() => {
        if (!active) return;
        setStudentNotes((prev) => ({ ...prev, [expandedStudentId]: [] }));
      })
      .finally(() => {
        if (active) setLoadingStudentId(null);
      });
    return () => {
      active = false;
    };
  }, [expandedStudentId, schoolSlug, studentNotes]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedStudents;
    return sortedStudents.filter((student) =>
      `${student.lastName} ${student.firstName}`.toLowerCase().includes(query),
    );
  }, [sortedStudents, searchQuery]);

  const selectedStudent = useMemo(
    () => sortedStudents.find((student) => student.id === detail?.studentId),
    [sortedStudents, detail],
  );

  function toggleStudent(studentId: string) {
    setExpandedStudentId((current) =>
      current === studentId ? null : studentId,
    );
  }

  function openBulletin(studentId: string, nextTerm: StudentNotesTerm) {
    setDetail({ studentId, term: nextTerm });
    onTermChange(nextTerm);
    setEditingGeneral(false);
    setEditingSubjectId(null);
  }

  function backToList() {
    setDetail(null);
    setEditingGeneral(false);
    setEditingSubjectId(null);
  }

  function startEditGeneral() {
    setGeneralDraft(drafts[detail?.studentId ?? ""]?.generalAppreciation ?? "");
    setEditingGeneral(true);
  }

  async function saveGeneral() {
    if (!detail) return;
    await onSaveAppreciation(detail.studentId, {
      generalAppreciation: generalDraft,
    });
    setEditingGeneral(false);
  }

  function startEditSubject(subjectId: string) {
    setSubjectDraft(
      drafts[detail?.studentId ?? ""]?.subjects?.[subjectId] ?? "",
    );
    setEditingSubjectId(subjectId);
  }

  async function saveSubject(subjectId: string) {
    if (!detail) return;
    await onSaveAppreciation(detail.studentId, {
      subject: { subjectId, value: subjectDraft },
    });
    setEditingSubjectId(null);
  }

  if (students.length === 0) {
    return (
      <div
        data-testid="teacher-reports-empty"
        className="content-panel p-8 text-center text-sm text-text-secondary"
      >
        <p className="font-heading text-base font-semibold text-text-primary">
          {t("notes.teacher.reports.empty.title")}
        </p>
        <p className="mt-1">{t("notes.teacher.reports.empty.message")}</p>
      </div>
    );
  }

  if (detail && selectedStudent) {
    const snapshots = studentNotes[detail.studentId] ?? [];
    const snapshot =
      snapshots.find((entry) => entry.term === detail.term) ?? null;
    const generalText = drafts[detail.studentId]?.generalAppreciation ?? "";

    return (
      <div data-testid="teacher-reports-detail" className="grid gap-4">
        <button
          type="button"
          data-testid="teacher-reports-detail-back"
          onClick={backToList}
          className="w-fit text-sm font-semibold text-primary hover:underline"
        >
          {"< "}
          {t("notes.teacher.reports.backToList")}
        </button>

        <p className="text-sm text-text-secondary">
          {selectedStudent.lastName} {selectedStudent.firstName} · {className}
        </p>

        {loadingStudentId === detail.studentId && !snapshot ? (
          <p className="text-sm text-text-secondary">
            {t("notes.teacher.reports.loading")}
          </p>
        ) : snapshot ? (
          <>
            <ReportHero snapshot={snapshot} />

            <div className="grid gap-2">
              <p className="text-sm font-bold text-text-primary">
                {t("notes.teacher.reports.generalTitle")}
              </p>
              <AppreciationEditor
                value={generalText}
                editing={editingGeneral}
                draft={generalDraft}
                onDraftChange={setGeneralDraft}
                onStartEdit={startEditGeneral}
                onCancel={() => setEditingGeneral(false)}
                onSave={saveGeneral}
                isSaving={isSubmitting}
                testIdPrefix="teacher-reports-general"
              />
            </div>

            <div data-testid="teacher-reports-subjects" className="grid gap-3">
              {snapshot.subjects.map((subject) => {
                const sequenceRows = snapshot.sequences
                  .map((seq) => ({
                    sequence: seq.sequence,
                    label: seq.sequenceLabel,
                    data: seq.subjects.find((entry) => entry.id === subject.id),
                  }))
                  .filter((row) => row.data);

                return (
                  <div
                    key={subject.id}
                    data-testid={`teacher-reports-subject-card-${subject.id}`}
                    className="content-panel grid gap-2.5 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-heading text-sm font-bold text-text-primary">
                        {subject.subjectLabel.toUpperCase()}
                      </p>
                      <p className="text-xs font-semibold text-text-secondary">
                        {t("notes.student.table.coefficient")}{" "}
                        {subject.coefficient}
                      </p>
                    </div>

                    <div className="flex items-start justify-between gap-2 border-t border-warm-border pt-2">
                      {sequenceRows.map((row) => (
                        <div
                          key={row.sequence}
                          data-testid={`teacher-reports-subject-${subject.id}-sequence-${row.sequence}`}
                          className="grid gap-0.5"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                            {row.label}
                          </span>
                          <span className="text-sm font-bold text-text-primary">
                            {formatScore(row.data?.studentAverage ?? null)}
                          </span>
                        </div>
                      ))}
                      <div className="grid justify-items-end gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                          {t("notes.teacher.reports.termAverage")}
                        </span>
                        <span className="text-base font-bold text-primary">
                          {formatScore(subject.studentAverage)}
                        </span>
                      </div>
                    </div>

                    <AppreciationEditor
                      value={
                        drafts[detail.studentId]?.subjects?.[subject.id] ?? ""
                      }
                      editing={editingSubjectId === subject.id}
                      draft={subjectDraft}
                      onDraftChange={setSubjectDraft}
                      onStartEdit={() => startEditSubject(subject.id)}
                      onCancel={() => setEditingSubjectId(null)}
                      onSave={() => saveSubject(subject.id)}
                      isSaving={isSubmitting}
                      testIdPrefix={`teacher-reports-subject-${subject.id}`}
                    />
                  </div>
                );
              })}
            </div>

            {snapshot.generatedAtLabel ? (
              <div
                data-testid="teacher-reports-published"
                className="rounded-[14px] border border-warm-border bg-surface px-4 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                  {t("notes.teacher.reports.published")}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-text-primary">
                  {snapshot.generatedAtLabel}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            {t("notes.teacher.reports.empty.message")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-testid="teacher-reports-tab" className="grid gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          data-testid="teacher-reports-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t("notes.teacher.reports.search.placeholder")}
          className="w-full rounded-[10px] border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-text-primary outline-none focus:border-primary"
        />
        {searchQuery.length > 0 ? (
          <button
            type="button"
            data-testid="teacher-reports-search-clear"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div data-testid="teacher-reports-list" className="grid gap-2.5">
        {filteredStudents.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("notes.teacher.reports.empty.message")}
          </p>
        ) : (
          filteredStudents.map((student) => {
            const expanded = expandedStudentId === student.id;
            const snapshots = studentNotes[student.id] ?? [];
            return (
              <div key={student.id} className="grid gap-2">
                <button
                  type="button"
                  data-testid={`teacher-reports-row-${student.id}`}
                  onClick={() => toggleStudent(student.id)}
                  className="flex items-center justify-between rounded-[12px] border border-border bg-surface px-3.5 py-3.5 text-left"
                >
                  <span className="text-sm font-bold text-text-primary">
                    {student.lastName} {student.firstName}
                  </span>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  )}
                </button>

                {expanded ? (
                  <div
                    data-testid={`teacher-reports-bulletins-${student.id}`}
                    className="grid grid-cols-3 gap-2"
                  >
                    {ALL_TERMS.map((entryTerm) => {
                      const snapshot =
                        snapshots.find((entry) => entry.term === entryTerm) ??
                        null;
                      return (
                        <button
                          key={entryTerm}
                          type="button"
                          data-testid={`teacher-reports-bulletin-${student.id}-${entryTerm}`}
                          onClick={() => openBulletin(student.id, entryTerm)}
                          className="grid gap-1 rounded-[10px] border border-teal-border bg-surface px-2.5 py-3 text-center"
                        >
                          <span className="text-[11px] font-semibold text-text-secondary">
                            {termLabel(t, entryTerm)}
                          </span>
                          <span className="font-heading text-base font-extrabold text-primary">
                            {formatScore(
                              snapshot?.generalAverage.student ?? null,
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
