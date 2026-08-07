import type { OnboardingTourStep } from "../../../../../../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../../../../../../../components/layout/app-header";

export const CHILD_HOME_TOUR_ID = "child-home";

export const CHILD_HOME_TOUR_TARGETS = {
  kpis: "child-home-tour-kpis",
  sections: "child-home-tour-sections",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const CHILD_HOME_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: CHILD_HOME_TOUR_TARGETS.kpis,
    titleKey: "onboardingTour.childHome.kpisTitle",
    bodyKey: "onboardingTour.childHome.kpisBody",
  },
  {
    targetKey: CHILD_HOME_TOUR_TARGETS.sections,
    titleKey: "onboardingTour.childHome.sectionsTitle",
    bodyKey: "onboardingTour.childHome.sectionsBody",
  },
  {
    targetKey: CHILD_HOME_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.childHome.helpToggleTitle",
    bodyKey: "onboardingTour.childHome.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
