"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Filter,
  Medal,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useTranslation, type TranslateFn } from "../../i18n/useTranslation";
import { SearchableSelect } from "../ui/searchable-select";
import { SubjectReportCard } from "../student-notes/subject-report-card";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
} from "../student-notes/student-notes.types";

// Vue "Bulletins" du school admin : élève cherché sur toute l'école (comme
// l'onglet notes), avec la classe affichée en face du nom et des filtres
// niveau/classe en listes liées. Lecture seule : l'édition des appréciations
// reste réservée aux enseignants (référent/matière) depuis leur propre vue.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const ALL_TERMS: StudentNotesTerm[] = ["TERM_1", "TERM_2", "TERM_3"];

export type SchoolWideReportsStudent = {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  classId: string;
  academicLevelId?: string;
};

export type SchoolWideClassroomOption = {
  id: string;
  name: string;
  academicLevel?: { id: string; label: string } | null;
};

type Props = {
  schoolSlug: string;
  students: SchoolWideReportsStudent[];
  classrooms: SchoolWideClassroomOption[];
  isLoadingStudents?: boolean;
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
      data-testid="school-reports-hero"
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
                data-testid={`school-reports-stat-${stat.id}`}
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

export function SchoolPeriodReports({
  schoolSlug,
  students,
  classrooms,
  isLoadingStudents = false,
}: Props) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
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

  const sortedStudents = useMemo(
    () =>
      [...students].sort(
        (a, b) =>
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName),
      ),
    [students],
  );

  const levelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    classrooms.forEach((classroom) => {
      if (classroom.academicLevel && !seen.has(classroom.academicLevel.id)) {
        seen.set(classroom.academicLevel.id, classroom.academicLevel.label);
      }
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [classrooms]);

  const classOptions = useMemo(
    () =>
      levelId
        ? classrooms.filter(
            (classroom) => classroom.academicLevel?.id === levelId,
          )
        : classrooms,
    [classrooms, levelId],
  );

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedStudents.filter((student) => {
      if (levelId && student.academicLevelId !== levelId) return false;
      if (classId && student.classId !== classId) return false;
      if (
        query &&
        !`${student.lastName} ${student.firstName}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [sortedStudents, searchQuery, levelId, classId]);

  const hasActiveFilters = levelId !== "" || classId !== "";

  function handleLevelChange(nextLevelId: string) {
    setLevelId(nextLevelId);
    setClassId((current) => {
      const stillValid = classrooms.find(
        (classroom) => classroom.id === current,
      )?.academicLevel?.id;
      return nextLevelId && stillValid !== nextLevelId ? "" : current;
    });
  }

  function resetFilters() {
    setLevelId("");
    setClassId("");
  }

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
  }

  function backToList() {
    setDetail(null);
  }

  if (isLoadingStudents && students.length === 0) {
    return (
      <div
        data-testid="school-reports-loading"
        className="content-panel p-8 text-center text-sm text-text-secondary"
      >
        {t("notes.adminEntry.loading")}
      </div>
    );
  }

  if (detail && selectedStudent) {
    const snapshots = studentNotes[detail.studentId] ?? [];
    const snapshot =
      snapshots.find((entry) => entry.term === detail.term) ?? null;

    return (
      <div data-testid="school-reports-detail" className="grid gap-4">
        <button
          type="button"
          data-testid="school-reports-detail-back"
          onClick={backToList}
          className="w-fit text-sm font-semibold text-primary hover:underline"
        >
          {"< "}
          {t("notes.teacher.reports.backToList")}
        </button>

        <p className="text-sm text-text-secondary">
          {selectedStudent.lastName} {selectedStudent.firstName} ·{" "}
          {selectedStudent.className}
        </p>

        {loadingStudentId === detail.studentId && !snapshot ? (
          <p className="text-sm text-text-secondary">
            {t("notes.teacher.reports.loading")}
          </p>
        ) : snapshot ? (
          <>
            <ReportHero snapshot={snapshot} />

            <div data-testid="school-reports-subjects" className="grid gap-3">
              {snapshot.subjects.map((subject) => {
                const sequenceRows = snapshot.sequences
                  .map((seq) => ({
                    sequence: seq.sequence,
                    label: seq.sequenceLabel,
                    data: seq.subjects.find((entry) => entry.id === subject.id),
                  }))
                  .filter((row) => row.data);

                return (
                  <SubjectReportCard
                    key={subject.id}
                    subject={subject}
                    sequenceRows={sequenceRows.map((row) => ({
                      sequence: row.sequence,
                      label: row.label,
                      studentAverage: row.data?.studentAverage ?? null,
                    }))}
                    editable={false}
                    appreciationValue={subject.appreciation ?? ""}
                    testId={`school-reports-subject-card-${subject.id}`}
                    testIdPrefix={`school-reports-subject-${subject.id}`}
                  />
                );
              })}
            </div>

            {snapshot.generatedAtLabel ? (
              <div
                data-testid="school-reports-published"
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
    <div data-testid="school-reports-tab" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            data-testid="school-reports-search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("notes.teacher.reports.search.placeholder")}
            className="w-full rounded-[10px] border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-text-primary outline-none focus:border-primary"
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              data-testid="school-reports-search-clear"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          data-testid="school-reports-filter-toggle"
          onClick={() => setFiltersOpen((value) => !value)}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-sm font-semibold transition ${
            hasActiveFilters
              ? "border-accent-teal bg-accent-teal text-white"
              : "border-accent-teal text-accent-teal"
          }`}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {filtersOpen ? (
        <div
          data-testid="school-reports-filter-panel"
          className="grid gap-4 rounded-[14px] border border-border bg-surface p-4 sm:grid-cols-2 sm:items-end"
        >
          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">
              {t("notes.adminEntry.levelLabel")}
            </span>
            <SearchableSelect
              ariaLabel={t("notes.adminEntry.levelLabel")}
              value={levelId}
              onChange={handleLevelChange}
              data-testid="school-reports-filter-level"
              placeholder={t("notes.adminEntry.allLevels")}
              options={levelOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text-secondary">
              {t("notes.adminEntry.classLabel")}
            </span>
            <SearchableSelect
              ariaLabel={t("notes.adminEntry.classLabel")}
              value={classId}
              onChange={setClassId}
              data-testid="school-reports-filter-class"
              placeholder={t("notes.adminEntry.classPlaceholder")}
              options={classOptions.map((option) => ({
                value: option.id,
                label: option.name,
              }))}
            />
          </label>
          {hasActiveFilters ? (
            <button
              type="button"
              data-testid="school-reports-filter-reset"
              onClick={resetFilters}
              className="w-fit text-sm font-semibold text-accent-teal hover:underline sm:col-span-2"
            >
              {t("notes.teacher.list.filterReset")}
            </button>
          ) : null}
        </div>
      ) : null}

      <div data-testid="school-reports-list" className="grid gap-2.5">
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
                  data-testid={`school-reports-row-${student.id}`}
                  onClick={() => toggleStudent(student.id)}
                  className="flex items-center justify-between rounded-[12px] border border-border bg-surface px-3.5 py-3.5 text-left"
                >
                  <span className="grid gap-0.5">
                    <span className="text-sm font-bold text-text-primary">
                      {student.lastName} {student.firstName}
                    </span>
                    <span
                      data-testid={`school-reports-row-class-${student.id}`}
                      className="text-xs font-semibold text-text-secondary"
                    >
                      {student.className}
                    </span>
                  </span>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
                  )}
                </button>

                {expanded ? (
                  <div
                    data-testid={`school-reports-bulletins-${student.id}`}
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
                          data-testid={`school-reports-bulletin-${student.id}-${entryTerm}`}
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
