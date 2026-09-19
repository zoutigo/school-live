"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../../../../components/ui/card";
import { SearchableSelect } from "../../../../../components/ui/searchable-select";
import { OnboardingTarget } from "../../../../../components/onboarding/onboarding-target";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { useTranslation } from "../../../../../i18n/useTranslation";
import { useViewportTier } from "../../../../../lib/use-viewport-tier";
import { ClassDisciplinePanel } from "../../../../../components/discipline/class-discipline-panel";
import {
  SCHOOL_ADMIN_DISCIPLINE_TOUR_ID,
  SCHOOL_ADMIN_DISCIPLINE_TOUR_STEPS,
  SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS,
} from "../../../../../components/discipline/school-admin-discipline-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const SCHOOL_STAFF_ROLES = [
  "SCHOOL_ADMIN",
  "SCHOOL_MANAGER",
  "SUPERVISOR",
  "SCHOOL_ACCOUNTANT",
  "SCHOOL_STAFF",
  "SCHOOL_HEALTH_OFFICER",
] as const;
type SchoolStaffRole = (typeof SCHOOL_STAFF_ROLES)[number];

type MeResponse = {
  role: string;
  onboardingHelpEnabled?: boolean;
};

type GradesContext = {
  assignments: Array<{
    classId: string;
    className: string;
  }>;
  students: Array<{
    classId: string;
    studentId: string;
    studentFirstName: string;
    studentLastName: string;
  }>;
};

type ClassOption = { classId: string; className: string };

export default function SchoolAdminDisciplinePage() {
  const { t } = useTranslation();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const viewportTier = useViewportTier();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug]);

  async function bootstrap() {
    setLoading(true);
    setError(null);
    try {
      const meResponse = await fetch(`${API_URL}/schools/${schoolSlug}/me`, {
        credentials: "include",
      });

      if (!meResponse.ok) {
        router.replace(`/schools/${schoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as MeResponse;
      if (!SCHOOL_STAFF_ROLES.includes(me.role as SchoolStaffRole)) {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }
      setRole(me.role);

      const tourStore = useOnboardingTourStore.getState();
      if (
        me.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted(me.role, SCHOOL_ADMIN_DISCIPLINE_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          SCHOOL_ADMIN_DISCIPLINE_TOUR_ID,
          me.role,
          SCHOOL_ADMIN_DISCIPLINE_TOUR_STEPS,
        );
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        { credentials: "include" },
      );

      if (!contextResponse.ok) {
        setError(t("discipline.errors.loadClass"));
        return;
      }

      const contextPayload = (await contextResponse.json()) as GradesContext;
      setContext(contextPayload);
    } catch {
      setError(t("discipline.common.networkError"));
    } finally {
      setLoading(false);
    }
  }

  const classes: ClassOption[] = useMemo(() => {
    if (!context) {
      return [];
    }
    const byId = new Map<string, ClassOption>();
    for (const entry of context.assignments) {
      if (!byId.has(entry.classId)) {
        byId.set(entry.classId, {
          classId: entry.classId,
          className: entry.className,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.className.localeCompare(b.className),
    );
  }, [context]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClassId("");
      return;
    }
    if (!classes.some((entry) => entry.classId === selectedClassId)) {
      setSelectedClassId(classes[0].classId);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find(
    (entry) => entry.classId === selectedClassId,
  );

  const students = useMemo(() => {
    if (!context || !selectedClassId) {
      return [];
    }
    return context.students
      .filter((entry) => entry.classId === selectedClassId)
      .map((entry) => ({
        id: entry.studentId,
        firstName: entry.studentFirstName,
        lastName: entry.studentLastName,
      }))
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
        ),
      );
  }, [context, selectedClassId]);

  if (loading) {
    return (
      <p className="text-sm text-text-secondary">
        {t("discipline.common.loading")}
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-notification">{error}</p>;
  }

  if (!role) {
    return null;
  }

  const classSelector = (
    <Card title={t("discipline.admin.classLabel")}>
      {classes.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {t("discipline.admin.noClasses")}
        </p>
      ) : (
        <OnboardingTarget id={SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS.classSelect}>
          <SearchableSelect
            ariaLabel={t("discipline.admin.classLabel")}
            value={selectedClassId}
            onChange={setSelectedClassId}
            searchPlaceholder={t("settings.form.searchPlaceholder")}
            noResultsLabel={t("settings.form.noResults")}
            data-testid="discipline-admin-class-select"
            options={classes.map((entry) => ({
              value: entry.classId,
              label: entry.className,
            }))}
          />
        </OnboardingTarget>
      )}
    </Card>
  );

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-heading text-lg font-semibold text-text-primary">
          {t("discipline.admin.pageTitle")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("discipline.admin.pageSubtitle")}
        </p>
      </div>

      <div
        className={
          viewportTier === "desktop"
            ? "flex flex-row gap-4"
            : "flex flex-col gap-4"
        }
      >
        <div
          className={
            viewportTier === "desktop" ? "w-[320px] shrink-0" : "w-full"
          }
        >
          {classSelector}
        </div>

        <div className="min-w-0 flex-1">
          {selectedClass ? (
            <ClassDisciplinePanel
              schoolSlug={schoolSlug}
              classId={selectedClass.classId}
              className={selectedClass.className}
              students={students}
              tourTargets={SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS}
            />
          ) : (
            <Card title={t("discipline.admin.pageTitle")}>
              <p className="text-sm text-text-secondary">
                {t("discipline.admin.noClassSelected")}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
