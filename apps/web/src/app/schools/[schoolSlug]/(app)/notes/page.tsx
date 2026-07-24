"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { Button } from "../../../../../components/ui/button";
import { FormSelect } from "../../../../../components/ui/form-controls";
import { useTranslation } from "../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ClassroomOption = {
  id: string;
  name: string;
  academicLevel?: { id: string; label: string } | null;
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
      </Card>
    </div>
  );
}
