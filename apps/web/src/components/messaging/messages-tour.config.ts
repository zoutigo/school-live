import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../layout/app-header";

export const MESSAGES_TOUR_ID = "messages";

export const MESSAGES_TOUR_TARGETS = {
  folders: "messages-tour-folders",
  toolbar: "messages-tour-toolbar",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const MESSAGES_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: MESSAGES_TOUR_TARGETS.folders,
    titleKey: "onboardingTour.messages.step1Title",
    bodyKey: "onboardingTour.messages.step1Body",
  },
  {
    targetKey: MESSAGES_TOUR_TARGETS.toolbar,
    titleKey: "onboardingTour.messages.step2Title",
    bodyKey: "onboardingTour.messages.step2Body",
  },
  {
    targetKey: MESSAGES_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.messages.step3Title",
    bodyKey: "onboardingTour.messages.step3Body",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
