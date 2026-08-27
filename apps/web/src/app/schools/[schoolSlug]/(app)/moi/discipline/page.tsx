"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DisciplinePanel } from "../../../../../../components/discipline/discipline-panel";
import { useTranslation } from "../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../store/onboarding-tour";
import {
  DISCIPLINE_SELF_TOUR_ID,
  DISCIPLINE_SELF_TOUR_STEPS,
} from "../../../../../../components/discipline/discipline-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function MyDisciplinePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [selfContext, setSelfContext] = useState<{
    studentId: string;
    studentLabel: string;
  } | null>(null);

  useEffect(() => {
    if (!schoolSlug) return;
    void loadSelfContext(schoolSlug);
  }, [schoolSlug]);

  async function loadSelfContext(currentSchoolSlug: string) {
    try {
      const meResponse = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        { credentials: "include" },
      );

      if (!meResponse.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const me = (await meResponse.json()) as {
        role?: string;
        onboardingHelpEnabled?: boolean;
      };
      if (me.role !== "STUDENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        me.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("student", DISCIPLINE_SELF_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          DISCIPLINE_SELF_TOUR_ID,
          "student",
          DISCIPLINE_SELF_TOUR_STEPS,
        );
      }

      const timetableResponse = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/timetable/me`,
        { credentials: "include" },
      );

      if (!timetableResponse.ok) {
        throw new Error("self-context-load-failed");
      }

      const timetable = (await timetableResponse.json()) as {
        student: { id: string; firstName: string; lastName: string };
      };

      setSelfContext({
        studentId: timetable.student.id,
        studentLabel: `${timetable.student.firstName} ${timetable.student.lastName}`,
      });
    } catch {
      // Silencieux : DisciplinePanel affichera son propre état de chargement
      // tant que selfContext reste null.
    }
  }

  if (!selfContext) {
    return (
      <p className="text-sm text-text-secondary">
        {t("discipline.common.loading")}
      </p>
    );
  }

  return (
    <DisciplinePanel
      schoolSlug={schoolSlug}
      studentId={selfContext.studentId}
      studentLabel={selfContext.studentLabel}
    />
  );
}
