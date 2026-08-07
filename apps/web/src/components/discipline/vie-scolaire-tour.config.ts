import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const VIE_SCOLAIRE_TOUR_ID = "vie-scolaire";

export const VIE_SCOLAIRE_TOUR_TARGETS = {
  tabs: "vie-scolaire-tour-tabs",
  kpis: "vie-scolaire-tour-kpis",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const VIE_SCOLAIRE_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: VIE_SCOLAIRE_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.vieScolaire.tabsTitle",
    bodyKey: "onboardingTour.vieScolaire.tabsBody",
  },
  {
    targetKey: VIE_SCOLAIRE_TOUR_TARGETS.kpis,
    titleKey: "onboardingTour.vieScolaire.kpisTitle",
    bodyKey: "onboardingTour.vieScolaire.kpisBody",
  },
  {
    targetKey: VIE_SCOLAIRE_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.vieScolaire.helpToggleTitle",
    bodyKey: "onboardingTour.vieScolaire.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
