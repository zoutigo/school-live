import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const HEALTH_PARENT_TOUR_ID = "health-parent";

export const HEALTH_PARENT_TOUR_TARGETS = {
  tabs: "health-parent-tour-tabs",
  conditionForm: "health-parent-tour-condition-form",
  reportForm: "health-parent-tour-report-form",
} as const;

export const HEALTH_PARENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.healthParent.tabsTitle",
    bodyKey: "onboardingTour.healthParent.tabsBody",
  },
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.conditionForm,
    titleKey: "onboardingTour.healthParent.conditionFormTitle",
    bodyKey: "onboardingTour.healthParent.conditionFormBody",
  },
  {
    targetKey: HEALTH_PARENT_TOUR_TARGETS.reportForm,
    titleKey: "onboardingTour.healthParent.reportFormTitle",
    bodyKey: "onboardingTour.healthParent.reportFormBody",
  },
];
