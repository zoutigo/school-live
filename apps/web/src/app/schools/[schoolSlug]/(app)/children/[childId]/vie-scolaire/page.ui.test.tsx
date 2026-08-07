import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildVieScolairePage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";
import { VIE_SCOLAIRE_TOUR_ID } from "../../../../../../../components/discipline/vie-scolaire-tour.config";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
  useRouter: () => ({ replace: replaceMock }),
}));

function resetOnboardingTourStore() {
  useOnboardingTourStore.setState({
    completedTours: {},
    activeTourId: null,
    activeRole: null,
    steps: [],
    stepIndex: 0,
    targetRect: null,
  });
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockParentFetch(
  options: { role?: string; onboardingHelpEnabled?: boolean } = {},
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes("/schools/college-vogt/me")) {
      return createJsonResponse({
        role: options.role ?? "PARENT",
        linkedStudents: [
          { id: "child-1", firstName: "Nathan", lastName: "Mbele" },
        ],
        onboardingHelpEnabled: options.onboardingHelpEnabled,
      });
    }

    if (url.includes("/students/child-1/life-events")) {
      return createJsonResponse([]);
    }

    return createJsonResponse({});
  });
}

describe("children/[childId]/vie-scolaire — aide parent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    resetOnboardingTourStore();
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("démarre le tour automatiquement pour un parent", async () => {
    mockParentFetch();
    render(<ChildVieScolairePage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        VIE_SCOLAIRE_TOUR_ID,
      );
    });
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });

  it("onboardingHelpEnabled=false : pas de tour", async () => {
    mockParentFetch({ onboardingHelpEnabled: false });
    render(<ChildVieScolairePage />);

    await waitFor(() => {
      expect(screen.getByText("Nathan Mbele")).toBeInTheDocument();
    });

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("enregistre le contenu d'aide (2 sections) dans le menu latéral", async () => {
    mockParentFetch({ onboardingHelpEnabled: false });
    render(<ChildVieScolairePage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Vie scolaire — Synthèse",
      );
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Les compteurs de l'année",
      "Filtrer les événements récents",
    ]);
  });

  it("redirige vers le dashboard pour un rôle non-parent, sans démarrer le tour", async () => {
    mockParentFetch({ role: "TEACHER" });
    render(<ChildVieScolairePage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });
});
