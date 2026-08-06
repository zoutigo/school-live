"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { useTranslation } from "../../i18n/useTranslation";

const TOOLTIP_MARGIN = 12;
const TOOLTIP_MAX_HEIGHT = 160;
const CONNECTOR_THICKNESS = 2;
const CONNECTOR_DOT_SIZE = 8;

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
  const advanceOnTargetPress = !!step.advanceOnTargetPress;
  const finishLabel =
    isLastStep && step.finishLabelKey
      ? t(step.finishLabelKey)
      : t("onboardingTour.common.finish");
  const { height: screenHeight, width: screenWidth } = windowSize;

  const spaceBelow =
    screenHeight - (targetRect.y + targetRect.height) - TOOLTIP_MARGIN;
  const placeBelow =
    spaceBelow >= TOOLTIP_MAX_HEIGHT || spaceBelow >= targetRect.y;

  const tooltipAnchorX = screenWidth / 2;
  const tooltipAnchorY = placeBelow
    ? targetRect.y + targetRect.height + TOOLTIP_MARGIN
    : screenHeight - (screenHeight - targetRect.y + TOOLTIP_MARGIN);
  const targetAnchorX = targetRect.x + targetRect.width / 2;
  const targetAnchorY = placeBelow
    ? targetRect.y + targetRect.height
    : targetRect.y;
  const connectorDx = targetAnchorX - tooltipAnchorX;
  const connectorDy = targetAnchorY - tooltipAnchorY;
  const connectorLength = Math.sqrt(
    connectorDx * connectorDx + connectorDy * connectorDy,
  );
  const connectorAngle =
    (Math.atan2(connectorDy, connectorDx) * 180) / Math.PI;
  const connectorMidX = (tooltipAnchorX + targetAnchorX) / 2;
  const connectorMidY = (tooltipAnchorY + targetAnchorY) / 2;

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

      {/* Steps that don't opt into advanceOnTargetPress are purely
          informative: the only way to move the tour forward is the
          tooltip's own "Suivant" button, so the highlighted control itself
          must not be reachable, or the user could act on the real page
          without going through the tour at all. */}
      {!advanceOnTargetPress ? (
        <div
          className="pointer-events-auto fixed"
          style={{
            top: targetRect.y,
            left: targetRect.x,
            width: targetRect.width,
            height: targetRect.height,
          }}
          data-testid="onboarding-tour-target-block"
        />
      ) : null}

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
        className="pointer-events-none fixed bg-accent-teal"
        style={{
          left: connectorMidX - connectorLength / 2,
          top: connectorMidY - CONNECTOR_THICKNESS / 2,
          width: connectorLength,
          height: CONNECTOR_THICKNESS,
          transform: `rotate(${connectorAngle}deg)`,
        }}
        data-testid="onboarding-tour-connector"
      />
      <div
        className="pointer-events-none fixed rounded-full border-2 border-white bg-accent-teal"
        style={{
          left: targetAnchorX - CONNECTOR_DOT_SIZE / 2,
          top: targetAnchorY - CONNECTOR_DOT_SIZE / 2,
          width: CONNECTOR_DOT_SIZE,
          height: CONNECTOR_DOT_SIZE,
        }}
        data-testid="onboarding-tour-connector-dot"
      />

      <div
        className="pointer-events-auto fixed mx-4 overflow-hidden rounded-card border border-teal-border bg-teal-surface shadow-card"
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
        <div className="flex items-center gap-2 border-b border-teal-border bg-teal-highlight px-4 py-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-accent-teal">
            <HelpCircle className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold text-accent-teal">
            {stepIndex + 1}/{steps.length}
          </span>
          <h3
            className="flex-1 truncate text-sm font-extrabold text-accent-teal-dark"
            data-testid="onboarding-tour-title"
          >
            {t(step.titleKey)}
          </h3>
        </div>
        <div className="grid gap-2 p-4">
          <p
            className="text-justify text-sm text-text-primary"
            data-testid="onboarding-tour-body"
          >
            {t(step.bodyKey)}
          </p>
          {advanceOnTargetPress ? (
            <p
              className="text-xs font-semibold italic text-accent-teal-dark"
              data-testid="onboarding-tour-hint"
            >
              {t("onboardingTour.common.tapTarget")}
            </p>
          ) : (
            <button
              type="button"
              onClick={next}
              className="rounded-card bg-accent-teal px-4 py-2 text-sm font-bold text-white"
              data-testid="onboarding-tour-next"
            >
              {isLastStep ? finishLabel : t("onboardingTour.common.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
