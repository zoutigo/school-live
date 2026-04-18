import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChildAccueilPage from "./accueil/page";
import ChildVieDeClassePage from "./vie-de-classe/page";

let paramsMock = { schoolSlug: "college-vogt", childId: "child-1" };

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../../../../../../components/feed/feed-api", () => ({
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

describe("Child context web pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    paramsMock = { schoolSlug: "college-vogt", childId: "child-1" };
  });

  it("renders a synthesis dashboard on accueil instead of the class feed", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          role: "PARENT",
          linkedStudents: [
            {
              id: "child-1",
              firstName: "Remi",
              lastName: "Ntamack",
              currentEnrollment: { class: { id: "class-6ec", name: "6e C" } },
            },
          ],
        });
      }

      if (url.includes("/students/child-1/notes")) {
        return createJsonResponse([
          {
            label: "3eme trimestre",
            generatedAtLabel: "Publie le 15/04/2026",
            generalAverage: { student: 13.4 },
            subjects: [
              {
                id: "math",
                subjectLabel: "Mathematiques",
                studentAverage: 15.2,
              },
            ],
          },
        ]);
      }

      if (url.includes("/students/child-1/life-events")) {
        return createJsonResponse([
          {
            id: "evt-1",
            type: "RETARD",
            occurredAt: "2026-04-17T08:15:00.000Z",
            reason: "Transport",
            justified: true,
          },
        ]);
      }

      if (url.includes("/timetable/me?childId=child-1")) {
        return createJsonResponse({
          student: { firstName: "Remi", lastName: "Ntamack" },
          class: { name: "6e C" },
          occurrences: [
            {
              id: "occ-1",
              occurrenceDate: "2099-04-17",
              startMinute: 525,
              endMinute: 600,
              status: "PLANNED",
              room: "B45",
              subject: { name: "Anglais" },
              teacherUser: { firstName: "Albert", lastName: "Mvondo" },
            },
          ],
        });
      }

      if (url.includes("/messages/unread-count")) {
        return createJsonResponse({ unread: 3 });
      }

      if (url.includes("/messages?folder=inbox")) {
        return createJsonResponse({
          items: [
            {
              id: "msg-1",
              subject: "Rappel de composition",
              preview: "La composition de mathematiques est maintenue.",
              createdAt: "2026-04-17T07:30:00.000Z",
            },
          ],
        });
      }

      return createJsonResponse({});
    });

    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getByText("Tableau de bord enfant")).toBeInTheDocument();
    });
    expect(screen.getByText("Moyenne generale")).toBeInTheDocument();
    expect(screen.getByText("Messages non lus")).toBeInTheDocument();
    expect(screen.getByText("Acces rapides")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Notes Evaluations et moyennes" }),
    ).toHaveAttribute("href", "/schools/college-vogt/children/child-1/notes");
    expect(
      screen.getByRole("link", {
        name: "Vie de classe Fil et actualites de classe",
      }),
    ).toHaveAttribute(
      "href",
      "/schools/college-vogt/children/child-1/vie-de-classe",
    );
    expect(
      screen.getByRole("link", {
        name: "Emploi du temps Cours et prochains creneaux",
      }),
    ).toHaveAttribute(
      "href",
      "/schools/college-vogt/emploi-du-temps?childId=child-1",
    );
    expect(
      screen.queryByText("Fil d'actualite famille"),
    ).not.toBeInTheDocument();
  });

  it("renders detailed child synthesis data on accueil", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          role: "PARENT",
          linkedStudents: [
            {
              id: "child-1",
              firstName: "Remi",
              lastName: "Ntamack",
              currentEnrollment: { class: { id: "class-6ec", name: "6e C" } },
            },
          ],
        });
      }

      if (url.includes("/students/child-1/notes")) {
        return createJsonResponse([
          {
            label: "3eme trimestre",
            generatedAtLabel: "Publie le 15/04/2026",
            generalAverage: { student: 13.4 },
            subjects: [
              {
                id: "math",
                subjectLabel: "Mathematiques",
                studentAverage: 15.2,
              },
              {
                id: "history",
                subjectLabel: "Histoire",
                studentAverage: 11.1,
              },
            ],
          },
        ]);
      }

      if (url.includes("/students/child-1/life-events")) {
        return createJsonResponse([
          {
            id: "evt-1",
            type: "ABSENCE",
            occurredAt: "2026-04-17T08:15:00.000Z",
            reason: "Absence non justifiee",
            justified: false,
          },
          {
            id: "evt-2",
            type: "SANCTION",
            occurredAt: "2026-04-16T10:00:00.000Z",
            reason: "Bavardages repetes",
            justified: null,
          },
        ]);
      }

      if (url.includes("/timetable/me?childId=child-1")) {
        return createJsonResponse({
          student: { firstName: "Remi", lastName: "Ntamack" },
          class: { name: "6e C" },
          occurrences: [
            {
              id: "occ-1",
              occurrenceDate: "2099-04-17",
              startMinute: 525,
              endMinute: 600,
              status: "PLANNED",
              room: "B45",
              subject: { name: "Anglais" },
              teacherUser: { firstName: "Albert", lastName: "Mvondo" },
            },
          ],
        });
      }

      if (url.includes("/messages/unread-count")) {
        return createJsonResponse({ unread: 3 });
      }

      if (url.includes("/messages?folder=inbox")) {
        return createJsonResponse({
          items: [
            {
              id: "msg-1",
              subject: "Rappel de composition",
              preview: "La composition de mathematiques est maintenue.",
              createdAt: "2026-04-17T07:30:00.000Z",
            },
          ],
        });
      }

      return createJsonResponse({});
    });

    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getAllByText("13,40").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("NTAMACK Remi")).toBeInTheDocument();
    expect(
      screen.getByText("Vue synthese des modules de 6e C."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("13,40").length).toBeGreaterThan(0);
    expect(screen.getByText("1 absence non justifiee")).toBeInTheDocument();
    expect(screen.getByText("Mathematiques · 15,20")).toBeInTheDocument();
    expect(
      screen.getByText("Absence : Absence non justifiee"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Accedez aux publications, rappels et temps forts de 6e C.",
      ),
    ).toBeInTheDocument();
  });

  it("renders accueil fallbacks when no child data is available", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/schools/college-vogt/me")) {
        return createJsonResponse({
          role: "PARENT",
          linkedStudents: [
            {
              id: "child-1",
              firstName: "Remi",
              lastName: "Ntamack",
              currentEnrollment: { class: { id: "class-6ec", name: "6e C" } },
            },
          ],
        });
      }

      if (url.includes("/students/child-1/notes")) {
        return createJsonResponse([]);
      }

      if (url.includes("/students/child-1/life-events")) {
        return createJsonResponse([]);
      }

      if (url.includes("/timetable/me?childId=child-1")) {
        return createJsonResponse({
          student: { firstName: "Remi", lastName: "Ntamack" },
          class: { name: "6e C" },
          occurrences: [],
        });
      }

      if (url.includes("/messages/unread-count")) {
        return createJsonResponse({ unread: 0 });
      }

      if (url.includes("/messages?folder=inbox")) {
        return createJsonResponse({ items: [] });
      }

      return createJsonResponse({});
    });

    render(<ChildAccueilPage />);

    await waitFor(() => {
      expect(screen.getByText("Aucune periode publiee")).toBeInTheDocument();
    });
    expect(screen.getByText("Aucun point de vigilance")).toBeInTheDocument();
    expect(
      screen.getByText("Aucun evenement vie scolaire recent."),
    ).toBeInTheDocument();
  });

  it("renders the family feed in vie de classe", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);

        if (url.includes("/schools/college-vogt/me")) {
          return createJsonResponse({
            role: "PARENT",
            linkedStudents: [
              {
                id: "child-1",
                firstName: "Remi",
                lastName: "Ntamack",
                currentEnrollment: { class: { id: "class-6ec", name: "6e C" } },
              },
            ],
          });
        }

        return createJsonResponse({});
      });

    render(<ChildVieDeClassePage />);

    await waitFor(() => {
      expect(screen.getByTestId("family-feed-header")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Fil d'actualite de la classe de 6e C de NTAMACK Remi"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Fil d'actualite famille"),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([input]) => {
          const url = String(input);
          return (
            url.includes("/schools/college-vogt/feed?") &&
            url.includes("viewScope=CLASS") &&
            url.includes("classId=class-6ec")
          );
        }),
      ).toBe(true);
    });
  });
});
