import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";
import { TIMETABLE_TOUR_TARGETS } from "./timetable-tour.config";

export const TEACHER_CLASS_AGENDA_TOUR_ID = "teacher-class-agenda";

// `controls`/`dayList` are the same physical targets the child/parent pilot
// tour highlights inside `TimetableViews` (shared component, hardcoded
// target ids) — reused as-is rather than duplicated, since this page renders
// the very same component instance.
export const TEACHER_CLASS_AGENDA_TOUR_TARGETS = {
  tabs: "teacher-class-agenda-tour-tabs",
  controls: TIMETABLE_TOUR_TARGETS.controls,
  dayList: TIMETABLE_TOUR_TARGETS.dayList,
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TEACHER_CLASS_AGENDA_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TEACHER_CLASS_AGENDA_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.teacherClassAgenda.step1Title",
    bodyKey: "onboardingTour.teacherClassAgenda.step1Body",
  },
  {
    targetKey: TEACHER_CLASS_AGENDA_TOUR_TARGETS.controls,
    titleKey: "onboardingTour.teacherClassAgenda.step2Title",
    bodyKey: "onboardingTour.teacherClassAgenda.step2Body",
  },
  {
    targetKey: TEACHER_CLASS_AGENDA_TOUR_TARGETS.dayList,
    titleKey: "onboardingTour.teacherClassAgenda.step3Title",
    bodyKey: "onboardingTour.teacherClassAgenda.step3Body",
  },
  {
    targetKey: TEACHER_CLASS_AGENDA_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.teacherClassAgenda.step4Title",
    bodyKey: "onboardingTour.teacherClassAgenda.step4Body",
  },
];
