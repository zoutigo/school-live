import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const RESOURCES_TOUR_ID = "resources";

export const RESOURCES_TOUR_TARGETS = {
  tabs: "resources-tour-tabs",
  searchFilter: "resources-tour-search-filter",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const RESOURCES_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: RESOURCES_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.resources.step1Title",
    bodyKey: "onboardingTour.resources.step1Body",
  },
  {
    targetKey: RESOURCES_TOUR_TARGETS.searchFilter,
    titleKey: "onboardingTour.resources.step2Title",
    bodyKey: "onboardingTour.resources.step2Body",
  },
  {
    targetKey: RESOURCES_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.resources.step3Title",
    bodyKey: "onboardingTour.resources.step3Body",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
