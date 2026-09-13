"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../../../components/ui/card";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type AlertLevel = "INFO" | "ATTENTION" | "URGENT";

type RosterStudent = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  activeConditionsCount: number;
  highestActiveAlertLevel: AlertLevel | null;
};

type Roster = {
  class: { id: string; name: string };
  items: RosterStudent[];
};

function alertLevelClass(level: AlertLevel) {
  if (level === "URGENT") return "bg-rose-100 text-rose-700";
  if (level === "ATTENTION") return "bg-amber-100 text-amber-800";
  return "bg-sky-100 text-sky-700";
}

/**
 * Entrée du module Santé pour l'enseignant référent d'une classe : liste des
 * élèves avec un indicateur d'alerte, puis navigation vers la fiche santé
 * complète (en lecture seule) de l'élève choisi. L'accès est vérifié
 * indépendamment côté API — réservé au référent de la classe.
 */
export default function TeacherClassSantePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();

  const [roster, setRoster] = useState<Roster | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoster = useCallback(() => {
    if (!schoolSlug || !classId) return;
    setIsLoading(true);
    setLoadError(null);
    fetch(
      `${API_URL}/schools/${schoolSlug}/classes/${classId}/health/students`,
      {
        credentials: "include",
      },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
      .then((payload: Roster) => setRoster(payload))
      .catch(() => setLoadError(t("health.teacherReferent.errors.load")))
      .finally(() => setIsLoading(false));
  }, [schoolSlug, classId, t]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function goToStudent(student: RosterStudent) {
    router.push(
      `/schools/${schoolSlug}/sante/${student.id}?${new URLSearchParams({
        firstName: student.firstName,
        lastName: student.lastName,
        className: roster?.class.name ?? "",
        age: student.age != null ? String(student.age) : "",
      }).toString()}`,
    );
  }

  return (
    <div className="grid gap-4" data-testid="teacher-class-sante-page">
      <Card>
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          {t("health.teacherReferent.title")}
        </h2>
        {roster?.class.name ? (
          <p className="text-sm text-text-secondary">{roster.class.name}</p>
        ) : null}
      </Card>

      <Card>
        {isLoading ? (
          <p className="text-sm text-text-secondary">
            {t("health.parent.loading")}
          </p>
        ) : loadError ? (
          <p
            className="text-sm text-notification"
            data-testid="teacher-class-sante-error"
          >
            {loadError}
          </p>
        ) : (roster?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("health.teacherReferent.empty.message")}
          </p>
        ) : (
          <div className="grid gap-2">
            {roster!.items.map((student) => (
              <div
                key={student.id}
                role="button"
                tabIndex={0}
                data-testid={`teacher-class-sante-student-${student.id}`}
                onClick={() => goToStudent(student)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  goToStudent(student);
                }}
                className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-card border border-border bg-background p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="min-w-0 truncate text-sm font-semibold text-text-primary">
                    {student.lastName} {student.firstName}
                  </p>
                  {student.age != null ? (
                    <p className="text-xs text-text-secondary">
                      {student.age} {t("health.admin.eleves.ageUnit")}
                    </p>
                  ) : null}
                </div>
                {student.highestActiveAlertLevel ? (
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${alertLevelClass(
                      student.highestActiveAlertLevel,
                    )}`}
                  >
                    {t(`health.alertLevel.${student.highestActiveAlertLevel}`)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
