"use client";

import { useParams } from "next/navigation";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import { StudentHomeworkPanel } from "../../../../../../../components/homework/student-homework-panel";
import {
  HOMEWORK_TOUR_ID,
  HOMEWORK_TOUR_STEPS,
} from "../../../../../../../components/homework/homework-tour.config";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

export default function ChildCahierDeTextePage() {
  const { t } = useTranslation();
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="cahier-de-texte"
      title={t("homework.cahierDeTexte.title")}
      subtitle={t("homework.cahierDeTexte.subtitle")}
      summary={t("homework.cahierDeTexte.summary")}
      bullets={[
        t("homework.cahierDeTexte.bullet1"),
        t("homework.cahierDeTexte.bullet2"),
        t("homework.cahierDeTexte.bullet3"),
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      onReady={({ onboardingHelpEnabled }) => {
        const tourStore = useOnboardingTourStore.getState();
        if (
          onboardingHelpEnabled &&
          !tourStore.isCompleted("parent", HOMEWORK_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(HOMEWORK_TOUR_ID, "parent", HOMEWORK_TOUR_STEPS);
        }
      }}
      content={({ child }) => {
        const childFullName = child
          ? `${child.lastName.toUpperCase()} ${child.firstName}`
          : t("homework.cahierDeTexte.subtitle");
        const cardSubtitle = child?.className
          ? `${childFullName} - ${child.className}`
          : childFullName;

        return (
          <StudentHomeworkPanel
            schoolSlug={schoolSlug}
            classId={child?.classId ?? null}
            studentId={childId}
            cardTitle={t("homework.cahierDeTexte.title")}
            cardSubtitle={cardSubtitle}
          />
        );
      }}
    />
  );
}
