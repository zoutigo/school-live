"use client";

import { useEffect, useState } from "react";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { useTranslation } from "../../i18n/useTranslation";

const TOOLTIP_MARGIN = 12;
const TOOLTIP_MAX_HEIGHT = 160;

export function OnboardingTourOverlay() {
  const { t } = useTranslation();
  const activeTourId = useOnboardingTourStore((state) => state.activeTourId);
  const steps = useOnboardingTourStore((state) => state.steps);
  const stepIndex = useOnboardingTourStore((state) => state.stepIndex);
  const targetRect = useOnboardingTourStore((state) => state.targetRect);
  const next = useOnboardingTourStore((state) => state.next);

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (!activeTourId || !targetRect) {
    return null;
  }

  const step = steps[stepIndex];
  if (!step) {
    return null;
  }

  const isLastStep = stepIndex >= steps.length - 1;
  const { height: screenHeight } = windowSize;

  const spaceBelow =
    screenHeight - (targetRect.y + targetRect.height) - TOOLTIP_MARGIN;
  const placeBelow =
    spaceBelow >= TOOLTIP_MAX_HEIGHT || spaceBelow >= targetRect.y;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      data-testid="onboarding-tour-overlay"
    >
      <div
        className="pointer-events-auto fixed bg-black/65"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: Math.max(targetRect.y, 0),
        }}
        data-testid="onboarding-tour-mask-top"
      />
      <div
        className="pointer-events-auto fixed bg-black/65"
        style={{
          top: targetRect.y + targetRect.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        data-testid="onboarding-tour-mask-bottom"
      />
      <div
        className="pointer-events-auto fixed bg-black/65"
        style={{
          top: targetRect.y,
          left: 0,
          width: Math.max(targetRect.x, 0),
          height: targetRect.height,
        }}
        data-testid="onboarding-tour-mask-left"
      />
      <div
        className="pointer-events-auto fixed bg-black/65"
        style={{
          top: targetRect.y,
          left: targetRect.x + targetRect.width,
          right: 0,
          height: targetRect.height,
        }}
        data-testid="onboarding-tour-mask-right"
      />

      <div
        className="pointer-events-none fixed rounded-card border-2 border-accent-teal"
        style={{
          top: targetRect.y - 4,
          left: targetRect.x - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
        data-testid="onboarding-tour-highlight"
      />

      <div
        className="pointer-events-auto fixed mx-4 grid gap-1.5 rounded-card border border-border bg-surface p-4 shadow-card"
        style={
          placeBelow
            ? {
                top: targetRect.y + targetRect.height + TOOLTIP_MARGIN,
                left: 16,
                right: 16,
              }
            : {
                bottom: screenHeight - targetRect.y + TOOLTIP_MARGIN,
                left: 16,
                right: 16,
              }
        }
        data-testid="onboarding-tour-tooltip"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {stepIndex + 1} / {steps.length}
        </span>
        <h3
          className="font-heading text-base font-bold text-text-primary"
          data-testid="onboarding-tour-title"
        >
          {t(step.titleKey)}
        </h3>
        <p
          className="text-sm text-text-secondary"
          data-testid="onboarding-tour-body"
        >
          {t(step.bodyKey)}
        </p>
        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={next}
            className="px-2 py-2 text-sm font-semibold text-text-secondary"
            data-testid="onboarding-tour-skip"
          >
            {t("onboardingTour.common.skip")}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-card bg-primary px-4 py-2 text-sm font-bold text-white"
            data-testid="onboarding-tour-next"
          >
            {isLastStep
              ? t("onboardingTour.common.finish")
              : t("onboardingTour.common.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
