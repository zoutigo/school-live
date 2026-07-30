import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const TIMETABLE_TOUR_ID = "child-timetable";

export const TIMETABLE_TOUR_TARGETS = {
  controls: "timetable-tour-controls",
  dayList: "timetable-tour-day-list",
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
];
