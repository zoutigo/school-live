import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const FEED_FILTERS_TOUR_ID = "feed-filters";

export const FEED_FILTERS_TOUR_TARGETS = {
  filterToggle: "feed-filters-tour-filter-toggle",
  typeChips: "feed-filters-tour-type-chips",
  apply: "feed-filters-tour-apply",
  helpToggle: "feed-filters-tour-help-toggle",
} as const;

export const FEED_FILTERS_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: FEED_FILTERS_TOUR_TARGETS.filterToggle,
    titleKey: "onboardingTour.feedFilters.step1Title",
    bodyKey: "onboardingTour.feedFilters.step1Body",
    advanceOnTargetPress: true,
  },
  {
    targetKey: FEED_FILTERS_TOUR_TARGETS.typeChips,
    titleKey: "onboardingTour.feedFilters.step2Title",
    bodyKey: "onboardingTour.feedFilters.step2Body",
  },
  {
    targetKey: FEED_FILTERS_TOUR_TARGETS.apply,
    titleKey: "onboardingTour.feedFilters.step3Title",
    bodyKey: "onboardingTour.feedFilters.step3Body",
    advanceOnTargetPress: true,
  },
  {
    targetKey: FEED_FILTERS_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.feedFilters.step4Title",
    bodyKey: "onboardingTour.feedFilters.step4Body",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
