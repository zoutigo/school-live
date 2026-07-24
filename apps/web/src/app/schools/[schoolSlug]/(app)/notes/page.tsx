"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import {
  FormSelect,
  FormTextInput,
} from "../../../../../components/ui/form-controls";
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
              <option value="">{t("notes.adminEntry.classPlaceholder")}</option>
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
    </div>
  );
}
