"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentLifePanel } from "../../../../../../../components/discipline/student-life-panel";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import {
  VIE_SCOLAIRE_TOUR_ID,
  VIE_SCOLAIRE_TOUR_STEPS,
} from "../../../../../../../components/discipline/vie-scolaire-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChildVieScolairePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ schoolSlug: string; childId: string }>();
  const schoolSlug = params.schoolSlug;
  const childId = params.childId;
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!schoolSlug) {
      return;
    }
    void loadParentContext(schoolSlug, childId);
  }, [schoolSlug, childId]);

  async function loadParentContext(
    currentSchoolSlug: string,
    currentChildId: string,
  ) {
    setReady(false);
    try {
      const response = await fetch(
        `${API_URL}/schools/${currentSchoolSlug}/me`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        router.replace(`/schools/${currentSchoolSlug}/login`);
        return;
      }

      const payload = (await response.json()) as {
        role?: string;
        linkedStudents?: ParentChild[];
        onboardingHelpEnabled?: boolean;
      };

      if (payload.role !== "PARENT") {
        router.replace(`/schools/${currentSchoolSlug}/dashboard`);
        return;
      }

      const linked = payload.linkedStudents ?? [];
      setChildren(linked);

      if (
        linked.length > 0 &&
        !linked.some((entry) => entry.id === currentChildId)
      ) {
        router.replace(
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/vie-scolaire`,
        );
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        payload.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("parent", VIE_SCOLAIRE_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          VIE_SCOLAIRE_TOUR_ID,
          "parent",
          VIE_SCOLAIRE_TOUR_STEPS,
        );
      }

      setReady(true);
    } catch {
      setReady(true);
    }
  }

  const currentChild = useMemo(
    () => children.find((entry) => entry.id === childId) ?? null,
    [children, childId],
  );

  const studentLabel = currentChild
    ? `${currentChild.firstName} ${currentChild.lastName}`
    : t("discipline.vieScolaire.subtitleDefault");

  if (!ready) {
    return (
      <p className="text-sm text-text-secondary">
        {t("discipline.common.loading")}
      </p>
    );
  }

  return (
    <StudentLifePanel
      schoolSlug={schoolSlug}
      studentId={childId}
      studentLabel={studentLabel}
    />
  );
}
