import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentNotesPage } from "./student-notes-page";
import { useOnboardingTourStore } from "../../store/onboarding-tour";
import { usePageHelpStore } from "../../store/page-help";
import { CHILD_NOTES_TOUR_ID } from "./child-notes-tour.config";

vi.mock("../family/child-module-page", () => ({
  ChildModulePage: ({
    content,
    onReady,
  }: {
    content:
      | ReactNode
      | ((ctx: {
          child: { id: string; firstName: string; lastName: string } | null;
          loading: boolean;
          onboardingHelpEnabled: boolean;
        }) => ReactNode);
    onReady?: (ctx: {
      child: { id: string; firstName: string; lastName: string } | null;
      onboardingHelpEnabled: boolean;
    }) => void;
  }) => {
    onReady?.({
      child: { id: "child-1", firstName: "Lisa", lastName: "MBELE" },
      onboardingHelpEnabled: true,
    });
    return (
      <div>
        {typeof content === "function"
          ? content({
              child: { id: "child-1", firstName: "Lisa", lastName: "MBELE" },
              loading: false,
              onboardingHelpEnabled: true,
            })
          : content}
      </div>
    );
  },
}));

describe("StudentNotesPage — tour et aide « vue enfant »", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("démarre le tour et enregistre l'aide quand un childId est fourni (vue parent)", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        CHILD_NOTES_TOUR_ID,
      );
    });
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Notes");
    });
  });

  it("ne démarre aucun tour et n'enregistre aucune aide en vue élève (self, pas de childId)", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
    expect(usePageHelpStore.getState().entry).toBeNull();
  });
});
