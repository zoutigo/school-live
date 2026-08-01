import { describe, expect, it } from "vitest";
import {
  FEED_FILTERS_TOUR_ID,
  FEED_FILTERS_TOUR_STEPS,
  FEED_FILTERS_TOUR_TARGETS,
} from "./feed-filters-tour.config";

describe("feed-filters-tour.config", () => {
  it("has a stable tour id", () => {
    expect(FEED_FILTERS_TOUR_ID).toBe("feed-filters");
  });

  it("exposes at most 5 steps (onboarding store constraint)", () => {
    expect(FEED_FILTERS_TOUR_STEPS.length).toBeLessThanOrEqual(5);
    expect(FEED_FILTERS_TOUR_STEPS).toHaveLength(4);
  });

  it("targets in order: filter toggle, type chips, apply, help", () => {
    expect(FEED_FILTERS_TOUR_STEPS.map((step) => step.targetKey)).toEqual([
      FEED_FILTERS_TOUR_TARGETS.filterToggle,
      FEED_FILTERS_TOUR_TARGETS.typeChips,
      FEED_FILTERS_TOUR_TARGETS.apply,
      FEED_FILTERS_TOUR_TARGETS.helpToggle,
    ]);
  });

  it("advances on click for the filter toggle and apply steps, not the chips step", () => {
    const [filterToggleStep, typeChipsStep, applyStep] =
      FEED_FILTERS_TOUR_STEPS;
    expect(filterToggleStep.advanceOnTargetPress).toBe(true);
    expect(typeChipsStep.advanceOnTargetPress).toBeUndefined();
    expect(applyStep.advanceOnTargetPress).toBe(true);
  });

  it("ends on the help step with a dedicated finish label", () => {
    const lastStep =
      FEED_FILTERS_TOUR_STEPS[FEED_FILTERS_TOUR_STEPS.length - 1];
    expect(lastStep.targetKey).toBe(FEED_FILTERS_TOUR_TARGETS.helpToggle);
    expect(lastStep.finishLabelKey).toBe("onboardingTour.common.gotIt");
  });
});
