import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildSantePage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { HEALTH_PARENT_TOUR_ID } from "../../../../../../../components/health/health-parent-tour.config";
import { usePageHelpStore } from "../../../../../../../store/page-help";

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

function paginated<T>(items: T[], page = 1, total = items.length) {
  return { items, page, limit: 20, total };
}

const mePayload = {
  role: "PARENT",
  linkedStudents: [{ id: "child-1", firstName: "Nathan", lastName: "Mbele" }],
};

const CONDITION_1 = {
  id: "cond-1",
  type: "ALLERGY",
  alertLevel: "URGENT",
  label: "Allergie arachides",
  description: "Ne pas donner d'arachides",
  active: true,
  isVisibleToAllTeachers: false,
  publicAlertLabel: null,
  createdAt: new Date("2026-01-01T10:00:00Z").toISOString(),
};

const CARE_EVENT_1 = {
  id: "care-1",
  summary: "Chute dans la cour",
  description: null,
  occurredAt: new Date("2026-02-01T10:00:00Z").toISOString(),
  alertLevel: "INFO",
  followUpNeeded: false,
  authorUser: { firstName: "Marie", lastName: "Ateba" },
};

function mockFetchDefault(overrides: {
  conditions?: unknown;
  history?: unknown;
  onRequest?: (
    url: string,
    init?: RequestInit,
  ) => Response | undefined | Promise<Response>;
}) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const overridden = await overrides.onRequest?.(url, init);
    if (overridden) return overridden;

    if (url.endsWith("/schools/college-vogt/me"))
      return jsonResponse(mePayload);
    if (url.includes("/health/conditions")) {
      return jsonResponse(overrides.conditions ?? paginated([]));
    }
    if (url.includes("/health/history")) {
      return jsonResponse(overrides.history ?? paginated([]));
    }
    return jsonResponse({}, 404);
  });
}

