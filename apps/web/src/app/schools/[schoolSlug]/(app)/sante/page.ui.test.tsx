import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolSantePage from "./page";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { HEALTH_SCHOOL_TOUR_ID } from "../../../../../components/health/health-school-tour.config";

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

const studentsPayload = {
  students: [
    {
      id: "student-1",
      firstName: "Nathan",
      lastName: "Mbele",
      currentEnrollment: { class: { id: "class-1", name: "6eC" } },
    },
  ],
};

const urgencyPayload = {
  student: { id: "student-1", firstName: "Nathan", lastName: "Mbele" },
  conditions: [
    {
      id: "cond-1",
      label: "Allergie arachides",
      alertLevel: "URGENT",
      active: true,
    },
  ],
  emergencyContacts: [
    { id: "parent-1", fullName: "Jean Mbele", phone: "699001122" },
  ],
};

describe("School sante page", () => {
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

  it("démarre le tour d'aide guidée santé école par défaut", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "SCHOOL_HEALTH_OFFICER" });
      }
      if (url.includes("/admin/students"))
        return jsonResponse({ students: [] });
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        HEALTH_SCHOOL_TOUR_ID,
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("school");
  });

  it("recherche un élève puis affiche sa synthèse d'urgence", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/admin/students")) return jsonResponse(studentsPayload);
      if (url.includes("/health/urgence")) return jsonResponse(urgencyPayload);
      if (url.includes("/health/care-events")) return jsonResponse([]);
      if (url.includes("/health/reports")) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);

    const studentButton = await screen.findByText(/Mbele Nathan/);
    fireEvent.click(studentButton);

    await waitFor(() => {
      expect(screen.getByText("Informations critiques")).toBeInTheDocument();
      expect(screen.getByText("Allergie arachides")).toBeInTheDocument();
    });
  });

  it("enregistre un soin pour l'élève sélectionné", async () => {
    let careCreated = false;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/admin/students")) return jsonResponse(studentsPayload);
      if (url.includes("/health/urgence")) return jsonResponse(urgencyPayload);
      if (url.includes("/health/care-events") && method === "POST") {
        careCreated = true;
        return jsonResponse({ id: "care-1" }, 201);
      }
      if (url.includes("/health/care-events")) {
        return jsonResponse(
          careCreated
            ? [
                {
                  id: "care-1",
                  summary: "Chute dans la cour",
                  description: null,
                  occurredAt: new Date().toISOString(),
                  alertLevel: "INFO",
                  authorUser: null,
                },
              ]
            : [],
        );
      }
      if (url.includes("/health/reports")) return jsonResponse([]);
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);

    const studentButton = await screen.findByText(/Mbele Nathan/);
    fireEvent.click(studentButton);

    const summaryField = await screen.findByPlaceholderText(
      "Ex : Chute dans la cour",
    );
    fireEvent.change(summaryField, { target: { value: "Chute dans la cour" } });
    fireEvent.click(screen.getByText("Enregistrer ce soin"));

    await waitFor(() => {
      expect(screen.getAllByText("Chute dans la cour").length).toBeGreaterThan(
        0,
      );
    });
  });
});
