import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildSupplyListPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-token-test",
}));

function mockFetch(options: {
  role?: string;
  supplyList?: unknown;
  linkedStudents?: unknown[];
}) {
  const { role = "PARENT", supplyList, linkedStudents = [] } = options;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/me")) {
      return new Response(
        JSON.stringify({ role, linkedStudents }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("/me/supply-lists/students/") && url.endsWith("/seen")) {
      return new Response(null, { status: 200 });
    }
    if (url.includes("/me/supply-lists/students/")) {
      return new Response(JSON.stringify(supplyList), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
}

describe("ChildSupplyListPage (parent)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("redirige vers le dashboard si le role n'est pas PARENT", async () => {
    mockFetch({ role: "STUDENT" });
    render(<ChildSupplyListPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
  });

  it("affiche un etat 'pas encore ouverte' quand aucune annee cible n'est resolue", async () => {
    mockFetch({ supplyList: { targetSchoolYearId: null, items: [], seen: true } });
    render(<ChildSupplyListPage />);

    expect(
      await screen.findByTestId("supply-list-not-ready"),
    ).toBeInTheDocument();
  });

  it("affiche les articles tries par rang avec l'annee cible", async () => {
    mockFetch({
      supplyList: {
        targetSchoolYearId: "sy-2026",
        targetSchoolYearLabel: "2026-2027",
        seen: false,
        items: [
          { id: "i2", rank: 2, label: "Stylo bleu", quantity: 4, note: null },
          {
            id: "i1",
            rank: 1,
            label: "Cahier 100 pages",
            quantity: 3,
            note: "Grand format",
          },
        ],
      },
    });
    render(<ChildSupplyListPage />);

    const items = await screen.findAllByTestId("supply-list-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Cahier 100 pages");
    expect(items[0]).toHaveTextContent("Grand format");
    expect(items[1]).toHaveTextContent("Stylo bleu");
    expect(screen.getByText(/2026-2027/)).toBeInTheDocument();
  });

  it("marque la liste comme vue quand elle n'a jamais ete consultee", async () => {
    const fetchMock = mockFetch({
      supplyList: {
        targetSchoolYearId: "sy-2026",
        targetSchoolYearLabel: "2026-2027",
        seen: false,
        items: [{ id: "i1", rank: 1, label: "Cahier", quantity: 1, note: null }],
      },
    });
    render(<ChildSupplyListPage />);

    await screen.findByTestId("supply-list-items");
    await waitFor(() => {
      const seenCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith("/me/supply-lists/students/child-1/seen"),
      );
      expect(seenCall).toBeTruthy();
    });
  });

  it("ne remarque pas une liste deja vue", async () => {
    const fetchMock = mockFetch({
      supplyList: {
        targetSchoolYearId: "sy-2026",
        targetSchoolYearLabel: "2026-2027",
        seen: true,
        items: [{ id: "i1", rank: 1, label: "Cahier", quantity: 1, note: null }],
      },
    });
    render(<ChildSupplyListPage />);

    await screen.findByTestId("supply-list-items");
    const seenCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/seen"),
    );
    expect(seenCall).toBeFalsy();
  });
});
