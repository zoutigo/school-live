import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingTarget } from "./onboarding-target";
import {
  useOnboardingTourStore,
  type OnboardingTourStep,
} from "../../store/onboarding-tour";

const STEPS: OnboardingTourStep[] = [
  { targetKey: "target-a", titleKey: "t1", bodyKey: "b1" },
  { targetKey: "target-b", titleKey: "t2", bodyKey: "b2" },
];

function resetStore() {
  useOnboardingTourStore.setState({
    completedTours: {},
    activeTourId: null,
    activeRole: null,
    steps: [],
    stepIndex: 0,
    targetRect: null,
  });
}

describe("OnboardingTarget", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  it("does not report a rect when no tour is active", () => {
    render(
      <OnboardingTarget id="target-a">
        <span>content</span>
      </OnboardingTarget>,
    );

    expect(useOnboardingTourStore.getState().targetRect).toBeNull();
  });

  it("does not report a rect when it is not the active step's target", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);

    render(
      <OnboardingTarget id="target-b">
        <span>content</span>
      </OnboardingTarget>,
    );

    expect(useOnboardingTourStore.getState().targetRect).toBeNull();
  });

  it("measures and reports its rect when it is the active step's target", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);

    const rect = { x: 5, y: 6, width: 200, height: 40 };
    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        ...rect,
        top: rect.y,
        left: rect.x,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
        toJSON: () => ({}),
      });

    render(
      <OnboardingTarget id="target-a">
        <span>content</span>
      </OnboardingTarget>,
    );

    expect(useOnboardingTourStore.getState().targetRect).toEqual(rect);
    getBoundingClientRectSpy.mockRestore();
  });

  it("ignores a zero-sized measurement", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);

    const getBoundingClientRectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => ({}),
      });

    render(
      <OnboardingTarget id="target-a">
        <span>content</span>
      </OnboardingTarget>,
    );

    expect(useOnboardingTourStore.getState().targetRect).toBeNull();
    getBoundingClientRectSpy.mockRestore();
  });
});
