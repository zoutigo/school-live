import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertNoHorizontalOverflowAt320,
  setViewportWidth,
} from "../../../../../test/responsive";
import DashboardPage from "./page";

const replaceMock = vi.fn();
let paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  useParams: () => paramsMock,
}));

vi.mock("../../../../../components/feed/family-feed-page", () => ({
  FamilyFeedPage: () => <div>Family feed stub</div>,
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DashboardPage parent cards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    setViewportWidth(1280);
  });

  it("renders actionable parent cards with links to discipline, notes and account pages", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          linkedStudents: [
            {
              id: "student-1",
              firstName: "Remi",
              lastName: "Ntamack",
            },
            {
              id: "student-2",
              firstName: "Lisa",
              lastName: "Ntamack",
            },
          ],
        });
      }

      if (url.includes("/auth/me/parent-dashboard-summary")) {
        return createJsonResponse({
          unreadMessages: 2,
          payments: {
            connected: false,
            pendingCount: null,
            overdueCount: null,
            detail:
              "Le module comptable n'est pas encore connecte aux donnees parent.",
          },
          documents: {
            recentCount: 1,
            totalPublishedCount: 2,
            detail: "1 bulletin publie recemment.",
            latest: [
              {
                id: "report-1",
                title: "2eme trimestre - Remi Ntamack",
                publishedAt: "2026-03-12T09:00:00.000Z",
              },
            ],
          },
        });
      }

      if (url.includes("/students/student-1/life-events")) {
        return createJsonResponse([
          {
            id: "evt-1",
            type: "RETARD",
            occurredAt: "2026-03-10T08:10:00.000Z",
            durationMinutes: 10,
            justified: true,
            reason: "Transport",
            comment: null,
          },
        ]);
      }

      if (url.includes("/students/student-2/life-events")) {
        return createJsonResponse([]);
      }

      if (url.includes("/students/student-1/notes")) {
        return createJsonResponse([
          {
            term: "TERM_2",
            label: "2eme trimestre",
            councilLabel: "",
            generatedAtLabel: "",
            generalAverage: {
              student: 13.8,
              class: 12.1,
              min: 8.4,
              max: 17.2,
            },
            subjects: [
              {
                id: "subject-ang",
                subjectLabel: "Anglais",
                teachers: [],
                coefficient: 1,
                studentAverage: 13.8,
                classAverage: 12,
                classMin: 7,
                classMax: 18,
                evaluations: [
                  {
                    id: "eval-1",
                    label: "Oral",
                    score: 14,
                    maxScore: 20,
                    recordedAt: "2026-03-10T08:00:00.000Z",
                  },
                  {
                    id: "eval-2",
                    label: "Controle",
                    score: undefined,
                    maxScore: 20,
                    recordedAt: "2026-03-11T08:00:00.000Z",
                  },
                ],
              },
              {
                id: "subject-geo",
                subjectLabel: "Geographie",
                teachers: [],
                coefficient: 1,
                studentAverage: 13.4,
                classAverage: 12,
                classMin: 7,
                classMax: 18,
                evaluations: [
                  {
                    id: "eval-3",
                    label: "DS",
                    score: 12.5,
                    maxScore: 20,
                    recordedAt: "2026-03-09T08:00:00.000Z",
                  },
                ],
              },
            ],
          },
        ]);
      }

      if (url.includes("/students/student-2/notes")) {
        return createJsonResponse([
          {
            term: "TERM_2",
            label: "2eme trimestre",
            councilLabel: "",
            generatedAtLabel: "",
            generalAverage: {
              student: 15.2,
              class: 12.1,
              min: 8.4,
              max: 17.2,
            },
            subjects: [
              {
                id: "subject-math",
                subjectLabel: "Mathematiques",
                teachers: [],
                coefficient: 1,
                studentAverage: 15.2,
                classAverage: 12,
                classMin: 7,
                classMax: 18,
                evaluations: [
                  {
                    id: "eval-4",
                    label: "Controle",
                    score: 16,
                    maxScore: 20,
                    recordedAt: "2026-03-08T08:00:00.000Z",
                  },
                ],
              },
            ],
          },
        ]);
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Robert Ntamack" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Vie scolaire")).toBeInTheDocument();
      expect(screen.getByText("Resultats recents")).toBeInTheDocument();
      expect(screen.getByText("Mon espace parent")).toBeInTheDocument();
    });

    expect(screen.getByText(/Suivez en un coup d'oeil/i)).toBeInTheDocument();
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("2 enfants suivis")).toBeInTheDocument();
    expect(
      screen.queryByText(/Vue d'ensemble de votre espace/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Tableau mis a jour pour une lecture rapide/i),
    ).not.toBeInTheDocument();

    expect(screen.getAllByText("Remi Ntamack").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.getAllByText("Lisa Ntamack").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();

    const disciplineLink = screen.getByRole("link", {
      name: /Remi Ntamack.*Ouvrir le detail discipline/i,
    });
    expect(disciplineLink).toHaveAttribute(
      "href",
      "/schools/college-vogt/children/student-1/vie-scolaire",
    );

    const notesLink = screen.getByRole("link", {
      name: /Remi Ntamack.*Ouvrir les evaluations/i,
    });
    expect(notesLink).toHaveAttribute(
      "href",
      "/schools/college-vogt/children/student-1/notes",
    );

    expect(
      screen.getByRole("link", { name: /Paiements\s+--/i }),
    ).toHaveAttribute("href", "/schools/college-vogt/situation-financiere");
    expect(
      screen.getByRole("link", { name: /Messages non lus\s+2/i }),
    ).toHaveAttribute("href", "/schools/college-vogt/messagerie");
    expect(
      screen.getByRole("link", { name: /Documents recents\s+1/i }),
    ).toHaveAttribute("href", "/schools/college-vogt/documents");
    expect(
      screen.queryByRole("link", { name: /^Messagerie$/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the account card as compact clickable rows without item subtitles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          linkedStudents: [
            {
              id: "student-1",
              firstName: "Remi",
              lastName: "Ntamack",
            },
          ],
        });
      }

      if (url.includes("/auth/me/parent-dashboard-summary")) {
        return createJsonResponse({
          unreadMessages: 4,
          payments: {
            connected: false,
            pendingCount: null,
            overdueCount: null,
            detail:
              "Le module comptable n'est pas encore connecte aux donnees parent.",
          },
          documents: {
            recentCount: 1,
            totalPublishedCount: 1,
            detail: "1 bulletin publie recemment.",
            latest: [
              {
                id: "report-1",
                title: "2eme trimestre - Remi Ntamack",
                publishedAt: "2026-03-12T09:00:00.000Z",
              },
            ],
          },
        });
      }

      if (url.includes("/students/student-1/life-events")) {
        return createJsonResponse([]);
      }

      if (url.includes("/students/student-1/notes")) {
        return createJsonResponse([]);
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Mon espace parent")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /Paiements\s+--/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Messages non lus\s+4/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Documents recents\s+1/i }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        "Le module comptable n'est pas encore connecte aux donnees parent.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Boite de reception a jour"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("2eme trimestre - Remi Ntamack"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Paiements$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Documents$/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects to login when profile loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createJsonResponse({ message: "Unauthorized" }, 401),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/schools/college-vogt/login");
    });
  });

  it("renders a compact hero without the removed right-side panel", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          linkedStudents: [
            {
              id: "student-1",
              firstName: "Remi",
              lastName: "Ntamack",
            },
          ],
        });
      }

      if (url.includes("/auth/me/parent-dashboard-summary")) {
        return createJsonResponse({
          unreadMessages: 0,
          payments: {
            connected: false,
            pendingCount: null,
            overdueCount: null,
            detail:
              "Le module comptable n'est pas encore connecte aux donnees parent.",
          },
          documents: {
            recentCount: 0,
            totalPublishedCount: 0,
            detail: "Aucun bulletin publie recemment.",
            latest: [],
          },
        });
      }

      if (url.includes("/students/student-1/life-events")) {
        return createJsonResponse([]);
      }

      if (url.includes("/students/student-1/notes")) {
        return createJsonResponse([]);
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Robert Ntamack" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Accueil famille")).toBeInTheDocument();
    expect(screen.queryByText("Profil actif")).not.toBeInTheDocument();
    expect(screen.queryByText("Lecture du tableau")).not.toBeInTheDocument();
    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
    expect(screen.getByText("1 enfant suivi")).toBeInTheDocument();
  });

  it("keeps the parent dashboard constrained at 320px", async () => {
    setViewportWidth(320);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Robert",
          lastName: "Ntamack",
          role: "PARENT",
          linkedStudents: [
            {
              id: "student-1",
              firstName: "Remi",
              lastName: "Ntamack",
            },
          ],
        });
      }

      if (url.includes("/auth/me/parent-dashboard-summary")) {
        return createJsonResponse({
          unreadMessages: 1,
          payments: {
            connected: false,
            pendingCount: null,
            overdueCount: null,
            detail:
              "Le module comptable n'est pas encore connecte aux donnees parent.",
          },
          documents: {
            recentCount: 1,
            totalPublishedCount: 1,
            detail: "1 bulletin publie recemment.",
            latest: [
              {
                id: "report-1",
                title: "2eme trimestre - Remi Ntamack",
                publishedAt: "2026-03-12T09:00:00.000Z",
              },
            ],
          },
        });
      }

      if (url.includes("/students/student-1/life-events")) {
        return createJsonResponse([]);
      }

      if (url.includes("/students/student-1/notes")) {
        return createJsonResponse([
          {
            term: "TERM_2",
            label: "2eme trimestre",
            councilLabel: "",
            generatedAtLabel: "",
            generalAverage: {
              student: 13.8,
              class: 12.1,
              min: 8.4,
              max: 17.2,
            },
            subjects: [
              {
                id: "subject-ang",
                subjectLabel: "Anglais",
                teachers: [],
                coefficient: 1,
                studentAverage: 13.8,
                classAverage: 12,
                classMin: 7,
                classMax: 18,
                evaluations: [
                  {
                    id: "eval-1",
                    label: "Oral",
                    score: 14,
                    maxScore: 20,
                    recordedAt: "2026-03-10T08:00:00.000Z",
                  },
                ],
              },
            ],
          },
        ]);
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument();
    });

    assertNoHorizontalOverflowAt320(screen.getByTestId("dashboard-root"));
  });
});
