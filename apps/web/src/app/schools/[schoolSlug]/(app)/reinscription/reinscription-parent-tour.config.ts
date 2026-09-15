import type { OnboardingTourStep } from "../../../../../store/onboarding-tour";

export const REINSCRIPTION_PARENT_TOUR_ID = "reinscription-parent-web";

export const REINSCRIPTION_PARENT_TOUR_TARGETS = {
  wallet: "reinscription-parent-tour-wallet",
  children: "reinscription-parent-tour-children",
  reinscribe: "reinscription-parent-tour-reinscribe",
} as const;

export const REINSCRIPTION_PARENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: REINSCRIPTION_PARENT_TOUR_TARGETS.wallet,
    titleKey: "onboardingTour.reinscriptionParent.walletTitle",
    bodyKey: "onboardingTour.reinscriptionParent.walletBody",
  },
  {
    targetKey: REINSCRIPTION_PARENT_TOUR_TARGETS.children,
    titleKey: "onboardingTour.reinscriptionParent.childrenTitle",
    bodyKey: "onboardingTour.reinscriptionParent.childrenBody",
  },
  {
    targetKey: REINSCRIPTION_PARENT_TOUR_TARGETS.reinscribe,
    titleKey: "onboardingTour.reinscriptionParent.reinscribeTitle",
    bodyKey: "onboardingTour.reinscriptionParent.reinscribeBody",
  },
];
