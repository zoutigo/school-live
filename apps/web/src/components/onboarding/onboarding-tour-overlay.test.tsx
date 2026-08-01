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

  it("advances to the next step (does not end the tour) when Passer is clicked", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    fireEvent.click(screen.getByTestId("onboarding-tour-skip"));

    expect(useOnboardingTourStore.getState().activeTourId).toBe("agenda");
    expect(useOnboardingTourStore.getState().stepIndex).toBe(1);
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(false);
  });

  it("completes the tour when Passer is clicked on the final step", () => {
    useOnboardingTourStore.getState().startTour("agenda", "parent", STEPS);
    useOnboardingTourStore.getState().next();
    useOnboardingTourStore
      .getState()
      .setTargetRect({ x: 10, y: 10, width: 100, height: 40 });

    render(<OnboardingTourOverlay />);

    fireEvent.click(screen.getByTestId("onboarding-tour-skip"));

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
    expect(
      useOnboardingTourStore.getState().isCompleted("parent", "agenda"),
    ).toBe(true);
  });
});
