"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ONBOARDING_TOUR_STORAGE_KEY = "scolive-onboarding-tour";
export const ONBOARDING_TOUR_MAX_STEPS = 5;

export type OnboardingTourStep = {
  targetKey: string;
  titleKey: string;
  bodyKey: string;
  /**
   * When true, this step advances by the user clicking the highlighted
   * target itself (its normal action still fires) instead of the
   * "Suivant" button in the tooltip.
   */
  advanceOnTargetPress?: boolean;
  /** Overrides the default "Terminer" label when this is the last step. */
  finishLabelKey?: string;
};

export type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function buildTourCompletionKey(role: string, tourId: string): string {
  return `${role}:${tourId}`;
}

type OnboardingTourState = {
  completedTours: Record<string, boolean>;
  activeTourId: string | null;
  activeRole: string | null;
  steps: OnboardingTourStep[];
  stepIndex: number;
  targetRect: TargetRect | null;

  isCompleted: (role: string, tourId: string) => boolean;
  startTour: (
    tourId: string,
    role: string,
    steps: OnboardingTourStep[],
  ) => void;
  next: () => void;
  finish: () => void;
  setTargetRect: (rect: TargetRect | null) => void;
  advanceIfTarget: (targetKey: string) => void;
  resetAllCompleted: () => void;
};

export const useOnboardingTourStore = create<OnboardingTourState>()(
  persist(
    (set, get) => ({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,

      isCompleted: (role, tourId) =>
        !!get().completedTours[buildTourCompletionKey(role, tourId)],

      startTour: (tourId, role, steps) => {
        if (steps.length === 0) return;
        set({
          activeTourId: tourId,
          activeRole: role,
          steps: steps.slice(0, ONBOARDING_TOUR_MAX_STEPS),
          stepIndex: 0,
          targetRect: null,
        });
      },

      next: () => {
        const { stepIndex, steps } = get();
        if (stepIndex >= steps.length - 1) {
          get().finish();
          return;
        }
        set({ stepIndex: stepIndex + 1, targetRect: null });
      },

      finish: () => {
        const { activeTourId, activeRole, completedTours } = get();
        if (!activeTourId || !activeRole) {
          set({
            activeTourId: null,
            activeRole: null,
            steps: [],
            stepIndex: 0,
            targetRect: null,
          });
          return;
        }
        set({
          completedTours: {
            ...completedTours,
            [buildTourCompletionKey(activeRole, activeTourId)]: true,
          },
          activeTourId: null,
          activeRole: null,
          steps: [],
          stepIndex: 0,
          targetRect: null,
        });
      },

      setTargetRect: (rect) => set({ targetRect: rect }),

      advanceIfTarget: (targetKey) => {
        const { activeTourId, steps, stepIndex } = get();
        if (!activeTourId) return;
        const step = steps[stepIndex];
        if (
          !step ||
          step.targetKey !== targetKey ||
          !step.advanceOnTargetPress
        ) {
          return;
        }
        get().next();
      },

      resetAllCompleted: () => set({ completedTours: {} }),
    }),
    {
      name: ONBOARDING_TOUR_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ completedTours: state.completedTours }),
    },
  ),
);
