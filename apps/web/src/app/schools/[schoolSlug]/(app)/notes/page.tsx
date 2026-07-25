"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import {
  FormSelect,
  FormTextInput,
} from "../../../../../components/ui/form-controls";
import { TermView } from "../../../../../components/student-notes/student-notes-page";
import type {
  StudentNotesTerm,
  StudentNotesTermSnapshot,
} from "../../../../../components/student-notes/student-notes.types";
import { useTranslation } from "../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ClassroomOption = {
  id: string;
  name: string;
  academicLevel?: { id: string; label: string } | null;
};

type SchoolEvaluationRow = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  scheduledAt?: string | null;
  createdAt: string;
  subject: { id: string; name: string };
  subjectBranch?: { id: string; name: string } | null;
  class: { id: string; name: string };
  _count: { scores: number };
};

type StudentSearchEntry = {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
};

type ClassroomEvaluationContext = {
  students?: Array<{ id: string; firstName: string; lastName: string }>;
};

type NotesAdminTab = "evaluations" | "notes";

export default function NotesAdminEntryPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoClass, setHasNoClass] = useState(false);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [evaluations, setEvaluations] = useState<SchoolEvaluationRow[]>([]);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(false);
  const [evaluationsError, setEvaluationsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── Onglet Notes : recherche élève sur toute l'école ────────────────────────
  const [notesTab, setNotesTab] = useState<NotesAdminTab>("evaluations");
  const [schoolWideStudents, setSchoolWideStudents] = useState<
    StudentSearchEntry[]
  >([]);
  const [isLoadingSchoolWideStudents, setIsLoadingSchoolWideStudents] =
    useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [studentSnapshots, setStudentSnapshots] = useState<
    StudentNotesTermSnapshot[]
  >([]);
  const [selectedTerm, setSelectedTerm] = useState<StudentNotesTerm>("TERM_1");
  const [isLoadingStudentNotes, setIsLoadingStudentNotes] = useState(false);
  const [studentNotesError, setStudentNotesError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      setHasNoClass(false);

      try {
        const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
          credentials: "include",
        });
        if (!meResponse.ok) {
          router.replace(`/schools/${schoolSlug}/login`);
          return;
        }

        const me = (await meResponse.json()) as { role?: string };
        if (
          !["SCHOOL_ADMIN", "SCHOOL_MANAGER", "SUPERVISOR"].includes(
            me.role ?? "",
          )
        ) {
          router.replace(`/schools/${schoolSlug}/dashboard`);
          return;
        }

        const classroomsResponse = await fetch(
          `${API_URL}/schools/${schoolSlug}/admin/classrooms`,
          { credentials: "include" },
        );
        if (!classroomsResponse.ok) {
          throw new Error("classrooms-error");
        }
        const rows = (await classroomsResponse.json()) as ClassroomOption[];

        if (cancelled) return;

        if (rows.length === 0) {
          setHasNoClass(true);
          setLoading(false);
          return;
        }

        setClassrooms(rows);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(t("notes.teacher.errors.loadModule"));
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [schoolSlug, router, t]);

  // Un school admin n'est jamais scopé sur une classe : la liste ci-dessous
  // montre par défaut les évaluations les plus récentes de toute l'école
  // (endpoint GET /schools/:schoolSlug/evaluations), niveau/classe ne servant
  // qu'à restreindre cette liste, jamais à la conditionner.
  useEffect(() => {
    if (loading || hasNoClass || error) return;
    let cancelled = false;

    async function loadEvaluations() {
      setIsLoadingEvaluations(true);
      setEvaluationsError(null);
      try {
        const params = new URLSearchParams();
        if (levelId) params.set("academicLevelId", levelId);
        if (classId) params.set("classId", classId);
        const query = params.toString();
        const response = await fetch(
          `${API_URL}/schools/${schoolSlug}/evaluations${
            query ? `?${query}` : ""
          }`,
          { credentials: "include" },
        );
        if (!response.ok) {
          throw new Error("evaluations-error");
        }
        const rows = (await response.json()) as SchoolEvaluationRow[];
        if (!cancelled) {
          setEvaluations(rows);
        }
      } catch {
        if (!cancelled) {
          setEvaluationsError(t("notes.adminEntry.evaluationsError"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEvaluations(false);
        }
      }
    }

    void loadEvaluations();

    return () => {
      cancelled = true;
    };
  }, [schoolSlug, levelId, classId, loading, hasNoClass, error, t]);

  // Élèves de toute l'école, avec leur classe, pour désambiguïser les
  // homonymes dans la recherche de l'onglet Notes. Chargé une seule fois,
  // à l'ouverture de l'onglet (comme le pattern mobile équivalent).
  useEffect(() => {
    if (
      notesTab !== "notes" ||
      classrooms.length === 0 ||
      schoolWideStudents.length > 0
    ) {
      return;
    }
    let cancelled = false;
    setIsLoadingSchoolWideStudents(true);
    Promise.all(
      classrooms.map((classroom) =>
        fetch(
          `${API_URL}/schools/${schoolSlug}/classes/${classroom.id}/evaluations/context`,
          { credentials: "include" },
        )
          .then((response) =>
            response.ok
              ? (response.json() as Promise<ClassroomEvaluationContext>)
              : { students: [] },
          )
          .then((ctx) =>
            (ctx.students ?? []).map((student) => ({
              ...student,
              className: classroom.name,
            })),
          )
          .catch(() => [] as StudentSearchEntry[]),
      ),
    )
      .then((lists) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const students = lists.flat().filter((student) => {
          if (seen.has(student.id)) return false;
          seen.add(student.id);
          return true;
        });
        setSchoolWideStudents(students);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSchoolWideStudents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notesTab, classrooms, schoolSlug, schoolWideStudents.length]);

  // Notes de l'élève sélectionné dans l'onglet Notes.
  useEffect(() => {
    if (!selectedStudentId) return;
    let cancelled = false;
    setIsLoadingStudentNotes(true);
    setStudentNotesError(null);
    fetch(
      `${API_URL}/schools/${schoolSlug}/students/${selectedStudentId}/notes`,
      {
        credentials: "include",
      },
    )
      .then((response) => {
        if (!response.ok) throw new Error("student-notes-error");
        return response.json() as Promise<StudentNotesTermSnapshot[]>;
      })
      .then((payload) => {
        if (cancelled) return;
        setStudentSnapshots(payload);
        setSelectedTerm((current) =>
          payload.some((entry) => entry.term === current)
            ? current
            : (payload[0]?.term ?? current),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setStudentSnapshots([]);
          setStudentNotesError(t("notes.adminEntry.studentNotesError"));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStudentNotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolSlug, selectedStudentId, t]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return schoolWideStudents;
    return schoolWideStudents.filter((student) =>
      `${student.lastName} ${student.firstName}`.toLowerCase().includes(query),
    );
  }, [schoolWideStudents, studentSearch]);

  const selectedStudent = useMemo(
    () =>
      schoolWideStudents.find((student) => student.id === selectedStudentId) ??
      null,
    [schoolWideStudents, selectedStudentId],
  );

  const currentStudentSnapshot = useMemo(
    () =>
      studentSnapshots.find((entry) => entry.term === selectedTerm) ??
      studentSnapshots[0] ??
      null,
    [studentSnapshots, selectedTerm],
  );

  const filteredEvaluations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return evaluations;
    return evaluations.filter(
      (evaluation) =>
        evaluation.title.toLowerCase().includes(query) ||
        evaluation.subject.name.toLowerCase().includes(query),
    );
  }, [evaluations, search]);

  const levelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    classrooms.forEach((classroom) => {
      if (classroom.academicLevel && !seen.has(classroom.academicLevel.id)) {
        seen.set(classroom.academicLevel.id, classroom.academicLevel.label);
      }
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [classrooms]);

  const classOptions = useMemo(() => {
    return levelId
      ? classrooms.filter(
          (classroom) => classroom.academicLevel?.id === levelId,
        )
      : classrooms;
  }, [classrooms, levelId]);

  if (hasNoClass) {
    return (
      <div className="p-6" data-testid="notes-admin-entry-empty">
        <Card title={t("notes.adminEntry.emptyTitle")}>
          <p className="text-sm text-text-secondary">
            {t("notes.adminEntry.emptyMessage")}
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="notes-admin-entry-error">
        <Card title={t("notes.teacher.errors.loadModule")}>
          <p className="text-sm text-text-secondary">{error}</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="p-6 text-sm text-text-secondary"
        data-testid="notes-admin-entry-loading"
      >
        {t("notes.adminEntry.loading")}
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="notes-admin-entry-browse">
      <div
        className="mb-4 flex gap-2 border-b border-border"
        data-testid="notes-admin-entry-tabs"
      >
        <button
          type="button"
          onClick={() => setNotesTab("evaluations")}
          data-testid="notes-admin-entry-tab-evaluations"
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            notesTab === "evaluations"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          {t("notes.adminEntry.tabEvaluations")}
        </button>
        <button
          type="button"
          onClick={() => setNotesTab("notes")}
          data-testid="notes-admin-entry-tab-notes"
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold transition ${
            notesTab === "notes"
              ? "border-primary text-primary"
              : "border-transparent text-text-secondary hover:text-primary"
          }`}
        >
          {t("notes.adminEntry.tabNotes")}
        </button>
      </div>

      {notesTab === "notes" ? (
        <Card title={t("notes.adminEntry.studentSearchTitle")}>
          <p className="mb-4 text-sm text-text-secondary">
            {t("notes.adminEntry.studentSearchSubtitle")}
          </p>

          <FormTextInput
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder={t("notes.adminEntry.studentSearchPlaceholder")}
            aria-label={t("notes.adminEntry.studentSearchAria")}
            data-testid="notes-admin-entry-student-search"
          />

          {isLoadingSchoolWideStudents ? (
            <p
              className="mt-4 text-sm text-text-secondary"
              data-testid="notes-admin-entry-student-list-loading"
            >
              {t("notes.adminEntry.studentSearchLoading")}
            </p>
          ) : schoolWideStudents.length === 0 ? (
            <p
              className="mt-4 text-sm text-text-secondary"
              data-testid="notes-admin-entry-student-list-empty"
            >
              {t("notes.adminEntry.studentSearchNoStudent")}
            </p>
          ) : filteredStudents.length === 0 ? (
            <p
              className="mt-4 text-sm text-text-secondary"
              data-testid="notes-admin-entry-student-search-empty"
            >
              {t("notes.adminEntry.studentSearchEmpty")}
            </p>
          ) : (
            <ul
              className="mt-4 grid gap-2"
              data-testid="notes-admin-entry-student-list"
            >
              {filteredStudents.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    data-testid={`notes-admin-entry-student-row-${student.id}`}
                    className={`flex w-full items-center justify-between gap-2 rounded-card border p-3 text-left transition hover:border-accent-teal ${
                      selectedStudentId === student.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface"
                    }`}
                  >
                    <span className="font-semibold text-text-primary">
                      {student.lastName} {student.firstName}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {student.className}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedStudent ? (
            <div
              className="mt-6 border-t border-border pt-6"
              data-testid="notes-admin-entry-student-notes"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-heading text-base font-semibold text-text-primary">
                  {selectedStudent.lastName} {selectedStudent.firstName} •{" "}
                  {selectedStudent.className}
                </p>
                {studentSnapshots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {studentSnapshots.map((snapshot) => (
                      <button
                        key={snapshot.term}
                        type="button"
                        onClick={() => setSelectedTerm(snapshot.term)}
                        data-testid={`notes-admin-entry-term-${snapshot.term}`}
                        className={`shrink-0 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition ${
                          selectedTerm === snapshot.term
                            ? "border-primary bg-[linear-gradient(90deg,#0A62BF,#1182D8)] text-white"
                            : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-primary"
                        }`}
                      >
                        {snapshot.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {isLoadingStudentNotes ? (
                <p
                  className="text-sm text-text-secondary"
                  data-testid="notes-admin-entry-student-notes-loading"
                >
                  {t("notes.adminEntry.loading")}
                </p>
              ) : studentNotesError ? (
                <p
                  className="text-sm text-notification"
                  data-testid="notes-admin-entry-student-notes-error"
                >
                  {studentNotesError}
                </p>
              ) : currentStudentSnapshot ? (
                <TermView snapshot={currentStudentSnapshot} />
              ) : (
                <p
                  className="text-sm text-text-secondary"
                  data-testid="notes-admin-entry-student-notes-empty"
                >
                  {t("notes.adminEntry.listEmpty")}
                </p>
              )}
            </div>
          ) : null}
        </Card>
      ) : (
        <Card title={t("notes.adminEntry.browseTitle")}>
          <p className="mb-4 text-sm text-text-secondary">
            {t("notes.adminEntry.browseSubtitle")}
          </p>
          <form
            className="grid gap-4 sm:grid-cols-2 sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (!classId) return;
              router.push(`/schools/${schoolSlug}/classes/${classId}/notes`);
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">
                {t("notes.adminEntry.levelLabel")}
              </span>
              <FormSelect
                value={levelId}
                onChange={(event) => {
                  const nextLevelId = event.target.value;
                  setLevelId(nextLevelId);
                  setClassId((current) => {
                    const stillValid = classrooms.find(
                      (classroom) => classroom.id === current,
                    )?.academicLevel?.id;
                    return nextLevelId && stillValid !== nextLevelId
                      ? ""
                      : current;
                  });
                }}
                data-testid="notes-admin-entry-level"
              >
                <option value="">{t("notes.adminEntry.allLevels")}</option>
                {levelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </FormSelect>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-text-secondary">
                {t("notes.adminEntry.classLabel")}
              </span>
              <FormSelect
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                data-testid="notes-admin-entry-class"
              >
                <option value="">
                  {t("notes.adminEntry.classPlaceholder")}
                </option>
                {classOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </FormSelect>
            </label>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={!classId}
                data-testid="notes-admin-entry-submit"
              >
                {t("notes.adminEntry.viewButton")}
              </Button>
            </div>
          </form>

          <div className="mt-6" data-testid="notes-admin-entry-list-section">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-heading text-base font-semibold text-text-primary">
                {t("notes.adminEntry.listTitle")}
              </p>
              <FormTextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("notes.adminEntry.searchPlaceholder")}
                aria-label={t("notes.adminEntry.searchAria")}
                data-testid="notes-admin-entry-search"
              />
            </div>

            {isLoadingEvaluations ? (
              <p
                className="text-sm text-text-secondary"
                data-testid="notes-admin-entry-list-loading"
              >
                {t("notes.adminEntry.loading")}
              </p>
            ) : evaluationsError ? (
              <p
                className="text-sm text-notification"
                data-testid="notes-admin-entry-list-error"
              >
                {evaluationsError}
              </p>
            ) : filteredEvaluations.length === 0 ? (
              <p
                className="text-sm text-text-secondary"
                data-testid="notes-admin-entry-list-empty"
              >
                {t("notes.adminEntry.listEmpty")}
              </p>
            ) : (
              <ul className="grid gap-2" data-testid="notes-admin-entry-list">
                {filteredEvaluations.map((evaluation) => (
                  <li key={evaluation.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/schools/${schoolSlug}/classes/${evaluation.class.id}/notes`,
                        )
                      }
                      data-testid={`notes-admin-entry-row-${evaluation.id}`}
                      className="flex w-full flex-col gap-1 rounded-card border border-border bg-surface p-3 text-left transition hover:border-accent-teal"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">
                          {evaluation.title}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          {evaluation.status === "PUBLISHED"
                            ? t("notes.teacher.status.published")
                            : t("notes.teacher.status.draft")}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary">
                        {evaluation.subject.name}
                        {evaluation.subjectBranch?.name
                          ? ` • ${evaluation.subjectBranch.name}`
                          : ""}
                        {" • "}
                        {evaluation.class.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {new Date(
                          evaluation.scheduledAt ?? evaluation.createdAt,
                        ).toLocaleDateString("fr-FR")}
                        {" • "}
                        {evaluation._count.scores}{" "}
                        {t("notes.adminEntry.scoresCount")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
