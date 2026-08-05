import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ParentFinancePage from "./page";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../lib/auth-cookies", () => ({
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

const ME_PAYLOAD = {
  role: "PARENT",
  firstName: "Awa",
  lastName: "Ekwalla",
  onboardingHelpEnabled: false,
};

function mockFetch(
  walletSummary: unknown,
  overrides?: { reinscribeStatus?: number },
) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/me") && !url.includes("/finance/")) {
      return jsonResponse(ME_PAYLOAD);
    }
    if (url.includes("/me/finance/wallet") && method === "GET") {
      return jsonResponse(walletSummary);
    }
    if (url.includes("/me/finance/wallet/top-up") && method === "POST") {
      return jsonResponse({ walletId: "wallet-1", balance: 50000 });
    }
    if (
      url.includes("/me/finance/wallet/pay-and-reinscribe") &&
      method === "POST"
    ) {
      if (overrides?.reinscribeStatus && overrides.reinscribeStatus !== 200) {
        return jsonResponse(
          { message: "Solde insuffisant" },
          overrides.reinscribeStatus,
        );
      }
      return jsonResponse({
        requiredAmount: 30000,
        reinscriptionConfirmed: true,
      });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Situation financiere (parent) page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    useOnboardingTourStore.setState({
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
      completedTours: {},
    });
  });

  it("affiche le solde du wallet et le statut de chaque enfant", async () => {
    mockFetch({
      walletId: "wallet-1",
      balance: 20000,
      transactions: [],
      children: [
        {
          student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
          status: "READY_TO_REINSCRIBE",
          targetSchoolYearId: "sy-2026",
          targetSchoolYearLabel: "2026-2027",
          requiredAmount: 30000,
        },
        {
          student: { id: "student-2", firstName: "Awa", lastName: "Ntamack" },
          status: "DECISION_PENDING",
        },
      ],
    });
    render(<ParentFinancePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Porte-monnaie" }),
    );

    expect(await screen.findByText("Remi Ntamack")).toBeInTheDocument();
    expect(
      screen.getByText(/En attente de la decision du conseil de classe/),
    ).toBeInTheDocument();
  });

  it("credite le wallet avec le jeton CSRF", async () => {
    const fetchMock = mockFetch({
      walletId: "wallet-1",
      balance: 0,
      transactions: [],
      children: [],
    });
    render(<ParentFinancePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Porte-monnaie" }),
    );
    await screen.findByText("Mes enfants");

    fireEvent.change(screen.getByLabelText("Montant a crediter"), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crediter" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/me/finance/wallet/top-up") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });
  });

  it('clique sur "Je paie et je reinscris" et confirme la reinscription', async () => {
    const fetchMock = mockFetch({
      walletId: "wallet-1",
      balance: 50000,
      transactions: [],
      children: [
        {
          student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
          status: "READY_TO_REINSCRIBE",
          targetSchoolYearId: "sy-2026",
          targetSchoolYearLabel: "2026-2027",
          requiredAmount: 30000,
        },
      ],
    });
    render(<ParentFinancePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Porte-monnaie" }),
    );
    await screen.findByText("Remi Ntamack");

    fireEvent.click(
      screen.getByRole("button", { name: "Je paie et je reinscris" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/me/finance/wallet/pay-and-reinscribe") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
      const body = JSON.parse(String(postCall?.[1]?.body));
      expect(body).toEqual({ studentId: "student-1", schoolYearId: "sy-2026" });
    });

    expect(
      await screen.findByText("Remi est reinscrit(e) !"),
    ).toBeInTheDocument();
  });

  it("desactive le bouton de reinscription si le solde du wallet est insuffisant", async () => {
    mockFetch({
      walletId: "wallet-1",
      balance: 5000,
      transactions: [],
      children: [
        {
          student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
          status: "READY_TO_REINSCRIBE",
          targetSchoolYearId: "sy-2026",
          targetSchoolYearLabel: "2026-2027",
          requiredAmount: 30000,
        },
      ],
    });
    render(<ParentFinancePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Porte-monnaie" }),
    );
    await screen.findByText("Remi Ntamack");

    expect(
      screen.getByRole("button", { name: "Je paie et je reinscris" }),
    ).toBeDisabled();
  });

  it("demarre le tour d'aide guidee quand onboardingHelpEnabled est actif", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me") && !url.includes("/finance/")) {
        return jsonResponse({ ...ME_PAYLOAD, onboardingHelpEnabled: true });
      }
      return jsonResponse({ message: "not found" }, 404);
    });

    render(<ParentFinancePage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "finance-parent-reinscription",
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });
});
