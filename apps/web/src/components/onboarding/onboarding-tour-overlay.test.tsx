import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { OnboardingTourOverlay } from "./onboarding-tour-overlay";
import {
  useOnboardingTourStore,
  type OnboardingTourStep,
} from "../../store/onboarding-tour";

const STEPS: OnboardingTourStep[] = [
  {
    targetKey: "a",
    titleKey: "onboardingTour.childTimetable.controlsTitle",
    bodyKey: "onboardingTour.childTimetable.controlsBody",
  },
  {
    targetKey: "b",
    titleKey: "onboardingTour.childTimetable.dayListTitle",
    bodyKey: "onboardingTour.childTimetable.dayListBody",
  },
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

describe("OnboardingTourOverlay", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  it("renders nothing when there is no active tour", () => {
    render(<OnboardingTourOverlay />);
    expect(screen.queryByTestId("onboarding-tour-overlay")).toBeNull();
  });

  it("renders nothing while the target has not been measured yet", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);

    render(<OnboardingTourOverlay />);

    expect(screen.queryByTestId("onboarding-tour-overlay")).toBeNull();
  });

  it("renders the tooltip with the current step's title/body once the target is measured", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.getByTestId("onboarding-tour-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-tour-title")).toHaveTextContent(
      "Changez de vue et naviguez",
    );
  });

  it("shows Suivant on non-final steps and advances on click", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.getByTestId("onboarding-tour-next")).toHaveTextContent(
      "Suivant",
    );

    fireEvent.click(screen.getByTestId("onboarding-tour-next"));

    expect(useOnboardingTourStore.getState().stepIndex).toBe(1);
    expect(screen.queryByTestId("onboarding-tour-overlay")).toBeNull();
  });

  it("shows Terminer on the final step and completes the tour on click", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.getByTestId("onboarding-tour-next")).toHaveTextContent(
      "Terminer",
    );

    fireEvent.click(screen.getByTestId("onboarding-tour-next"));

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(true);
  });

  it("does not render a Passer/skip button on a regular step", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.queryByTestId("onboarding-tour-skip")).toBeNull();
  });

  it("does not render a Passer/skip button on the final step", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.queryByTestId("onboarding-tour-skip")).toBeNull();
  });

  it("hides Suivant and shows a click hint when the step opts into advanceOnTargetPress", () => {
    const stepsWithPress: OnboardingTourStep[] = [
      {
        targetKey: "a",
        titleKey: "onboardingTour.childTimetable.controlsTitle",
        bodyKey: "onboardingTour.childTimetable.controlsBody",
        advanceOnTargetPress: true,
      },
      STEPS[1],
    ];
    useOnboardingTourStore
      .getState()
      .startTour("agenda", "parent", stepsWithPress);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.queryByTestId("onboarding-tour-next")).toBeNull();
    expect(screen.getByTestId("onboarding-tour-hint")).toBeInTheDocument();
    // Passer must NOT be offered here: it would call next() without
    // performing the target's real click action, silently stranding the
    // tour on a step whose target never mounts (e.g. a panel that only
    // opens when the real target is clicked).
    expect(screen.queryByTestId("onboarding-tour-skip")).toBeNull();
  });

  it("advances an advanceOnTargetPress step via the store, not the tooltip buttons", () => {
    const stepsWithPress: OnboardingTourStep[] = [
      {
        targetKey: "a",
        titleKey: "onboardingTour.childTimetable.controlsTitle",
        bodyKey: "onboardingTour.childTimetable.controlsBody",
        advanceOnTargetPress: true,
      },
      STEPS[1],
    ];
    useOnboardingTourStore
      .getState()
      .startTour("agenda", "parent", stepsWithPress);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    useOnboardingTourStore.getState().advanceIfTarget("a");

    expect(useOnboardingTourStore.getState().stepIndex).toBe(1);
  });

  it("uses the step's finishLabelKey on the last step when provided", () => {
    const stepsWithFinishLabel: OnboardingTourStep[] = [
      STEPS[0],
      { ...STEPS[1], finishLabelKey: "onboardingTour.common.gotIt" },
    ];
    useOnboardingTourStore
      .getState()
      .startTour("agenda", "parent", stepsWithFinishLabel);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    expect(screen.getByTestId("onboarding-tour-next")).toHaveTextContent(
      "J'ai compris",
    );
  });
});
