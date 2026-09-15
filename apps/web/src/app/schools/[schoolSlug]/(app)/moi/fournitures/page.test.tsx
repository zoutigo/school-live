import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MySupplyListPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => "csrf-token-test",
}));

function mockFetch(options: { role?: string; supplyList?: unknown }) {
  const { role = "STUDENT", supplyList } = options;
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/timetable/me")) {
      return new Response(
        JSON.stringify({ student: { id: "self-student-1" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.endsWith("/me")) {
      return new Response(JSON.stringify({ role }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (
      url.includes("/me/supply-lists/students/self-student-1") &&
      url.endsWith("/seen")
    ) {
      return new Response(null, { status: 200 });
    }
    if (url.includes("/me/supply-lists/students/self-student-1")) {
      return new Response(JSON.stringify(supplyList), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  });
}

describe("MySupplyListPage (student self)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("redirige vers le dashboard si le role n'est pas STUDENT", async () => {
    mockFetch({ role: "PARENT" });
    render(<MySupplyListPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
  });

  it("resout l'eleve via timetable/me et affiche sa liste de fournitures", async () => {
    mockFetch({
      supplyList: {
        targetSchoolYearId: "sy-2026",
        targetSchoolYearLabel: "2026-2027",
        seen: true,
        items: [
          { id: "i1", rank: 1, label: "Cahier", quantity: 2, note: null },
        ],
      },
    });
    render(<MySupplyListPage />);

    expect(await screen.findByTestId("supply-list-items")).toBeInTheDocument();
    expect(screen.getByText(/Cahier/)).toBeInTheDocument();
  });
});
