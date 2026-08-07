import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const SCHOOL_SETTINGS_TOUR_ID = "school-settings";

export const SCHOOL_SETTINGS_TOUR_TARGETS = {
  levelsTab: "school-settings-tour-levels-tab",
  firstRow: "school-settings-tour-first-row",
} as const;

export const SCHOOL_SETTINGS_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: SCHOOL_SETTINGS_TOUR_TARGETS.levelsTab,
    titleKey: "onboardingTour.schoolSettings.step1Title",
    bodyKey: "onboardingTour.schoolSettings.step1Body",
  },
  {
    targetKey: SCHOOL_SETTINGS_TOUR_TARGETS.firstRow,
    titleKey: "onboardingTour.schoolSettings.step2Title",
    bodyKey: "onboardingTour.schoolSettings.step2Body",
  },
];
