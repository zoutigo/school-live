import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_TOUR_STORAGE_KEY,
  buildTourCompletionKey,
  useOnboardingTourStore,
  type OnboardingTourStep,
} from "./onboarding-tour";

const STEPS: OnboardingTourStep[] = [
  { targetKey: "a", titleKey: "t1", bodyKey: "b1" },
  { targetKey: "b", titleKey: "t2", bodyKey: "b2" },
  { targetKey: "c", titleKey: "t3", bodyKey: "b3" },
];

describe("onboarding-tour store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
  });

  it("has no completed tours by default", () => {
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(false);
  });

  it("starts a tour with the given steps and resets step index/rect", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    const state = useOnboardingTourStore.getState();
    expect(state.activeTourId).toBe("agenda");
    expect(state.activeRole).toBe("parent");
    expect(state.stepIndex).toBe(0);
    expect(state.steps).toHaveLength(3);
    expect(state.targetRect).toBeNull();
  });

  it("does not start a tour with an empty step list", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", []);
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("caps steps at ONBOARDING_TOUR_MAX_STEPS (5)", () => {
    const sixSteps: OnboardingTourStep[] = Array.from(
      { length: 6 },
      (_, i) => ({
        targetKey: `t${i}`,
        titleKey: `title${i}`,
        bodyKey: `body${i}`,
      }),
    );
    useOnboardingTourStore.getState().startTour("agenda", "parent", sixSteps);
    expect(useOnboardingTourStore.getState().steps).toHaveLength(5);
  });

  it("advances to the next step and clears the previous target rect", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 1, y: 2, width: 3, height: 4 });
    useOnboardingTourStore.getState().next();
    const state = useOnboardingTourStore.getState();
    expect(state.stepIndex).toBe(1);
    expect(state.targetRect).toBeNull();
  });

  it("finishes (marks completed) when calling next on the last step", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore.getState().next();
    const state = useOnboardingTourStore.getState();
    expect(state.activeTourId).toBeNull();
    expect(state.isCompleted("parent", "agenda")).toBe(true);
  });

  it("keys completion by role+tourId so other roles/tours are unaffected", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().finish();
    expect(
      useOnboardingTourStore.getState().isCompleted("teacher", "agenda"),
    ).toBe(false);
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "discipline"),
    ).toBe(false);
  });

  it("buildTourCompletionKey formats role:tourId", () => {
    expect(buildTourCompletionKey("parent", "agenda")).toBe("parent:agenda");
  });

  it("persists only completedTours (not ephemeral session state) to localStorage", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().finish();

    const stored = window.localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.state).toEqual({
      completedTours: { "parent:agenda": true },
    });
  });

  it("resetAllCompleted clears every completed tour regardless of role", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().finish();
    useOnboardingTourStore.getState().startTour("discipline", "teacher", STEPS);
    useOnboardingTourStore.getState().finish();

    useOnboardingTourStore.getState().resetAllCompleted();

    expect(useOnboardingTourStore.getState().completedTours).toEqual({});
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(false);
    expect(
      useOnboardingTourStore.getState().isCompleted("teacher", "discipline"),
    ).toBe(false);
  });

  it("restores persisted completedTours on rehydration", async () => {
    window.localStorage.setItem(
      ONBOARDING_TOUR_STORAGE_KEY,
      JSON.stringify({
        state: { completedTours: { "parent:agenda": true } },
        version: 0,
      }),
    );

    await useOnboardingTourStore.persist.rehydrate();

    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(true);
  });
});
