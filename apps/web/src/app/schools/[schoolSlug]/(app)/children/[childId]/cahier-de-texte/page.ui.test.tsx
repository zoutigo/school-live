import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildCahierDeTextePage from "./page";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";
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

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function buildMePayload(onboardingHelpEnabled?: boolean) {
  return {
    role: "PARENT",
    onboardingHelpEnabled,
    linkedStudents: [
      {
        id: "child-1",
        firstName: "Lisa",
        lastName: "Mbele",
        currentEnrollment: { class: { id: "class-1", name: "6eB" } },
      },
    ],
  };
}

const HOMEWORK_1 = {
  id: "hw-1",
  classId: "class-1",
  title: "Apprendre le vocabulaire",
  contentHtml: "<p>Reprendre la lecon.</p>",
  expectedAt: new Date("2026-05-01T19:00:00Z").toISOString(),
  createdAt: new Date("2026-04-01T10:00:00Z").toISOString(),
  updatedAt: new Date("2026-04-01T10:00:00Z").toISOString(),
  authorUserId: "teacher-1",
  authorDisplayName: "Valery Mbele",
  subject: { id: "sub-1", name: "Anglais", colorHex: null },
  attachments: [],
  commentsCount: 1,
  summary: null,
  myDoneAt: null,
};

const HOMEWORK_DETAIL_1 = {
  ...HOMEWORK_1,
  comments: [
    {
      id: "comment-1",
      authorUserId: "teacher-1",
      authorDisplayName: "Valery Mbele",
      body: "Pensez a bien reviser.",
      createdAt: new Date("2026-05-01T08:00:00Z").toISOString(),
      updatedAt: new Date("2026-05-01T08:00:00Z").toISOString(),
    },
  ],
  completionStatuses: [],
};

function mockFetchDefault(overrides: {
  onboardingHelpEnabled?: boolean;
  homeworkList?: unknown;
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
      return jsonResponse(buildMePayload(overrides.onboardingHelpEnabled));
    if (url.includes("/classes/class-1/homework/hw-1") && !init?.method) {
      return jsonResponse(HOMEWORK_DETAIL_1);
    }
    if (url.includes("/classes/class-1/homework")) {
      return jsonResponse(overrides.homeworkList ?? [HOMEWORK_1]);
    }
    return jsonResponse({}, 404);
  });
}

