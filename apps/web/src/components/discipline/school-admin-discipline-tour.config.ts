import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const SCHOOL_ADMIN_DISCIPLINE_TOUR_ID = "school-admin-discipline";

export const SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS = {
  classSelect: "school-admin-discipline-tour-class-select",
  tabs: "school-admin-discipline-tour-tabs",
  studentSelect: "school-admin-discipline-tour-student-select",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const SCHOOL_ADMIN_DISCIPLINE_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS.classSelect,
    titleKey: "onboardingTour.schoolAdminDiscipline.classSelectTitle",
    bodyKey: "onboardingTour.schoolAdminDiscipline.classSelectBody",
  },
  {
    targetKey: SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.schoolAdminDiscipline.tabsTitle",
    bodyKey: "onboardingTour.schoolAdminDiscipline.tabsBody",
  },
  {
    targetKey: SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS.studentSelect,
    titleKey: "onboardingTour.schoolAdminDiscipline.studentSelectTitle",
    bodyKey: "onboardingTour.schoolAdminDiscipline.studentSelectBody",
  },
  {
    targetKey: SCHOOL_ADMIN_DISCIPLINE_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.schoolAdminDiscipline.helpToggleTitle",
    bodyKey: "onboardingTour.schoolAdminDiscipline.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
