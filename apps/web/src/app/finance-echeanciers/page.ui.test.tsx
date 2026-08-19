import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinanceEcheanciersPage from "./page";
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
    if (url.includes("/admin/tracks")) {
      return jsonResponse([]);
    }
    if (url.includes("/admin/finance/fee-schedules") && method === "GET") {
      return jsonResponse([
        {
          id: "fee-1",
          academicLevel: { id: "level-1", label: "CE2", code: "CE2" },
          track: null,
          schoolYear: { id: "sy-1", label: "2025-2026" },
          installments: [
            {
              id: "inst-1",
              rank: 1,
              label: "1ere echeance",
              amount: 50000,
              dueDate: null,
            },
          ],
        },
      ]);
    }
    if (url.includes("/admin/finance/fee-schedules") && method === "POST") {
      return jsonResponse({ id: "fee-2" });
    }
    if (url.includes("/admin/finance/fee-schedules/") && method === "DELETE") {
      return jsonResponse({ success: true });
    }
    if (url.includes("/admin/finance/settings") && method === "GET") {
      return jsonResponse({ reinscriptionThresholdPolicy: "FIRST_INSTALLMENT" });
    }
    if (url.includes("/admin/finance/settings") && method === "PATCH") {
      return jsonResponse({ reinscriptionThresholdPolicy: "FULL_PAYMENT" });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Finance echeanciers page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("charge et affiche les echeanciers existants", async () => {
    mockFetchBase();
    render(<FinanceEcheanciersPage />);

    expect((await screen.findAllByText("CE2")).length).toBeGreaterThan(0);
    expect(
      within(screen.getByTestId("fee-schedules-list")).getByText(
        /1ere echeance/,
      ),
    ).toBeInTheDocument();
  });

  it("cree un nouvel echeancier avec le jeton CSRF", async () => {
    const fetchMock = mockFetchBase();
    render(<FinanceEcheanciersPage />);

    await screen.findAllByText("CE2");

    await selectSearchableOption("Niveau", "CE2");
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "1ere echeance" },
    });
    fireEvent.change(screen.getByLabelText("Montant"), {
      target: { value: "60000" },
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
          String(url).includes("/admin/finance/fee-schedules") &&
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
    render(<FinanceEcheanciersPage />);

    await screen.findAllByText("CE2");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("charge la politique de seuil courante et permet de la changer", async () => {
    const fetchMock = mockFetchBase();
    render(<FinanceEcheanciersPage />);

    await screen.findAllByText("CE2");

    fireEvent.click(
      screen.getByTestId("reinscription-policy-full-payment"),
    );

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/finance/settings") &&
          init?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      const headers = patchCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
      expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
        reinscriptionThresholdPolicy: "FULL_PAYMENT",
      });
    });

    expect(
      await screen.findByText("Politique de reinscription mise a jour."),
    ).toBeInTheDocument();
  });
});
