import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const TEACHER_NOTES_TOUR_ID = "teacher-notes";

export const TEACHER_NOTES_TOUR_TARGETS = {
  tabs: "teacher-notes-tour-tabs",
  filterToggle: "teacher-notes-tour-filter-toggle",
  create: "teacher-notes-tour-create",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TEACHER_NOTES_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TEACHER_NOTES_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.teacherNotes.step1Title",
    bodyKey: "onboardingTour.teacherNotes.step1Body",
  },
  {
    targetKey: TEACHER_NOTES_TOUR_TARGETS.filterToggle,
    titleKey: "onboardingTour.teacherNotes.step2Title",
    bodyKey: "onboardingTour.teacherNotes.step2Body",
  },
  {
    targetKey: TEACHER_NOTES_TOUR_TARGETS.create,
    titleKey: "onboardingTour.teacherNotes.step3Title",
    bodyKey: "onboardingTour.teacherNotes.step3Body",
  },
  {
    targetKey: TEACHER_NOTES_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.teacherNotes.step4Title",
    bodyKey: "onboardingTour.teacherNotes.step4Body",
  },
];
