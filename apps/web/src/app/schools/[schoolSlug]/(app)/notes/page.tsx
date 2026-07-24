"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { useTranslation } from "../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ClassroomOption = {
  id: string;
  name: string;
};

export default function NotesAdminEntryPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNoClass, setHasNoClass] = useState(false);

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
        const classrooms =
          (await classroomsResponse.json()) as ClassroomOption[];

        if (cancelled) return;

        const firstClass = classrooms[0];
        if (!firstClass) {
          setHasNoClass(true);
          setLoading(false);
          return;
        }

        router.replace(
          `/schools/${schoolSlug}/classes/${firstClass.id}/notes`,
        );
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

  return (
    <div
      className="p-6 text-sm text-text-secondary"
      data-testid="notes-admin-entry-loading"
    >
      {loading ? t("notes.adminEntry.loading") : null}
    </div>
  );
}
