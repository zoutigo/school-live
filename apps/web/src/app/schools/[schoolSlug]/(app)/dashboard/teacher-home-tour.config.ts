import type { OnboardingTourStep } from "../../../../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../../../../../components/layout/app-header";

export const TEACHER_HOME_TOUR_ID = "teacher-home";

export const TEACHER_HOME_TOUR_TARGETS = {
  classesGrid: "teacher-home-tour-classes-grid",
  evalsLink: "teacher-home-tour-evals-link",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TEACHER_HOME_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TEACHER_HOME_TOUR_TARGETS.classesGrid,
    titleKey: "onboardingTour.teacherHome.step1Title",
    bodyKey: "onboardingTour.teacherHome.step1Body",
  },
  {
    targetKey: TEACHER_HOME_TOUR_TARGETS.evalsLink,
    titleKey: "onboardingTour.teacherHome.step2Title",
    bodyKey: "onboardingTour.teacherHome.step2Body",
  },
  {
    targetKey: TEACHER_HOME_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.teacherHome.step3Title",
    bodyKey: "onboardingTour.teacherHome.step3Body",
  },
];
