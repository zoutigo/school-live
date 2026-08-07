import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const TIMETABLE_TOUR_ID = "child-timetable";

export const TIMETABLE_TOUR_TARGETS = {
  controls: "timetable-tour-controls",
  dayList: "timetable-tour-day-list",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

// Web deliberately has fewer steps than mobile: the desktop layout merges
// view-mode switching and period navigation into a single control block per
// mode (see timetable-views.tsx), so there is no separate "nav row" to
// highlight on its own the way there is on mobile.
export const TIMETABLE_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TIMETABLE_TOUR_TARGETS.controls,
    titleKey: "onboardingTour.childTimetable.controlsTitle",
    bodyKey: "onboardingTour.childTimetable.controlsBody",
  },
  {
    targetKey: TIMETABLE_TOUR_TARGETS.dayList,
    titleKey: "onboardingTour.childTimetable.dayListTitle",
    bodyKey: "onboardingTour.childTimetable.dayListBody",
  },
  {
    targetKey: TIMETABLE_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.childTimetable.helpBlockTitle",
    bodyKey: "onboardingTour.childTimetable.helpBlockBody",
  },
];
