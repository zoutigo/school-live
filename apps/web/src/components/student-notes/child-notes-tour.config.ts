import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const CHILD_NOTES_TOUR_ID = "child-notes";

export const CHILD_NOTES_TOUR_TARGETS = {
  tabs: "child-notes-tour-tabs",
  terms: "child-notes-tour-terms",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const CHILD_NOTES_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: CHILD_NOTES_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.childNotes.tabsTitle",
    bodyKey: "onboardingTour.childNotes.tabsBody",
  },
  {
    targetKey: CHILD_NOTES_TOUR_TARGETS.terms,
    titleKey: "onboardingTour.childNotes.termsTitle",
    bodyKey: "onboardingTour.childNotes.termsBody",
  },
  {
    targetKey: CHILD_NOTES_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.childNotes.helpToggleTitle",
    bodyKey: "onboardingTour.childNotes.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
