import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolSanteStudentPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");
const searchParamsMock = new URLSearchParams({
  firstName: "Nathan",
  lastName: "Mbele",
  className: "6eC",
  age: "11",
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", studentId: "student-1" }),
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("../../../../../../lib/auth-cookies", () => ({
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

const CARE_EVENT_1 = {
  id: "care-1",
  summary: "Chute dans la cour",
  description: "Genou éraflé",
  occurredAt: new Date("2026-02-01T10:00:00Z").toISOString(),
  alertLevel: "ATTENTION",
  authorUser: { firstName: "Marie", lastName: "Ateba" },
};

const REPORT_1 = {
  id: "report-1",
  type: "ACCIDENT",
  alertLevel: "URGENT",
  description: "Crise d'asthme",
  createdAt: new Date("2026-02-05T10:00:00Z").toISOString(),
  acknowledgedAt: null,
  reportedByUser: { firstName: "Jean", lastName: "Mbele" },
};

const CONDITION_1 = {
  id: "cond-1",
  type: "ALLERGY",
  alertLevel: "URGENT",
  label: "Allergie arachides",
  description: "Ne pas donner d'arachides",
  active: true,
};

function mockFetchDefault() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/health/history")) return jsonResponse({ items: [] });
    if (url.includes("/health/conditions")) return jsonResponse({ items: [] });
    return jsonResponse({}, 404);
  });
}

describe("School sante student page (fiche élève)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("affiche le nom, la classe et l'âge de l'élève dans le hero", async () => {
    mockFetchDefault();
    render(<SchoolSanteStudentPage />);

    await waitFor(() => {
      expect(screen.getByText("Mbele Nathan")).toBeInTheDocument();
      expect(screen.getByText("6eC · 11 ans")).toBeInTheDocument();
    });
  });

  it("onglet Cares : affiche l'historique fusionné (soins + signalements)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/health/history")) {
        return jsonResponse({
          items: [
            { kind: "REPORT", at: REPORT_1.createdAt, payload: REPORT_1 },
            {
              kind: "CARE_EVENT",
              at: CARE_EVENT_1.occurredAt,
              payload: CARE_EVENT_1,
            },
          ],
        });
      }
      return jsonResponse({ items: [] });
    });

    render(<SchoolSanteStudentPage />);

    await waitFor(() => {
      expect(screen.getByText("Crise d'asthme")).toBeInTheDocument();
      expect(screen.getByText("Chute dans la cour")).toBeInTheDocument();
    });
  });

  it("onglet Conditions : charge les conditions au clic sur l'onglet", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/health/history")) return jsonResponse({ items: [] });
      if (url.includes("/health/conditions"))
        return jsonResponse({ items: [CONDITION_1] });
      return jsonResponse({}, 404);
    });

    render(<SchoolSanteStudentPage />);
    fireEvent.click(await screen.findByTestId("sante-student-tab-conditions"));

    await waitFor(() => {
      expect(screen.getByText("Allergie arachides")).toBeInTheDocument();
    });
  });

  it("le bouton d'ajout ouvre le formulaire de création", async () => {
    mockFetchDefault();
    render(<SchoolSanteStudentPage />);

    fireEvent.click(await screen.findByTestId("sante-student-add-care"));

    expect(screen.getByTestId("sante-care-form-summary")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ajouter un soin" }),
    ).toBeInTheDocument();
  });

  it("soumission création : POST care-events puis recharge l'historique", async () => {
    let created = false;
    let postedAlertLevel: string | null = null;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.includes("/health/care-events") && method === "POST") {
          created = true;
          postedAlertLevel = JSON.parse(String(init?.body)).alertLevel;
          return jsonResponse({ id: "care-2" }, 201);
        }
        if (url.includes("/health/history")) {
          return jsonResponse({
            items: created
              ? [
                  {
                    kind: "CARE_EVENT",
                    at: "now",
                    payload: { ...CARE_EVENT_1, id: "care-2" },
                  },
                ]
              : [],
          });
        }
        return jsonResponse({ items: [] });
      });

    render(<SchoolSanteStudentPage />);
    fireEvent.click(await screen.findByTestId("sante-student-add-care"));

    fireEvent.change(screen.getByTestId("sante-care-form-summary"), {
      target: { value: "Petite coupure" },
    });
    fireEvent.click(screen.getByTestId("sante-care-form-alertLevel"));
    fireEvent.click(
      await screen.findByTestId("sante-care-form-alertLevel-option-URGENT"),
    );
    fireEvent.click(screen.getByTestId("sante-care-form-submit"));

    await waitFor(() => {
      expect(created).toBe(true);
      expect(postedAlertLevel).toBe("URGENT");
      expect(screen.queryByTestId("sante-care-form-summary")).toBeNull();
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("le lien Modifier ouvre le formulaire pré-rempli, la soumission fait un PATCH avec l'id du soin", async () => {
    let patchedId: string | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/health/history")) {
        return jsonResponse({
          items: [
            {
              kind: "CARE_EVENT",
              at: CARE_EVENT_1.occurredAt,
              payload: CARE_EVENT_1,
            },
          ],
        });
      }
      if (url.includes("/health/care-events/care-1") && method === "PATCH") {
        patchedId = "care-1";
        return jsonResponse({ id: "care-1" });
      }
      return jsonResponse({ items: [] });
    });

    render(<SchoolSanteStudentPage />);
    fireEvent.click(await screen.findByTestId("sante-care-edit-care-1"));

    expect(screen.getByText("Modifier le soin")).toBeInTheDocument();
    expect(
      (screen.getByTestId("sante-care-form-summary") as HTMLInputElement).value,
    ).toBe("Chute dans la cour");

    fireEvent.change(screen.getByTestId("sante-care-form-summary"), {
      target: { value: "Chute mise à jour" },
    });
    fireEvent.click(screen.getByTestId("sante-care-form-submit"));

    await waitFor(() => expect(patchedId).toBe("care-1"));
  });

  it("annuler ferme le formulaire sans appel réseau de sauvegarde", async () => {
    mockFetchDefault();
    render(<SchoolSanteStudentPage />);
    fireEvent.click(await screen.findByTestId("sante-student-add-care"));

    fireEvent.click(screen.getByTestId("sante-care-form-cancel"));

    expect(screen.queryByTestId("sante-care-form-summary")).toBeNull();
  });
});