describe("Child sante page (vue parent)", () => {
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
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("enregistre le contenu d'aide de l'onglet Conditions (3 sections) au montage et le retire au démontage", async () => {
    mockFetchDefault({});

    const { unmount } = render(<ChildSantePage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Conditions",
      );
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Consulter les conditions de santé",
      "Rechercher et filtrer",
      "Ajouter ou consulter une condition",
    ]);

    unmount();
    expect(usePageHelpStore.getState().entry).toBeNull();
  });

  it("bascule vers le contenu d'aide de l'onglet Historique", async () => {
    mockFetchDefault({});

    render(<ChildSantePage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    fireEvent.click(screen.getByTestId("sante-tab-history"));

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Historique",
      );
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Consulter l'historique de santé",
      "Rechercher et filtrer",
      "Signaler un événement",
    ]);
  });

  it("démarre le tour d'aide guidée santé pour un parent par défaut", async () => {
    mockFetchDefault({});

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
      if (url.includes("/health/conditions"))
        return jsonResponse(paginated([]));
      if (url.includes("/health/history")) return jsonResponse(paginated([]));
      return jsonResponse({}, 404);
    });

    render(<ChildSantePage />);

    await waitFor(() => {
      expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    });
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("affiche les conditions au montage, puis l'historique fusionné sur l'onglet Historique", async () => {
    mockFetchDefault({
      conditions: paginated([CONDITION_1]),
      history: paginated([
        {
          kind: "CARE_EVENT",
          at: CARE_EVENT_1.occurredAt,
          payload: CARE_EVENT_1,
        },
      ]),
    });

    render(<ChildSantePage />);

    await waitFor(() => {
      expect(screen.getByText("Allergie arachides")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("sante-tab-history"));
    await waitFor(() => {
      expect(screen.getByText("Chute dans la cour")).toBeInTheDocument();
    });
  });

  it("les cartes condition et historique restent capables de rétrécir dans une grille étroite (pas d'overflow horizontal)", async () => {
    mockFetchDefault({
      conditions: paginated([CONDITION_1]),
      history: paginated([
        {
          kind: "CARE_EVENT",
          at: CARE_EVENT_1.occurredAt,
          payload: CARE_EVENT_1,
        },
      ]),
    });

    render(<ChildSantePage />);
    await waitFor(() => {
      expect(
        screen.getByTestId(`sante-condition-card-${CONDITION_1.id}`),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId(`sante-condition-card-${CONDITION_1.id}`),
    ).toHaveClass("min-w-0");

    fireEvent.click(screen.getByTestId("sante-tab-history"));
    await waitFor(() => {
      expect(
        screen.getByTestId(`sante-history-card-CARE_EVENT-${CARE_EVENT_1.id}`),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId(`sante-history-card-CARE_EVENT-${CARE_EVENT_1.id}`),
    ).toHaveClass("min-w-0");
  });

  it("recherche en live avec debounce", async () => {
    let lastConditionsUrl = "";
    mockFetchDefault({
      onRequest: (url) => {
        if (url.includes("/health/conditions")) lastConditionsUrl = url;
        return undefined;
      },
    });

    render(<ChildSantePage />);
    await waitFor(() => expect(lastConditionsUrl).toContain("page=1"));

    fireEvent.change(screen.getByTestId("sante-conditions-search-input"), {
      target: { value: "arachide" },
    });

    await waitFor(
      () => expect(lastConditionsUrl).toContain("search=arachide"),
      { timeout: 2000 },
    );
  });

  it("ouvre le panneau de filtres et applique un filtre type", async () => {
    let lastConditionsUrl = "";
    mockFetchDefault({
      onRequest: (url) => {
        if (url.includes("/health/conditions")) lastConditionsUrl = url;
        return undefined;
      },
    });

    render(<ChildSantePage />);
    await waitFor(() => expect(lastConditionsUrl).toContain("page=1"));

    fireEvent.click(screen.getByTestId("sante-conditions-filter-toggle"));
    expect(
      screen.getByTestId("sante-conditions-filter-panel"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sante-conditions-filter-type"));
    fireEvent.click(screen.getByRole("option", { name: "Allergie" }));

    await waitFor(() => expect(lastConditionsUrl).toContain("type=ALLERGY"), {
      timeout: 2000,
    });
  });

  it("bouton + → formulaire de création de condition → soumission", async () => {
    let createBody: unknown = null;
    mockFetchDefault({
      onRequest: (url, init) => {
        if (url.includes("/health/conditions") && init?.method === "POST") {
          createBody = JSON.parse(String(init.body));
          return jsonResponse({ id: "cond-2" }, 201) as unknown as Response;
        }
        return undefined;
      },
    });

    render(<ChildSantePage />);
    await waitFor(() =>
      expect(screen.getByTestId("sante-conditions-add")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("sante-conditions-add"));
    expect(screen.getByTestId("sante-condition-form")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("condition-form-label"), {
      target: { value: "Allergie arachides" },
    });
    fireEvent.click(screen.getByTestId("condition-form-submit"));

    await waitFor(() => {
      expect(createBody).toMatchObject({ label: "Allergie arachides" });
    });
    await waitFor(() => {
      expect(
        screen.queryByTestId("sante-condition-form"),
      ).not.toBeInTheDocument();
    });
  });

  it("carte condition → détail → Modifier → PATCH avec active=false", async () => {
    let patchBody: unknown = null;
    mockFetchDefault({
      conditions: paginated([CONDITION_1]),
      onRequest: (url, init) => {
        if (
          url.includes(`/health/conditions/${CONDITION_1.id}`) &&
          init?.method === "PATCH"
        ) {
          patchBody = JSON.parse(String(init.body));
          return jsonResponse({
            ...CONDITION_1,
            active: false,
          }) as unknown as Response;
        }
        return undefined;
      },
    });

    render(<ChildSantePage />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`sante-condition-card-${CONDITION_1.id}`),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByTestId(`sante-condition-card-${CONDITION_1.id}`),
    );
    expect(screen.getByTestId("sante-condition-detail")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("sante-condition-detail-edit"));
    expect(screen.getByTestId("sante-condition-form")).toBeInTheDocument();
    expect(
      (screen.getByTestId("condition-form-label") as HTMLInputElement).value,
    ).toBe("Allergie arachides");

    fireEvent.click(screen.getByTestId("condition-form-submit"));

    await waitFor(() => {
      expect(patchBody).toMatchObject({
        label: "Allergie arachides",
        active: true,
      });
    });
  });

  it("onglet Historique : bouton + → formulaire report uniquement → soumission", async () => {
    let createBody: unknown = null;
    mockFetchDefault({
      onRequest: (url, init) => {
        if (url.includes("/health/reports") && init?.method === "POST") {
          createBody = JSON.parse(String(init.body));
          return jsonResponse({ id: "report-1" }, 201) as unknown as Response;
        }
        return undefined;
      },
    });

    render(<ChildSantePage />);
    fireEvent.click(await screen.findByTestId("sante-tab-history"));
    await waitFor(() =>
      expect(screen.getByTestId("sante-history-add")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("sante-history-add"));
    expect(screen.getByTestId("sante-report-form")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("report-form-description"), {
      target: { value: "Crise d'asthme hier soir" },
    });
    fireEvent.click(screen.getByTestId("report-form-submit"));

    await waitFor(() => {
      expect(createBody).toMatchObject({
        description: "Crise d'asthme hier soir",
      });
    });
  });

  it("carte historique (soin) → détail en lecture seule", async () => {
    mockFetchDefault({
      history: paginated([
        {
          kind: "CARE_EVENT",
          at: CARE_EVENT_1.occurredAt,
          payload: CARE_EVENT_1,
        },
      ]),
    });

    render(<ChildSantePage />);
    fireEvent.click(await screen.findByTestId("sante-tab-history"));

    await waitFor(() =>
      expect(
        screen.getByTestId(`sante-history-card-CARE_EVENT-${CARE_EVENT_1.id}`),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByTestId(`sante-history-card-CARE_EVENT-${CARE_EVENT_1.id}`),
    );

    expect(screen.getByTestId("sante-history-detail")).toBeInTheDocument();
    expect(screen.getByText("Marie Ateba")).toBeInTheDocument();
  });

  it("pagination : clique sur page suivante recharge avec page=2", async () => {
    let lastConditionsUrl = "";
    mockFetchDefault({
      conditions: paginated([CONDITION_1], 1, 25),
      onRequest: (url) => {
        if (url.includes("/health/conditions")) lastConditionsUrl = url;
        return undefined;
      },
    });

    render(<ChildSantePage />);
    await waitFor(() =>
      expect(
        screen.getByTestId(`sante-condition-card-${CONDITION_1.id}`),
      ).toBeInTheDocument(),
    );

    const nextButton = screen.getByRole("button", { name: /suivant/i });
    fireEvent.click(nextButton);

    await waitFor(() => expect(lastConditionsUrl).toContain("page=2"));
  });
});
