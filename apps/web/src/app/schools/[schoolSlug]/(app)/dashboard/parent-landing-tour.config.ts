import type { OnboardingTourStep } from "../../../../../store/onboarding-tour";
import { APP_HEADER_MENU_TOUR_TARGET } from "../../../../../components/layout/app-header";
import {
  SIDEBAR_ACCOUNT_TOUR_TARGET,
  SIDEBAR_CHILDREN_TOUR_TARGET,
  SIDEBAR_MESSAGING_TOUR_TARGET,
} from "../../../../../components/layout/app-sidebar";

export const PARENT_LANDING_TOUR_ID = "parent-landing";

// Toutes les cibles vivent dans le chrome global (AppHeader/AppSidebar),
// monté par AppShell autour de cette page — aucune n'est propre au contenu
// du dashboard lui-même.
export const PARENT_LANDING_TOUR_TARGETS = {
  menu: APP_HEADER_MENU_TOUR_TARGET,
  messaging: SIDEBAR_MESSAGING_TOUR_TARGET,
  children: SIDEBAR_CHILDREN_TOUR_TARGET,
  account: SIDEBAR_ACCOUNT_TOUR_TARGET,
  helpButton: "dashboard-parent-help-target",
} as const;

// Étape 1 (menu) utilise advanceOnTargetPress : sur mobile, la cible réelle
// vit dans le menu latéral qui ne se monte que si l'utilisateur ouvre le
// tiroir (AppSidebar mobile n'est monté que si `mobileOpen`) — sans cette
// action réelle, les étapes suivantes (messagerie/enfants/compte, qui
// vivent dans ce même menu) ne se monteraient jamais. Sur desktop, le menu
// est déjà visible en permanence : cliquer dessus est un no-op harmless qui
// fait juste avancer le tour (voir le onClick câblé sur la cible dans
// app-header.tsx / app-shell.tsx).
// Les étapes suivantes restent purement informatives : cliquer sur la
// cible réelle (aller en messagerie, ouvrir un enfant, aller au compte)
// navigue hors du dashboard et empêcherait les étapes suivantes de se
// monter.
export const PARENT_LANDING_TOUR_STEPS: OnboardingTourStep[] = [
  {
    targetKey: PARENT_LANDING_TOUR_TARGETS.menu,
    titleKey: "onboardingTour.parentLanding.step1Title",
    bodyKey: "onboardingTour.parentLanding.step1Body",
    advanceOnTargetPress: true,
  },
  {
    targetKey: PARENT_LANDING_TOUR_TARGETS.messaging,
    titleKey: "onboardingTour.parentLanding.step2Title",
    bodyKey: "onboardingTour.parentLanding.step2Body",
  },
  {
    targetKey: PARENT_LANDING_TOUR_TARGETS.children,
    titleKey: "onboardingTour.parentLanding.step3Title",
    bodyKey: "onboardingTour.parentLanding.step3Body",
  },
  {
    targetKey: PARENT_LANDING_TOUR_TARGETS.account,
    titleKey: "onboardingTour.parentLanding.step4Title",
    bodyKey: "onboardingTour.parentLanding.step4Body",
  },
  {
    targetKey: PARENT_LANDING_TOUR_TARGETS.helpButton,
    titleKey: "onboardingTour.parentLanding.step5Title",
    bodyKey: "onboardingTour.parentLanding.step5Body",
    finishLabelKey: "onboardingTour.common.gotIt",
  },
];
