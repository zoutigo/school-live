import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupplyListsPage from "./page";
import { selectSearchableOption } from "../../test/searchable-select";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn((): string | null => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../lib/auth-cookies", () => ({
  getCsrfTokenCookie: () => getCsrfTokenCookieMock(),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockFetchBase() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/me")) {
      return jsonResponse({
        role: "SCHOOL_MANAGER",
        schoolSlug: "college-vogt",
      });
    }
    if (url.includes("/admin/school-years")) {
      return jsonResponse([{ id: "sy-1", label: "2025-2026", isActive: true }]);
    }
    if (url.includes("/admin/academic-levels")) {
      return jsonResponse([{ id: "level-1", code: "CE2", label: "CE2" }]);
    }
    if (url.includes("/admin/tracks")) {
      return jsonResponse([]);
    }
    if (url.includes("/admin/supply-lists") && method === "GET") {
      return jsonResponse([
        {
          id: "supply-1",
          academicLevel: { id: "level-1", label: "CE2", code: "CE2" },
          track: null,
          schoolYear: { id: "sy-1", label: "2025-2026" },
          items: [
            {
              id: "item-1",
              rank: 1,
              label: "Cahier 100 pages",
              quantity: 3,
              note: null,
            },
          ],
        },
      ]);
    }
    if (url.includes("/admin/supply-lists") && method === "POST") {
      return jsonResponse({ id: "supply-2" });
    }
    if (url.includes("/admin/supply-lists/") && method === "DELETE") {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Supply lists page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("charge et affiche les listes de fournitures existantes", async () => {
    mockFetchBase();
    render(<SupplyListsPage />);

    expect((await screen.findAllByText("CE2")).length).toBeGreaterThan(0);
    expect(
      within(screen.getByTestId("supply-lists-list")).getByText(
        /Cahier 100 pages/,
      ),
    ).toBeInTheDocument();
  });

  it("cree une nouvelle liste de fournitures avec le jeton CSRF", async () => {
    const fetchMock = mockFetchBase();
    render(<SupplyListsPage />);

    await screen.findAllByText("CE2");

    await selectSearchableOption("Niveau", "CE2");
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "Stylo bleu" },
    });
    fireEvent.change(screen.getByLabelText("Quantite"), {
      target: { value: "2" },
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer" }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/supply-lists") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });
  });

  it("bloque la suppression si le jeton CSRF est absent", async () => {
    getCsrfTokenCookieMock.mockReturnValue(null);
    mockFetchBase();
    render(<SupplyListsPage />);

    await screen.findAllByText("CE2");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("supprime une liste de fournitures avec le jeton CSRF", async () => {
    const fetchMock = mockFetchBase();
    render(<SupplyListsPage />);

    await screen.findAllByText("CE2");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/supply-lists/supply-1") &&
          init?.method === "DELETE",
      );
      expect(deleteCall).toBeTruthy();
      const headers = deleteCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });
  });
});
