import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolSantePage from "./page";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";
import { HEALTH_SCHOOL_TOUR_ID } from "../../../../../components/health/health-school-tour.config";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const CLASSES = [{ id: "class-1", name: "6eC" }];

const STATS = {
  activeConditionsByAlertLevel: { INFO: 2, ATTENTION: 1, URGENT: 3 },
  activeConditionsTotal: 6,
  studentsWithActiveConditions: 4,
  careEventsLast7Days: 5,
  careEventsLast30Days: 20,
  reportsPendingAcknowledgement: 2,
};

const REPORT_1 = {
  id: "report-1",
  type: "ACCIDENT",
  alertLevel: "URGENT",
  description: "Crise d'asthme",
  createdAt: new Date("2026-02-05T10:00:00Z").toISOString(),
  acknowledgedAt: null,
  student: {
    id: "student-1",
    firstName: "Nathan",
    lastName: "Mbele",
    class: { id: "class-1", name: "6eC" },
  },
};

const STUDENT_1 = {
  id: "student-1",
  firstName: "Nathan",
  lastName: "Mbele",
  class: { id: "class-1", name: "6eC" },
  age: 11,
};

function mockFetchDefault() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ onboardingHelpEnabled: false });
    }
    if (url.includes("/admin/classrooms")) return jsonResponse(CLASSES);
    if (url.includes("/health/stats")) return jsonResponse(STATS);
    if (url.includes("/health/reports"))
      return jsonResponse({ items: [], total: 0 });
    if (url.includes("/health/students"))
      return jsonResponse({ items: [], total: 0 });
    return jsonResponse({}, 404);
  });
}

describe("School sante page (vue école — responsable santé)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
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
      if (url.endsWith("/schools/college-vogt/me")) return jsonResponse({});
      if (url.includes("/admin/classrooms")) return jsonResponse(CLASSES);
      if (url.includes("/health/stats")) return jsonResponse(STATS);
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

  it("charge et affiche les statistiques (onglet Synthèse) au montage", async () => {
    mockFetchDefault();
    render(<SchoolSantePage />);

    await waitFor(() => {
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  it("recharge les statistiques quand on change de classe", async () => {
    const fetchMock = mockFetchDefault();
    render(<SchoolSantePage />);
    await waitFor(() => expect(screen.getByText("6")).toBeInTheDocument());

    fireEvent.change(screen.getByTestId("sante-stats-class"), {
      target: { value: "class-1" },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("/health/stats?classId=class-1"),
        ),
      ).toBe(true);
    });
  });

  it("onglet Cares : charge les signalements, recherche et filtre", async () => {
    const fetchMock = mockFetchDefault();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) return jsonResponse({});
      if (url.includes("/admin/classrooms")) return jsonResponse(CLASSES);
      if (url.includes("/health/reports"))
        return jsonResponse({ items: [REPORT_1], total: 1 });
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);
    fireEvent.click(screen.getByTestId("sante-tab-cares"));

    await waitFor(() => screen.getByTestId("sante-cares-item-report-1"));
    expect(screen.getByText("Mbele Nathan")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("sante-cares-filter-status"), {
      target: { value: "false" },
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("acknowledged=false"),
        ),
      ).toBe(true);
    });
  });

  it("onglet Cares : le clic sur une card navigue vers la fiche élève avec les métadonnées en query", async () => {
    const fetchMock = mockFetchDefault();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/admin/classrooms")) return jsonResponse(CLASSES);
      if (url.includes("/health/reports"))
        return jsonResponse({ items: [REPORT_1], total: 1 });
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);
    fireEvent.click(screen.getByTestId("sante-tab-cares"));
    await waitFor(() => screen.getByTestId("sante-cares-item-report-1"));

    fireEvent.click(screen.getByTestId("sante-cares-item-report-1"));

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/schools/college-vogt/sante/student-1?"),
    );
    expect(pushMock.mock.calls[0][0]).toContain("firstName=Nathan");
  });

  it("onglet Élèves : charge, recherche avec debounce, et pagine", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetchDefault();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/admin/classrooms")) return jsonResponse(CLASSES);
      if (url.includes("/health/students"))
        return jsonResponse({ items: [STUDENT_1], total: 25 });
      return jsonResponse({}, 404);
    });

    render(<SchoolSantePage />);
    fireEvent.click(screen.getByTestId("sante-tab-eleves"));

    await vi.waitFor(() => screen.getByTestId("sante-eleves-item-student-1"));
    expect(screen.getByText("6eC · 11 ans")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("sante-eleves-search"), {
      target: { value: "nathan" },
    });
    await vi.advanceTimersByTimeAsync(350);

    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) =>
          String(url).includes("search=nathan"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getAllByText("Suivant")[0]);
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes("page=2")),
      ).toBe(true);
    });
    vi.useRealTimers();
  });
});
