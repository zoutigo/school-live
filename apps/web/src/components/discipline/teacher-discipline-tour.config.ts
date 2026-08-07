import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const TEACHER_DISCIPLINE_TOUR_ID = "teacher-discipline";

export const TEACHER_DISCIPLINE_TOUR_TARGETS = {
  tabs: "teacher-discipline-tour-tabs",
  studentSelect: "teacher-discipline-tour-student-select",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TEACHER_DISCIPLINE_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TEACHER_DISCIPLINE_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.teacherDiscipline.step1Title",
    bodyKey: "onboardingTour.teacherDiscipline.step1Body",
  },
  {
    targetKey: TEACHER_DISCIPLINE_TOUR_TARGETS.studentSelect,
    titleKey: "onboardingTour.teacherDiscipline.step2Title",
    bodyKey: "onboardingTour.teacherDiscipline.step2Body",
  },
  {
    targetKey: TEACHER_DISCIPLINE_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.teacherDiscipline.step3Title",
    bodyKey: "onboardingTour.teacherDiscipline.step3Body",
  },
];
