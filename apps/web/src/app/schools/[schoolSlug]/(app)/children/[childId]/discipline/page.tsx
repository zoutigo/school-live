"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DisciplinePanel } from "../../../../../../../components/discipline/discipline-panel";
import { useTranslation } from "../../../../../../../i18n/useTranslation";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import {
  DISCIPLINE_SELF_TOUR_ID,
  DISCIPLINE_SELF_TOUR_STEPS,
} from "../../../../../../../components/discipline/discipline-tour.config";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ParentChild = {
  id: string;
  firstName: string;
  lastName: string;
};

export default function ChildDisciplinePage() {
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
          `/schools/${currentSchoolSlug}/children/${linked[0].id}/discipline`,
        );
        return;
      }

      const tourStore = useOnboardingTourStore.getState();
      if (
        payload.onboardingHelpEnabled !== false &&
        !tourStore.isCompleted("parent", DISCIPLINE_SELF_TOUR_ID) &&
        !tourStore.activeTourId
      ) {
        tourStore.startTour(
          DISCIPLINE_SELF_TOUR_ID,
          "parent",
          DISCIPLINE_SELF_TOUR_STEPS,
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
    : t("discipline.disciplineSelf.subtitleDefault");

  if (!ready) {
    return (
      <p className="text-sm text-text-secondary">
        {t("discipline.common.loading")}
      </p>
    );
  }

  return (
    <DisciplinePanel
      schoolSlug={schoolSlug}
      studentId={childId}
      studentLabel={studentLabel}
    />
  );
}
