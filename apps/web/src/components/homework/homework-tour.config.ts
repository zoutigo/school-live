import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const HOMEWORK_TOUR_ID = "homework";

export const HOMEWORK_TOUR_TARGETS = {
  tabs: "homework-tour-tabs",
  row: "homework-tour-row",
  markDone: "homework-tour-mark-done",
  helpToggle: "homework-tour-help-toggle",
} as const;

// Web deliberately targets the row-table container (not a single <tr>, which
// can't be wrapped by the div-based OnboardingTarget) for the "row" step.
// The always-on fallback item (see HOMEWORK_TOUR_FALLBACK_ID in page.tsx)
// guarantees exactly one row is rendered while this step is active, so the
// highlight stays tight around it.
export const HOMEWORK_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: HOMEWORK_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.homework.tabsTitle",
    bodyKey: "onboardingTour.homework.tabsBody",
  },
  {
    targetKey: HOMEWORK_TOUR_TARGETS.row,
    titleKey: "onboardingTour.homework.rowTitle",
    bodyKey: "onboardingTour.homework.rowBody",
    advanceOnTargetPress: true,
  },
  {
    targetKey: HOMEWORK_TOUR_TARGETS.markDone,
    titleKey: "onboardingTour.homework.markDoneTitle",
    bodyKey: "onboardingTour.homework.markDoneBody",
  },
  {
    targetKey: HOMEWORK_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.homework.helpToggleTitle",
    bodyKey: "onboardingTour.homework.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
