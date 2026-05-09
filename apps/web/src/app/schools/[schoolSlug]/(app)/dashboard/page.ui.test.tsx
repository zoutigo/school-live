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

    expect(screen.getByTestId("dashboard-root").className).not.toContain(
      "max-w-[",
    );
    assertNoHorizontalOverflowAt320(screen.getByTestId("dashboard-root"));
  });
});

describe("DashboardPage role dashboards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    setViewportWidth(1280);
  });

  it("renders rich teacher dashboard with hero, classes grid, and all section cards", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.split("?")[0]?.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Laure",
          lastName: "Fotsing",
          role: "TEACHER",
        });
      }

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return createJsonResponse({
          schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
          selectedSchoolYearId: "sy-1",
          assignments: [
            {
              classId: "6e-a",
              subjectId: "math-1",
              className: "6e A",
              subjectName: "Mathematiques",
              schoolYearId: "sy-1",
            },
            {
              classId: "5e-b",
              subjectId: "math-1",
              className: "5e B",
              subjectName: "Mathematiques",
              schoolYearId: "sy-1",
            },
          ],
          students: [
            { studentId: "s1", classId: "6e-a" },
            { studentId: "s2", classId: "6e-a" },
            { studentId: "s3", classId: "5e-b" },
          ],
        });
      }

      if (
        url.includes("/schools/college-vogt/messages") &&
        url.includes("folder=inbox")
      ) {
        return createJsonResponse({
          items: [
            {
              id: "msg-1",
              subject: "Question sur le devoir",
              unread: true,
              sender: { firstName: "Paul", lastName: "Mvondo" },
            },
            {
              id: "msg-2",
              subject: "Reunion parents",
              unread: false,
              sender: null,
            },
          ],
          meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
        });
      }

      if (url.includes("/schools/college-vogt/messages/unread-count")) {
        return createJsonResponse({ unread: 1 });
      }

      if (url.includes("/timetable/classes/6e-a")) {
        const d = new Date();
        const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return createJsonResponse({
          occurrences: [
            {
              id: "slot-1",
              occurrenceDate: localToday,
              startMinute: 480,
              endMinute: 570,
              room: "B12",
              status: "PLANNED",
              subject: { id: "math-1", name: "Mathematiques" },
              teacherUser: { id: "teacher-1" },
            },
          ],
        });
      }

      if (url.includes("/timetable/classes/5e-b")) {
        return createJsonResponse({ occurrences: [] });
      }

      if (url.includes("/classes/6e-a/evaluations")) {
        return createJsonResponse([
          { id: "eval-1", title: "Controle Algebre", _count: { scores: 1 } },
        ]);
      }

      if (url.includes("/classes/5e-b/evaluations")) {
        return createJsonResponse([]);
      }

      if (url.includes("/classes/6e-a/homework")) {
        return createJsonResponse([
          {
            id: "hw-1",
            title: "Exercices chapitre 3",
            expectedAt: new Date(Date.now() + 86400000).toISOString(),
            summary: { doneStudents: 1 },
          },
        ]);
      }

      if (url.includes("/classes/5e-b/homework")) {
        return createJsonResponse([]);
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    // Wait for all data to be fully loaded in one pass: this avoids
    // asserting between the first setState (me) and the second (richTeacher).
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Laure Fotsing" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Accueil enseignant")).toBeInTheDocument();

      // Classes grid — appears only when richTeacher.classes is populated
      expect(screen.getByTestId("teacher-class-card-6e-a")).toBeInTheDocument();
      expect(screen.getByTestId("teacher-class-card-5e-b")).toBeInTheDocument();

      // Section card containers
      expect(
        screen.getByTestId("section-teacher-messages"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("section-teacher-timetable"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("section-teacher-evals")).toBeInTheDocument();
      expect(
        screen.getByTestId("section-teacher-homework"),
      ).toBeInTheDocument();

      // Message content
      expect(screen.getByText("Question sur le devoir")).toBeInTheDocument();
      expect(screen.getByText("Paul Mvondo")).toBeInTheDocument();

      // Timetable slot
      expect(screen.getByTestId("teacher-slot-slot-1")).toBeInTheDocument();
      expect(screen.getAllByText("Mathematiques").length).toBeGreaterThan(0);

      // Evaluations
      expect(screen.getByTestId("teacher-eval-eval-1")).toBeInTheDocument();
      expect(screen.getByText("Controle Algebre")).toBeInTheDocument();

      // Homework
      expect(screen.getByTestId("teacher-hw-hw-1")).toBeInTheDocument();
      expect(screen.getByText("Exercices chapitre 3")).toBeInTheDocument();
    });

    const messagingLinks = screen
      .getAllByRole("link")
      .filter(
        (l) => l.getAttribute("href") === "/schools/college-vogt/messagerie",
      );
    expect(messagingLinks.length).toBeGreaterThanOrEqual(1);

    const notesLinks = screen
      .getAllByRole("link")
      .filter(
        (l) =>
          l.getAttribute("href") === "/schools/college-vogt/student-grades",
      );
    expect(notesLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders teacher empty states when no data is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.split("?")[0]?.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Laure",
          lastName: "Fotsing",
          role: "TEACHER",
        });
      }

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return createJsonResponse({
          schoolYears: [],
          selectedSchoolYearId: null,
          assignments: [],
          students: [],
        });
      }

      if (
        url.includes("/schools/college-vogt/messages") &&
        url.includes("folder=inbox")
      ) {
        return createJsonResponse({ items: [], meta: {} });
      }

      if (url.includes("/schools/college-vogt/messages/unread-count")) {
        return createJsonResponse({ unread: 0 });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("teacher-dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("Aucun message non lu")).toBeInTheDocument();
    expect(
      screen.getByText("Aucun cours planifie aujourd'hui"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Toutes les notes sont a jour"),
    ).toBeInTheDocument();
    expect(screen.getByText("Aucun devoir en cours")).toBeInTheDocument();
  });

  it("keeps teacher dashboard constrained at 320px", async () => {
    setViewportWidth(320);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.split("?")[0]?.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Laure",
          lastName: "Fotsing",
          role: "TEACHER",
        });
      }

      if (url.includes("/schools/college-vogt/student-grades/context")) {
        return createJsonResponse({
          schoolYears: [],
          selectedSchoolYearId: null,
          assignments: [],
          students: [],
        });
      }

      if (
        url.includes("/schools/college-vogt/messages") &&
        url.includes("folder=inbox")
      ) {
        return createJsonResponse({ items: [], meta: {} });
      }

      if (url.includes("/schools/college-vogt/messages/unread-count")) {
        return createJsonResponse({ unread: 0 });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-root")).toBeInTheDocument();
    });

    assertNoHorizontalOverflowAt320(screen.getByTestId("dashboard-root"));
  });

  it("renders school operations hero and cards for school admin", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          firstName: "Anne",
          lastName: "Rousselot",
          role: "SCHOOL_ADMIN",
        });
      }

      if (url.includes("/admin/classrooms")) {
        return createJsonResponse([{ id: "c1" }, { id: "c2" }, { id: "c3" }]);
      }

      if (url.includes("/admin/students")) {
        return createJsonResponse([{ id: "s1" }, { id: "s2" }]);
      }

      if (url.includes("/admin/teachers")) {
        return createJsonResponse([{ id: "t1" }, { id: "t2" }]);
      }

      if (url.includes("/admin/teacher-assignments")) {
        return createJsonResponse([{ id: "a1" }, { id: "a2" }, { id: "a3" }]);
      }

      if (url.includes("/schools/college-vogt/messages/unread-count")) {
        return createJsonResponse({ unread: 5 });
      }

      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Bienvenue, Anne Rousselot" }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Accueil etablissement")).toBeInTheDocument();
    expect(screen.getByText("Structure")).toBeInTheDocument();
    expect(screen.getByText("Scolarite")).toBeInTheDocument();
    expect(screen.getByText("Coordination")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Classes\s+3/i })).toHaveAttribute(
      "href",
      "/classes",
    );
    expect(screen.getByRole("link", { name: /Eleves\s+2/i })).toHaveAttribute(
      "href",
      "/eleves",
    );
    expect(
      screen.getByRole("link", { name: /Enseignants\s+2/i }),
    ).toHaveAttribute("href", "/teachers");
    const messagingLink = screen
      .getAllByRole("link")
      .find(
        (link) =>
          link.getAttribute("href") === "/schools/college-vogt/messagerie",
      );
    expect(messagingLink).toBeDefined();
  });
});
