"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import {
  API_URL,
  type GradesContext,
  getClassContext,
  type MeResponse,
} from "../_shared";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import {
  TEACHER_DISCIPLINE_TOUR_ID,
  TEACHER_DISCIPLINE_TOUR_STEPS,
  TEACHER_DISCIPLINE_TOUR_TARGETS,
} from "../../../../../../../components/discipline/teacher-discipline-tour.config";
import { ClassDisciplinePanel } from "../../../../../../../components/discipline/class-discipline-panel";

export default function TeacherClassDisciplinePage() {
  const { t } = useTranslation();
  const { schoolSlug, classId } = useParams<{
    schoolSlug: string;
    classId: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<GradesContext | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [schoolSlug, classId]);

  const classContext = useMemo(
    () => getClassContext(context, classId),
    [context, classId],
  );

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
      if (me.role !== "TEACHER") {
        router.replace(`/schools/${schoolSlug}/dashboard`);
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        me.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("teacher", TEACHER_DISCIPLINE_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          TEACHER_DISCIPLINE_TOUR_ID,
          "teacher",
          TEACHER_DISCIPLINE_TOUR_STEPS,
        );
      }

      const contextResponse = await fetch(
        `${API_URL}/schools/${schoolSlug}/student-grades/context`,
        {
          credentials: "include",
        },
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

  if (!classContext) {
    return (
      <p className="text-sm text-notification">
        {t("discipline.page.classNotAccessible")}
      </p>
    );
  }

  return (
    <ClassDisciplinePanel
      schoolSlug={schoolSlug}
      classId={classId}
      className={classContext.className}
      students={classContext.students}
      tourTargets={TEACHER_DISCIPLINE_TOUR_TARGETS}
    />
  );
}
