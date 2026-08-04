import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const HEALTH_SCHOOL_TOUR_ID = "health-school";

export const HEALTH_SCHOOL_TOUR_TARGETS = {
  tabs: "health-school-tour-tabs",
  search: "health-school-tour-search",
  studentFab: "health-school-tour-student-fab",
} as const;

export const HEALTH_SCHOOL_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.healthSchool.tabsTitle",
    bodyKey: "onboardingTour.healthSchool.tabsBody",
  },
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.search,
    titleKey: "onboardingTour.healthSchool.searchTitle",
    bodyKey: "onboardingTour.healthSchool.searchBody",
  },
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.studentFab,
    titleKey: "onboardingTour.healthSchool.studentFabTitle",
    bodyKey: "onboardingTour.healthSchool.studentFabBody",
  },
];
