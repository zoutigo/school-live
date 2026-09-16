import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const TEACHER_ATTENDANCE_TOUR_ID = "teacher-attendance";

export const TEACHER_ATTENDANCE_TOUR_TARGETS = {
  dateNav: "teacher-attendance-tour-date-nav",
  rosterList: "teacher-attendance-tour-roster-list",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const TEACHER_ATTENDANCE_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: TEACHER_ATTENDANCE_TOUR_TARGETS.dateNav,
    titleKey: "onboardingTour.teacherAttendance.step1Title",
    bodyKey: "onboardingTour.teacherAttendance.step1Body",
  },
  {
    targetKey: TEACHER_ATTENDANCE_TOUR_TARGETS.rosterList,
    titleKey: "onboardingTour.teacherAttendance.step2Title",
    bodyKey: "onboardingTour.teacherAttendance.step2Body",
  },
  {
    targetKey: TEACHER_ATTENDANCE_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.teacherAttendance.step3Title",
    bodyKey: "onboardingTour.teacherAttendance.step3Body",
  },
];
