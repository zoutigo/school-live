import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const DISCIPLINE_SELF_TOUR_ID = "discipline-self";

export const DISCIPLINE_SELF_TOUR_TARGETS = {
  tabs: "discipline-self-tour-tabs",
  kpis: "discipline-self-tour-kpis",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const DISCIPLINE_SELF_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: DISCIPLINE_SELF_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.disciplineSelf.tabsTitle",
    bodyKey: "onboardingTour.disciplineSelf.tabsBody",
  },
  {
    targetKey: DISCIPLINE_SELF_TOUR_TARGETS.kpis,
    titleKey: "onboardingTour.disciplineSelf.kpisTitle",
    bodyKey: "onboardingTour.disciplineSelf.kpisBody",
  },
  {
    targetKey: DISCIPLINE_SELF_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.disciplineSelf.helpToggleTitle",
    bodyKey: "onboardingTour.disciplineSelf.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
