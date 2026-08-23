import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinanceReinscriptionDeadlinesPage from "./page";
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
        role: "SCHOOL_ACCOUNTANT",
        schoolSlug: "college-vogt",
      });
    }
    if (url.includes("/admin/school-years")) {
      return jsonResponse([{ id: "sy-1", label: "2025-2026", isActive: true }]);
    }
    if (url.includes("/admin/academic-levels")) {
      return jsonResponse([{ id: "level-1", code: "CE2", label: "CE2" }]);
    }
    if (
      url.includes("/admin/finance/reinscription-deadlines") &&
      method === "GET"
    ) {
      return jsonResponse([
        {
          id: "rd-1",
          academicLevel: { id: "level-1", label: "CE2", code: "CE2" },
          schoolYear: { id: "sy-1", label: "2025-2026" },
          deadline: "2026-07-15T00:00:00.000Z",
        },
      ]);
    }
    if (
      url.includes("/admin/finance/reinscription-deadlines") &&
      method === "POST"
    ) {
      return jsonResponse({ id: "rd-2" });
    }
    if (
      url.includes("/admin/finance/reinscription-deadlines/") &&
      method === "DELETE"
    ) {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Finance reinscription deadlines page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("charge et affiche les dates limites existantes", async () => {
    mockFetchBase();
    render(<FinanceReinscriptionDeadlinesPage />);

    expect((await screen.findAllByText("CE2")).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/2025-2026 — 15 juil\. 2026/),
    ).toBeInTheDocument();
  });

  it("cree une nouvelle date limite avec le jeton CSRF", async () => {
    const fetchMock = mockFetchBase();
    render(<FinanceReinscriptionDeadlinesPage />);

    await screen.findAllByText("CE2");

    await selectSearchableOption("Niveau", "CE2");
    fireEvent.change(screen.getByLabelText("Date limite"), {
      target: { value: "2026-08-15" },
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
          String(url).includes("/admin/finance/reinscription-deadlines") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });

    expect(
      await screen.findByText("Date limite enregistree."),
    ).toBeInTheDocument();
  });

  it("bloque la suppression si le jeton CSRF est absent", async () => {
    getCsrfTokenCookieMock.mockReturnValue(null);
    mockFetchBase();
    render(<FinanceReinscriptionDeadlinesPage />);

    await screen.findAllByText("CE2");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("supprime une date limite existante", async () => {
    const fetchMock = mockFetchBase();
    render(<FinanceReinscriptionDeadlinesPage />);

    await screen.findAllByText("CE2");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/finance/reinscription-deadlines/") &&
          init?.method === "DELETE",
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it("redirige les roles non autorises", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "PARENT", schoolSlug: "college-vogt" });
      }
      return jsonResponse({ message: "not found" }, 404);
    });
    render(<FinanceReinscriptionDeadlinesPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
  });
});
