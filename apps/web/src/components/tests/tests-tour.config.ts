import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const TESTS_TOUR_ID = "tests";
export const TESTS_TOUR_ROLE = "tester";

export const TESTS_TOUR_TARGETS = {
  tabs: "tests-tour-tabs",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TESTS_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TESTS_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.tests.step1Title",
    bodyKey: "onboardingTour.tests.step1Body",
  },
  {
    targetKey: TESTS_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.tests.step3Title",
    bodyKey: "onboardingTour.tests.step3Body",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
