import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ParentDocumentsPage from "./page";
import { selectSearchableOption } from "../../../../../test/searchable-select";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ replace: replaceMock }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("ParentDocumentsPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({
          role: "PARENT",
          firstName: "Alice",
          lastName: "Mbele",
        });
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });
  });

  it("filtre les documents par annee d'archive via la liste deroulante", async () => {
    render(<ParentDocumentsPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Bulletin 1er trimestre - Paul MBELE").length,
      ).toBeGreaterThan(0);
    });

    await selectSearchableOption("Acces aux archives", "2024-2025");

    await waitFor(() => {
      expect(
        screen.getAllByText("Bulletin annuel - Paul MBELE").length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByText("Bulletin 1er trimestre - Paul MBELE").length,
      ).toBe(0);
    });
  });
});