describe("Child cahier de texte page (vue parent)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
    window.localStorage.clear();
    resetOnboardingTourStore();
  });

  it("charge le cahier de texte de l'enfant en scopant les appels avec studentId", async () => {
    let listUrl = "";
    mockFetchDefault({
      onboardingHelpEnabled: false,
      onRequest: (url) => {
        if (
          url.includes("/classes/class-1/homework") &&
          !url.includes("hw-1")
        ) {
          listUrl = url;
        }
        return undefined;
      },
    });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(screen.getByText("Apprendre le vocabulaire")).toBeInTheDocument();
    });

    expect(listUrl).toContain("studentId=child-1");
    expect(screen.getByText("MBELE Lisa - 6eB")).toBeInTheDocument();
  });

  it("ouvre le detail d'un devoir, affiche les consignes et permet de commenter", async () => {
    let commentBody: unknown = null;
    mockFetchDefault({
      onboardingHelpEnabled: false,
      onRequest: (url, init) => {
        if (
          url.includes("/homework/hw-1/comments") &&
          init?.method === "POST"
        ) {
          commentBody = JSON.parse(String(init.body));
          return jsonResponse({
            ...HOMEWORK_DETAIL_1,
            comments: [
              ...HOMEWORK_DETAIL_1.comments,
              {
                id: "comment-2",
                authorUserId: "parent-1",
                authorDisplayName: "Pierre Wome",
                body: "Merci pour l'information.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          });
        }
        return undefined;
      },
    });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(screen.getByText("Apprendre le vocabulaire")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));

    await waitFor(() => {
      expect(screen.getByText("Reprendre la lecon.")).toBeInTheDocument();
    });
    expect(screen.getByText("Pensez a bien reviser.")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("homework-comment-input"), {
      target: { value: "Merci pour l'information." },
    });
    fireEvent.click(screen.getByTestId("homework-comment-submit"));

    await waitFor(() => {
      expect(screen.getByText("Merci pour l'information.")).toBeInTheDocument();
    });
    expect(commentBody).toMatchObject({
      body: "Merci pour l'information.",
      studentId: "child-1",
    });
  });

  it("marque un devoir fait pour l'enfant via la case a cocher, en passant studentId", async () => {
    let completionBody: unknown = null;
    mockFetchDefault({
      onboardingHelpEnabled: false,
      onRequest: (url, init) => {
        if (
          url.includes("/homework/hw-1/completion") &&
          init?.method === "PATCH"
        ) {
          completionBody = JSON.parse(String(init.body));
          return jsonResponse({
            ...HOMEWORK_DETAIL_1,
            myDoneAt: new Date().toISOString(),
          });
        }
        return undefined;
      },
    });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(screen.getByText("Apprendre le vocabulaire")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-row-hw-1"));
    await waitFor(() => {
      expect(screen.getByTestId("homework-toggle-done")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("homework-toggle-done"));

    await waitFor(() => {
      expect(screen.getByText("Marquer non fait")).toBeInTheDocument();
    });
    expect(completionBody).toMatchObject({
      done: true,
      studentId: "child-1",
    });
  });

  it("affiche l'onglet Voir avec les compteurs de la classe de l'enfant", async () => {
    mockFetchDefault({
      onboardingHelpEnabled: false,
      homeworkList: [
        {
          ...HOMEWORK_1,
          expectedAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          ...HOMEWORK_1,
          id: "hw-2",
          title: "Devoir en retard",
          expectedAt: new Date("2020-01-01T08:00:00Z").toISOString(),
        },
      ],
    });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(screen.getByText("Apprendre le vocabulaire")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Voir"));

    await waitFor(() => {
      expect(screen.getByText("Devoirs").nextSibling).toHaveTextContent("2");
    });
    const late = screen.getByText("En retard").nextSibling;
    const todo = screen.getByText("A faire").nextSibling;
    expect(late).toHaveTextContent("1");
    expect(todo).toHaveTextContent("1");
  });

  it("enregistre le contenu d'aide dans le menu lateral", async () => {
    usePageHelpStore.setState({ entry: null, open: false });
    mockFetchDefault({ onboardingHelpEnabled: false });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(usePageHelpStore.getState().entry?.title).toBe("Devoirs — Liste");
    });
  });

  it("demarre le tour d'aide pour un parent et affiche une ligne de demonstration", async () => {
    mockFetchDefault({});

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(useOnboardingTourStore.getState().activeTourId).toBe("homework");
    });
    expect(useOnboardingTourStore.getState().activeRole).toBe("parent");

    await waitFor(() => {
      expect(
        screen.getByTestId("homework-row-homework-tour-fallback"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("homework-row-hw-1")).not.toBeInTheDocument();
  });

  it("le tour se termine : la ligne de demonstration disparait, les vrais devoirs reapparaissent", async () => {
    mockFetchDefault({});

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("homework-row-homework-tour-fallback"),
      ).toBeInTheDocument();
    });

    act(() => {
      useOnboardingTourStore.getState().finish();
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("homework-row-homework-tour-fallback"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
  });

  it("onboardingHelpEnabled=false : pas de tour, les vrais devoirs s'affichent directement", async () => {
    mockFetchDefault({ onboardingHelpEnabled: false });

    render(<ChildCahierDeTextePage />);

    await waitFor(() => {
      expect(screen.getByTestId("homework-row-hw-1")).toBeInTheDocument();
    });

    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });
});
