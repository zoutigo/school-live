import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FinancePaiementsPage from "./page";
import { selectSearchableOption } from "../../test/searchable-select";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

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

const SUMMARY = {
  student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
  decision: {
    decision: "PROMOTED",
    nextAcademicLevelId: "level-1",
    nextTrackId: null,
  },
  feeSchedule: {
    academicLevel: { label: "CE2" },
    track: null,
    installments: [
      { id: "inst-1", rank: 1, label: "1ere echeance", amount: 50000 },
    ],
  },
  totalPaid: 20000,
  thresholdAmount: 50000,
  reinscriptionEligible: false,
};

function mockFetchBase(overrides?: {
  summaryStatus?: number;
  recordStatus?: number;
  reinscriptionConfirmed?: boolean;
}) {
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
      return jsonResponse([
        { id: "sy-2026", label: "2026-2027", isActive: false },
      ]);
    }
    if (url.includes("/admin/students?")) {
      return jsonResponse([
        { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
      ]);
    }
    if (url.includes("/admin/finance/students/") && url.includes("/summary")) {
      if (overrides?.summaryStatus && overrides.summaryStatus !== 200) {
        return jsonResponse(
          { message: "Aucune decision de conseil de classe" },
          overrides.summaryStatus,
        );
      }
      return jsonResponse(SUMMARY);
    }
    if (url.includes("/admin/finance/payments") && method === "POST") {
      if (overrides?.recordStatus && overrides.recordStatus !== 200) {
        return jsonResponse({ message: "Erreur" }, overrides.recordStatus);
      }
      return jsonResponse({
        reinscriptionConfirmed: overrides?.reinscriptionConfirmed ?? false,
      });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

async function selectStudentAndYear() {
  fireEvent.change(await screen.findByPlaceholderText("Nom ou prenom"), {
    target: { value: "Ntamack" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
  fireEvent.click(await screen.findByText("Ntamack Remi"));
  await selectSearchableOption("Annee scolaire (reinscription)", "2026-2027");
}

describe("Finance paiements page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("affiche la situation financiere de l'eleve selectionne", async () => {
    mockFetchBase();
    render(<FinancePaiementsPage />);
    await selectStudentAndYear();

    expect(await screen.findByText(/Seuil non atteint/)).toBeInTheDocument();
  });

  it("affiche un message d'erreur si l'eleve n'a pas de decision de conseil", async () => {
    mockFetchBase({ summaryStatus: 400 });
    render(<FinancePaiementsPage />);
    await selectStudentAndYear();

    expect(
      await screen.findByText("Aucune decision de conseil de classe"),
    ).toBeInTheDocument();
  });

  it("enregistre un paiement avec le jeton CSRF et confirme la reinscription si le seuil est atteint", async () => {
    const fetchMock = mockFetchBase({ reinscriptionConfirmed: true });
    render(<FinancePaiementsPage />);
    await selectStudentAndYear();

    await screen.findByText(/Seuil non atteint/);
    fireEvent.change(screen.getByLabelText("Montant verse"), {
      target: { value: "30000" },
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer le paiement" }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer le paiement" }),
    );

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/finance/payments") &&
          init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const headers = postCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });

    expect(
      await screen.findByText(/reinscription de l'eleve est confirmee/),
    ).toBeInTheDocument();
  });
});
