import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReinscriptionPage from "./page";
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

const WALLET_ONE_CHILD_READY = {
  walletId: "wallet-1",
  balance: 50000,
  transactions: [],
  children: [
    {
      student: {
        id: "student-1",
        firstName: "Remi",
        lastName: "Ntamack",
        dateOfBirth: "2015-04-12",
      },
      status: "READY_TO_REINSCRIBE",
      targetSchoolYearId: "sy-2026",
      targetSchoolYearLabel: "2026-2027",
      requiredAmount: 30000,
      previousClassLabel: "CE1-B",
      previousLevelLabel: "CE1",
      nextAcademicLevelLabel: "CE2",
      reinscriptionDeadline: "2099-07-15",
    },
  ],
};

const INSTALLMENT_BREAKDOWN = {
  student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
  schoolYearId: "sy-2026",
  totalAmount: 100000,
  totalPaid: 50000,
  totalRemaining: 50000,
  installments: [
    {
      id: "inst-1",
      rank: 1,
      label: "1ere echeance",
      amount: 50000,
      dueDate: "2026-10-01T00:00:00.000Z",
      allocatedAmount: 50000,
      remainingAmount: 0,
      status: "PAID",
    },
    {
      id: "inst-2",
      rank: 2,
      label: "2eme echeance",
      amount: 50000,
      dueDate: null,
      allocatedAmount: 0,
      remainingAmount: 50000,
      status: "UPCOMING",
    },
  ],
};

const SUPPLY_LIST = {
  targetSchoolYearId: "sy-2026",
  targetSchoolYearLabel: "2026-2027",
  items: [
    {
      id: "item-1",
      rank: 1,
      label: "Cahier 100 pages",
      quantity: 3,
      note: null,
    },
  ],
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
      return jsonResponse({ walletId: "wallet-1", balance: 60000 });
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
    if (url.includes("/me/finance/students/") && url.includes("/schedule")) {
      return jsonResponse(INSTALLMENT_BREAKDOWN);
    }
    if (url.includes("/me/supply-lists/students/")) {
      return jsonResponse(SUPPLY_LIST);
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Reinscription (parent) page", () => {
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

  it("charge et affiche le solde reel et le statut de chaque enfant", async () => {
    mockFetch(WALLET_ONE_CHILD_READY);
    render(<ReinscriptionPage />);

    expect(await screen.findByText("Remi Ntamack")).toBeInTheDocument();
    expect(screen.getByText(/Pret\(e\) a etre reinscrit/)).toBeInTheDocument();
  });

  it("affiche la date de naissance, l'ancien et le nouveau niveau, et le compte a rebours", async () => {
    mockFetch(WALLET_ONE_CHILD_READY);
    render(<ReinscriptionPage />);

    await screen.findByText("Remi Ntamack");
    expect(screen.getByText(/12 avr\. 2015/)).toBeInTheDocument();
    expect(screen.getByText(/CE1/)).toBeInTheDocument();
    expect(screen.getByText(/CE2/)).toBeInTheDocument();
    expect(screen.getByText(/jour\(s\) restant\(s\)/)).toBeInTheDocument();
    expect(
      screen.queryByTestId("insufficient-balance-student-1"),
    ).not.toBeInTheDocument();
  });

  it("affiche un message de solde insuffisant en permanence quand le wallet ne couvre pas le montant requis", async () => {
    mockFetch({
      ...WALLET_ONE_CHILD_READY,
      balance: 1000,
    });
    render(<ReinscriptionPage />);

    await screen.findByText("Remi Ntamack");
    expect(
      await screen.findByTestId("insufficient-balance-student-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pay-and-reinscribe-student-1")).toBeDisabled();
  });

  it("recolore la card, masque le CTA et suggere la liste des fournitures une fois reinscrit", async () => {
    mockFetch({
      walletId: "wallet-1",
      balance: 0,
      transactions: [],
      children: [
        {
          student: {
            id: "student-1",
            firstName: "Remi",
            lastName: "Ntamack",
          },
          status: "ALREADY_REINSCRIBED",
          targetSchoolYearId: "sy-2026",
          targetSchoolYearLabel: "2026-2027",
          previousLevelLabel: "CE1",
          nextAcademicLevelLabel: "CE2",
        },
      ],
    });
    render(<ReinscriptionPage />);

    await screen.findByText("Remi Ntamack");
    expect(screen.getByText("Inscription confirmee !")).toBeInTheDocument();
    expect(
      screen.queryByTestId("pay-and-reinscribe-student-1"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("view-supplies-student-1"));
    expect(await screen.findByText(/Cahier 100 pages/)).toBeInTheDocument();
  });

  it("credite le porte-monnaie avec le jeton CSRF", async () => {
    const fetchMock = mockFetch({
      walletId: "wallet-1",
      balance: 0,
      transactions: [],
      children: [],
    });
    render(<ReinscriptionPage />);
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
    const fetchMock = mockFetch(WALLET_ONE_CHILD_READY);
    render(<ReinscriptionPage />);
    await screen.findByText("Remi Ntamack");

    fireEvent.click(screen.getByTestId("pay-and-reinscribe-student-1"));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/me/finance/wallet/pay-and-reinscribe") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });

    expect(
      await screen.findByText("Remi est reinscrit(e) !"),
    ).toBeInTheDocument();
  });

  it("affiche l'echeancier detaille au clic sur 'Voir l'echeancier'", async () => {
    mockFetch(WALLET_ONE_CHILD_READY);
    render(<ReinscriptionPage />);
    await screen.findByText("Remi Ntamack");

    expect(screen.queryByTestId("installment-list-student-1")).toBeNull();
    fireEvent.click(screen.getByText("Voir l'echeancier"));

    expect(
      await screen.findByTestId("installment-row-student-1-1"),
    ).toBeInTheDocument();
    expect(screen.getByText("Payee")).toBeInTheDocument();
    expect(screen.getByText("A venir")).toBeInTheDocument();
  });

  it("charge et affiche la liste de fournitures dans l'onglet dedie", async () => {
    mockFetch(WALLET_ONE_CHILD_READY);
    render(<ReinscriptionPage />);
    await screen.findByText("Remi Ntamack");

    fireEvent.click(screen.getByTestId("reinscription-tab-fournitures"));

    expect(await screen.findByText(/Cahier 100 pages/)).toBeInTheDocument();
  });

  it("demarre le tour d'aide guidee quand onboardingHelpEnabled est actif", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/me") && !url.includes("/finance/")) {
        return jsonResponse({ ...ME_PAYLOAD, onboardingHelpEnabled: true });
      }
      return jsonResponse({ message: "not found" }, 404);
    });

    render(<ReinscriptionPage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "reinscription-parent-web",
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });
});
