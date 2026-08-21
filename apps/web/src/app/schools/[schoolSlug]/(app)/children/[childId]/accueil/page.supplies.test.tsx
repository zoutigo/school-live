import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildAccueilPage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";

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
      onboardingHelpEnabled: false,
    });
    return (
      <div>
        {typeof content === "function"
          ? content({
              child: { id: "child-1", firstName: "Lisa", lastName: "MBELE" },
              loading: false,
              onboardingHelpEnabled: false,
            })
          : content}
      </div>
    );
  },
}));

function mockFetch(supplyList: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/me/supply-lists/students/")) {
      return new Response(JSON.stringify(supplyList), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
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
}

describe("ChildAccueilPage — bloc fournitures scolaires", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it("masque le bloc quand la prochaine annee n'est pas ouverte", async () => {
    mockFetch({ targetSchoolYearId: null, items: [] });
    render(<ChildAccueilPage />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(
      screen.queryByTestId("child-home-supplies-panel"),
    ).not.toBeInTheDocument();
  });

  it("affiche jusqu'a 3 articles quand la liste est disponible", async () => {
    mockFetch({
      targetSchoolYearId: "sy-2026",
      targetSchoolYearLabel: "2026-2027",
      items: [
        {
          id: "i1",
          rank: 1,
          label: "Cahier 100 pages",
          quantity: 3,
          note: null,
        },
        { id: "i2", rank: 2, label: "Stylo bleu", quantity: 4, note: null },
        { id: "i3", rank: 3, label: "Regle", quantity: 1, note: null },
        { id: "i4", rank: 4, label: "Gomme", quantity: 2, note: null },
      ],
    });
    render(<ChildAccueilPage />);

    expect(await screen.findByText(/Cahier 100 pages/)).toBeInTheDocument();
    expect(screen.getByText(/Stylo bleu/)).toBeInTheDocument();
    expect(screen.getByText(/Regle/)).toBeInTheDocument();
    expect(screen.queryByText(/Gomme/)).not.toBeInTheDocument();
  });

  it("affiche un etat vide quand la liste n'a aucun article", async () => {
    mockFetch({
      targetSchoolYearId: "sy-2026",
      targetSchoolYearLabel: "2026-2027",
      items: [],
    });
    render(<ChildAccueilPage />);

    expect(
      await screen.findByText(
        "Aucune liste de fournitures definie pour le moment.",
      ),
    ).toBeInTheDocument();
  });

  it("propose un lien vers l'ecran Reinscription", async () => {
    mockFetch({
      targetSchoolYearId: "sy-2026",
      targetSchoolYearLabel: "2026-2027",
      items: [
        {
          id: "i1",
          rank: 1,
          label: "Cahier 100 pages",
          quantity: 3,
          note: null,
        },
      ],
    });
    render(<ChildAccueilPage />);

    const link = await screen.findByRole("link", {
      name: "Voir la reinscription",
    });
    expect(link).toHaveAttribute("href", "/schools/college-vogt/reinscription");
  });
});
