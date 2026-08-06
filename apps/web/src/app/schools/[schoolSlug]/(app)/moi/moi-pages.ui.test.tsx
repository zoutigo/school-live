/**
 * Vérifie les pages self (rôle STUDENT) sous /moi/* : elles résolvent leur
 * propre identité (schoolSlug uniquement dans l'URL, pas de childId) via
 * /me + /timetable/me, puis réutilisent les mêmes composants centraux que
 * les pages parent (StudentLifePanel, StudentNotesPage, ChildModulePage).
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyVieScolairePage from "./vie-scolaire/page";
import MyClassLifePage from "./vie-de-classe/page";
import MyNotesPage from "./notes/page";
import MyCahierDeTextePage from "./cahier-de-texte/page";
import { useOnboardingTourStore } from "../../../../../store/onboarding-tour";

function resetOnboardingTourStore() {
  useOnboardingTourStore.setState({
    completedTours: {},
    activeTourId: null,
    activeRole: null,
    steps: [],
    stepIndex: 0,
    targetRect: null,
  });
}

const paramsMock = { schoolSlug: "college-vogt" };
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../../../../../components/feed/feed-api", () => ({
  canUseBackendFeed: () => true,
  listFeedPosts: vi.fn(async () => ({
    items: [],
    meta: { page: 1, totalPages: 1, total: 0, limit: 12 },
  })),
  createFeedPost: vi.fn(),
  updateFeedPost: vi.fn(),
  deleteFeedPost: vi.fn(),
  toggleFeedLike: vi.fn(),
  addFeedComment: vi.fn(),
  voteFeedPoll: vi.fn(),
  uploadFeedInlineImage: vi.fn(),
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockSelfFetch(options: { onboardingHelpEnabled?: boolean } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);

    if (url.includes("/schools/college-vogt/me")) {
      return createJsonResponse({
        role: "STUDENT",
        onboardingHelpEnabled: options.onboardingHelpEnabled,
      });
    }

    if (url.endsWith("/timetable/me")) {
      return createJsonResponse({
        student: { id: "self-1", firstName: "Lisa", lastName: "Mbele" },
        class: { id: "class-1", name: "6e A" },
      });
    }

    if (url.includes("/students/self-1/life-events")) {
      return createJsonResponse([]);
    }

    if (url.includes("/students/self-1/notes")) {
      return createJsonResponse([]);
    }

    return createJsonResponse({});
  });
}

describe("Pages self /moi/*", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    resetOnboardingTourStore();
  });

  it("moi/vie-scolaire résout sa propre identité et affiche son propre nom", async () => {
    mockSelfFetch();
    render(<MyVieScolairePage />);

    await waitFor(() => {
      expect(screen.getByText("Lisa Mbele")).toBeInTheDocument();
    });
  });

  it("moi/vie-de-classe résout sa propre identité (mode self de ChildModulePage)", async () => {
    mockSelfFetch();
    render(<MyClassLifePage />);

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      );
    });
  });

  it("moi/notes résout sa propre identité puis charge ses notes", async () => {
    const fetchSpy = mockSelfFetch();
    render(<MyNotesPage />);

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([input]) =>
          String(input).includes("/students/self-1/notes"),
        ),
      ).toBe(true);
    });
  });

  it("moi/cahier-de-texte ne redirige pas un élève vers le dashboard", async () => {
    mockSelfFetch();
    render(<MyCahierDeTextePage />);

    await waitFor(() => {
      expect(replaceMock).not.toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      );
    });
  });
});

describe("Tour + aide guidée - moi/vie-scolaire (élève)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    resetOnboardingTourStore();
  });

  it("le tour démarre automatiquement pour un élève", async () => {
    mockSelfFetch();
    render(<MyVieScolairePage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "vie-scolaire",
      );
    });
    expect(useOnboardingTourStore.getState().activeRole).toBe("student");
  });

  it("onboardingHelpEnabled=false : pas de tour", async () => {
    mockSelfFetch({ onboardingHelpEnabled: false });
    render(<MyVieScolairePage />);

    await waitFor(() => {
      expect(screen.getByText("Lisa Mbele")).toBeInTheDocument();
    });

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("le bouton d'aide ouvre la modale et se ferme au clic sur Fermer", async () => {
    mockSelfFetch({ onboardingHelpEnabled: false });
    render(<MyVieScolairePage />);

    await waitFor(() => {
      expect(screen.getByTestId("vie-scolaire-help-toggle")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("vie-scolaire-help-toggle"));

    expect(screen.getByTestId("help-dialog")).toBeInTheDocument();
    expect(
      screen.getByTestId("help-dialog").querySelector("#help-dialog-title"),
    ).toHaveTextContent("Vie scolaire");

    fireEvent.click(screen.getByTestId("help-dialog-close"));

    expect(screen.queryByTestId("help-dialog")).not.toBeInTheDocument();
  });
});
