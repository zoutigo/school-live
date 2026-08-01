import type { OnboardingTourStep } from "../../store/onboarding-tour";

export const SITE_CONTENT_TOUR_ID = "site-content";

export const SITE_CONTENT_TOUR_TARGETS = {
  tabs: "site-content-tour-tabs",
  selectors: "site-content-tour-selectors",
  newDraft: "site-content-tour-new-draft",
  helpToggle: "site-content-tour-help-toggle",
} as const;

export const SITE_CONTENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: SITE_CONTENT_TOUR_TARGETS.tabs,
    titleKey: "onboardingTour.siteContent.tabsTitle",
    bodyKey: "onboardingTour.siteContent.tabsBody",
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
