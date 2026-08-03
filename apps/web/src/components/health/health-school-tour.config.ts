import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const HEALTH_SCHOOL_TOUR_ID = "health-school";

export const HEALTH_SCHOOL_TOUR_TARGETS = {
  search: "health-school-tour-search",
  urgencyBanner: "health-school-tour-urgency-banner",
  careEventForm: "health-school-tour-care-event-form",
} as const;

export const HEALTH_SCHOOL_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.search,
    titleKey: "onboardingTour.healthSchool.searchTitle",
    bodyKey: "onboardingTour.healthSchool.searchBody",
  },
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.urgencyBanner,
    titleKey: "onboardingTour.healthSchool.urgencyBannerTitle",
    bodyKey: "onboardingTour.healthSchool.urgencyBannerBody",
  },
  {
    targetKey: HEALTH_SCHOOL_TOUR_TARGETS.careEventForm,
    titleKey: "onboardingTour.healthSchool.careEventFormTitle",
    bodyKey: "onboardingTour.healthSchool.careEventFormBody",
  },
];
