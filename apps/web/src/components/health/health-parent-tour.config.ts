import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const HEALTH_PARENT_TOUR_ID = "health-parent";

export const HEALTH_PARENT_TOUR_TARGETS = {
  tabs: "health-parent-tour-tabs",
  search: "health-parent-tour-search",
  add: "health-parent-tour-add",
} as const;

export const HEALTH_PARENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.healthParent.tabsTitle",
    bodyKey: "onboardingTour.healthParent.tabsBody",
  },
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.search,
    titleKey: "onboardingTour.healthParent.searchTitle",
    bodyKey: "onboardingTour.healthParent.searchBody",
  },
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.add,
    titleKey: "onboardingTour.healthParent.fabTitle",
    bodyKey: "onboardingTour.healthParent.fabBody",
  },
];
