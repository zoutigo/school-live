"use client";

import { useParams } from "next/navigation";
import { FamilyFeedPage } from "../../../../../../../components/feed/family-feed-page";
import { ChildModulePage } from "../../../../../../../components/family/child-module-page";
import {
  FEED_FILTERS_TOUR_ID,
  FEED_FILTERS_TOUR_STEPS,
} from "../../../../../../../components/feed/feed-filters-tour.config";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { useTranslation } from "../../../../../../../i18n/useTranslation";

export default function ChildVieDeClassePage() {
  const { schoolSlug, childId } = useParams<{
    schoolSlug: string;
    childId: string;
  }>();
  const { t } = useTranslation();

  return (
    <ChildModulePage
      schoolSlug={schoolSlug}
      childId={childId}
      currentTab="vie-de-classe"
      title={t("feed.vieDeClasse.title")}
      subtitle={t("feed.vieDeClasse.subtitle")}
      summary={t("feed.vieDeClasse.summary")}
      bullets={[
        t("feed.vieDeClasse.bullet1"),
        t("feed.vieDeClasse.bullet2"),
        t("feed.vieDeClasse.bullet3"),
      ]}
      hideModuleHeader
      hidePrimaryTabs
      hideSecondaryTabs
      onReady={({ onboardingHelpEnabled }) => {
        const tourStore = useOnboardingTourStore.getState();
        if (
          onboardingHelpEnabled &&
          !tourStore.isCompleted("parent", FEED_FILTERS_TOUR_ID) &&
          !tourStore.activeTourId
        ) {
          tourStore.startTour(
            FEED_FILTERS_TOUR_ID,
            "parent",
            FEED_FILTERS_TOUR_STEPS,
          );
        }
      }}
      content={({ child }) => {
        const studentLabel = child
          ? `${child.lastName.toUpperCase()} ${child.firstName}`
          : t("feed.vieDeClasse.defaultStudentLabel");
        const classLabel = child?.className?.trim();
        const headingTitle = classLabel
          ? t("feed.vieDeClasse.headingWithClass")
              .replace("{className}", classLabel)
              .replace("{studentLabel}", studentLabel)
          : t("feed.vieDeClasse.headingWithoutClass").replace(
              "{studentLabel}",
              studentLabel,
            );

        return (
          <FamilyFeedPage
            schoolSlug={schoolSlug}
            childFullName={studentLabel}
            scopeLabel={t("feed.scope.class")}
            headingTitle={headingTitle}
            viewScope="CLASS"
            currentClassId={child?.classId ?? undefined}
            hideSectionLabel
            useDemoSeed={false}
          />
        );
      }}
    />
  );
}
