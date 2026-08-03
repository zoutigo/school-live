import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildSantePage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { HEALTH_PARENT_TOUR_ID } from "../../../../../../../components/health/health-parent-tour.config";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("../../../../../../../lib/auth-cookies", () => ({
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

const mePayload = {
  role: "PARENT",
  linkedStudents: [{ id: "child-1", firstName: "Nathan", lastName: "Mbele" }],
};

describe("Child sante page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    useOnboardingTourStore.setState({
      completedTours: {},
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
  });

  it("démarre le tour d'aide guidée santé pour un parent par défaut", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me"))
        return jsonResponse(mePayload);
      if (url.includes("/health/conditions")) return jsonResponse([]);
      if (url.includes("/health/care-events")) return jsonResponse([]);
      if (url.includes("/health/reports")) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    render(<ChildSantePage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        HEALTH_PARENT_TOUR_ID,
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });

  it("ne démarre pas le tour si onboardingHelpEnabled est false", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ ...mePayload, onboardingHelpEnabled: false });
      }
      if (url.includes("/health/conditions")) return jsonResponse([]);
      if (url.includes("/health/care-events")) return jsonResponse([]);
      if (url.includes("/health/reports")) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    render(<ChildSantePage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    });
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("affiche les conditions, soins et signalements déjà enregistrés", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me"))
        return jsonResponse(mePayload);
      if (url.includes("/health/conditions")) {
        return jsonResponse([
          {
            id: "cond-1",
            type: "ALLERGY",
            alertLevel: "URGENT",
            label: "Allergie arachides",
            description: null,
            active: true,
            isVisibleToAllTeachers: false,
            publicAlertLabel: null,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      if (url.includes("/health/care-events")) {
        return jsonResponse([
          {
            id: "care-1",
            summary: "Chute dans la cour",
            description: null,
            occurredAt: new Date().toISOString(),
            alertLevel: "INFO",
            authorUser: { firstName: "Marie", lastName: "Ateba" },
          },
        ]);
      }
      if (url.includes("/health/reports")) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    render(<ChildSantePage />);

    await waitFor(() => {
      expect(screen.getByText("Allergie arachides")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Soins à l'école"));
    await waitFor(() => {
      expect(screen.getByText("Chute dans la cour")).toBeInTheDocument();
    });
  });

  it("signale un événement de santé et rafraîchit la liste", async () => {
    let reportCreated = false;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/schools/college-vogt/me"))
        return jsonResponse(mePayload);
      if (url.includes("/health/conditions")) return jsonResponse([]);
      if (url.includes("/health/care-events")) return jsonResponse([]);
      if (url.includes("/health/reports") && method === "POST") {
        reportCreated = true;
        return jsonResponse({ id: "report-1" }, 201);
      }
      if (url.includes("/health/reports")) {
        return jsonResponse(
          reportCreated
            ? [
                {
                  id: "report-1",
                  type: "ACCIDENT",
                  alertLevel: "ATTENTION",
                  description: "Crise d'asthme hier soir",
                  sportRestriction: false,
                  createdAt: new Date().toISOString(),
                  acknowledgedAt: null,
                },
              ]
            : [],
        );
      }
      return jsonResponse({}, 404);
    });

    render(<ChildSantePage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Événements hors école"));

    const descriptionField = await screen.findByPlaceholderText(
      "Décrivez la situation",
    );
    fireEvent.change(descriptionField, {
      target: { value: "Crise d'asthme hier soir" },
    });

    fireEvent.click(screen.getByText("Signaler cet événement"));

    await waitFor(() => {
      expect(screen.getByText("Crise d'asthme hier soir")).toBeInTheDocument();
    });
  });
});
