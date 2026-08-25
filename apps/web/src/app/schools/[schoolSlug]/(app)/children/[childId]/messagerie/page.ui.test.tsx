import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildMessageriePage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
import { usePageHelpStore } from "../../../../../../../store/page-help";
import { MESSAGES_TOUR_ID } from "../../../../../../../components/messaging/messages-tour.config";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", childId: "child-1" }),
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const MESSAGE_1 = {
  id: "msg-1",
  subject: "Reunion parents-profs",
  preview: "Bonjour, la reunion aura lieu...",
  createdAt: "2026-01-10T10:00:00.000Z",
  sentAt: "2026-01-10T10:00:00.000Z",
  unread: true,
  sender: { id: "u1", firstName: "Alice", lastName: "Martin" },
  recipientsCount: 1,
  attachments: [],
};

function mockFetchDefault({
  role = "PARENT",
  onboardingHelpEnabled,
}: {
  role?: string;
  onboardingHelpEnabled?: boolean;
} = {}) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith("/me")) {
      return jsonResponse({
        role,
        linkedStudents: [
          { id: "child-1", firstName: "Nathan", lastName: "Mbele" },
        ],
        onboardingHelpEnabled,
      });
    }
    if (url.includes("/messages/unread-count")) {
      return jsonResponse({ count: 1 });
    }
    if (url.includes("/messages")) {
      return jsonResponse({
        items: [MESSAGE_1],
        meta: { page: 1, limit: 50, total: 1 },
      });
    }
    return jsonResponse({}, 404);
  });
}

describe("ChildMessageriePage — aide parent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    useOnboardingTourStore.setState({
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  it("enregistre le contenu d'aide (2 sections) au montage et le retire au démontage", async () => {
    mockFetchDefault({});

    const { unmount } = render(<ChildMessageriePage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Messagerie");
    });
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Organiser vos messages",
      "Consultation uniquement",
    ]);

    unmount();
    expect(usePageHelpStore.getState().entry).toBeNull();
  });

  it("démarre le tour d'aide guidée pour un parent par défaut", async () => {
    mockFetchDefault({});

    render(<ChildMessageriePage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        MESSAGES_TOUR_ID,
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");
  });

  it("ne démarre pas le tour si onboardingHelpEnabled est false", async () => {
    mockFetchDefault({ onboardingHelpEnabled: false });

    render(<ChildMessageriePage />);

    await waitFor(() =>
      expect(screen.getByText("Reunion parents-profs")).toBeInTheDocument(),
    );
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });

  it("redirige vers le dashboard pour un rôle non-parent, sans démarrer le tour", async () => {
    mockFetchDefault({ role: "TEACHER" });

    render(<ChildMessageriePage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });
});

describe("ChildMessageriePage — rendu", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("affiche la liste des messages et le panneau de dossiers", async () => {
    mockFetchDefault({});

    render(<ChildMessageriePage />);

    expect(
      await screen.findByText("Reunion parents-profs"),
    ).toBeInTheDocument();
  });

  it("ne propose aucune action au parent (consultation seule)", async () => {
    mockFetchDefault({});

    render(<ChildMessageriePage />);

    await screen.findByText("Reunion parents-profs");

    // Pas de composition de nouveau message.
    expect(screen.queryByText("Nouveau message")).not.toBeInTheDocument();
    // Pas d'action de tri/lecture sur la ligne du message (marquer lu/non lu).
    expect(
      screen.queryByRole("button", { name: /marquer/i }),
    ).not.toBeInTheDocument();
    // Pas de repondre/transferer/archiver/supprimer dans le lecteur.
    expect(
      screen.queryByRole("button", { name: /repondre/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /transferer/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /archiver/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /supprimer/i }),
    ).not.toBeInTheDocument();
  });
});
