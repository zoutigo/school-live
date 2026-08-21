import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildAccueilPage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";
import { CHILD_HOME_TOUR_ID } from "./child-home-tour.config";

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
}));

vi.mock("../../../../../../../components/family/child-module-page", () => ({
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

describe("ChildAccueilPage — tour et aide", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes("/life-events")
        ? []
        : url.includes("/notes")
          ? []
          : url.includes("/messages?folder=inbox")
            ? { items: [] }
            : {};

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
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

  it("démarre le tour d'accueil enfant pour un parent", async () => {
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        CHILD_HOME_TOUR_ID,
      );
    });
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });

  it("ne redémarre pas un tour déjà terminé", async () => {
    useOnboardingTourStore.setState({
      completedTours: { "parent:child-home": true },
    });

    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("enregistre le contenu d'aide (3 sections) au montage", async () => {
    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Accueil enfant");
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Trois indicateurs",
      "Des blocs résumés",
      "Fournitures scolaires",
    ]);
  });
});
