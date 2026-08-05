import type { OnboardingTourStep } from "../../../../../store/onboarding-tour";

export const FINANCE_PARENT_TOUR_ID = "finance-parent-reinscription";

export const FINANCE_PARENT_TOUR_TARGETS = {
  wallet: "finance-parent-tour-wallet",
  children: "finance-parent-tour-children",
  reinscribe: "finance-parent-tour-reinscribe",
} as const;

export const FINANCE_PARENT_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: FINANCE_PARENT_TOUR_TARGETS.wallet,
    titleKey: "onboardingTour.financeParent.walletTitle",
    bodyKey: "onboardingTour.financeParent.walletBody",
  },
  {
    targetKey: FINANCE_PARENT_TOUR_TARGETS.children,
    titleKey: "onboardingTour.financeParent.childrenTitle",
    bodyKey: "onboardingTour.financeParent.childrenBody",
  },
  {
    targetKey: FINANCE_PARENT_TOUR_TARGETS.reinscribe,
    titleKey: "onboardingTour.financeParent.reinscribeTitle",
    bodyKey: "onboardingTour.financeParent.reinscribeBody",
  },
];
