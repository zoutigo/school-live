import type { OnboardingTourStep } from "../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../../components/layout/app-header";

export const SITE_CONTENT_TOUR_ID = "site-content";

export const SITE_CONTENT_TOUR_TARGETS = {
  tabs: "site-content-tour-tabs",
  contactEdit: "site-content-tour-contact-edit",
  selectors: "site-content-tour-selectors",
  newDraft: "site-content-tour-new-draft",
  helpToggle: APP_HEADER_MENU_TOUR_TARGET,
} as const;

export const SITE_CONTENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.siteContent.tabsTitle",
    bodyKey: "onboardingTour.siteContent.tabsBody",
  },
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.contactEdit,
    titleKey: "onboardingTour.siteContent.contactEditTitle",
    bodyKey: "onboardingTour.siteContent.contactEditBody",
  },
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.selectors,
    titleKey: "onboardingTour.siteContent.selectorsTitle",
    bodyKey: "onboardingTour.siteContent.selectorsBody",
  },
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.newDraft,
    titleKey: "onboardingTour.siteContent.newDraftTitle",
    bodyKey: "onboardingTour.siteContent.newDraftBody",
  },
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.helpToggle,
    titleKey: "onboardingTour.siteContent.helpToggleTitle",
    bodyKey: "onboardingTour.siteContent.helpToggleBody",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
