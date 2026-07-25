import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotesAdminEntryPage from "./page";
import { useLocaleStore } from "../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../i18n/translations";

const replaceMock = vi.fn();
const pushMock = vi.fn();
const routerMock = { replace: replaceMock, push: pushMock };
let paramsMock = { schoolSlug: "college-vogt" };

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useParams: () => paramsMock,
}));

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NotesAdminEntryPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
    paramsMock = { schoolSlug: "college-vogt" };
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("shows a level/class picker for a school admin, without auto-selecting a class", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
          {
            id: "class-10",
            name: "6e B",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-browse"),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/classes/"),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to the chosen class's evaluations page once a class is picked and submitted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
          {
            id: "class-10",
            name: "6e B",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    const classSelect = await screen.findByTestId("notes-admin-entry-class");
    fireEvent.change(classSelect, { target: { value: "class-10" } });
    fireEvent.click(screen.getByTestId("notes-admin-entry-submit"));

    expect(pushMock).toHaveBeenCalledWith(
      "/schools/college-vogt/classes/class-10/notes",
    );
  });

  it("redirects away non-admin roles without calling the classrooms endpoint", async () => {
    const classroomsFetch = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "PARENT" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        classroomsFetch();
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith(
        "/schools/college-vogt/dashboard",
      ),
    );
    expect(classroomsFetch).not.toHaveBeenCalled();
  });

  it("shows an empty state when the school has no classroom", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-empty"),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/classes/"),
    );
  });

  it("affiche par defaut les evaluations de toute l'ecole sans filtre ni classe choisie", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      if (
        url === "http://localhost:3001/api/schools/college-vogt/evaluations"
      ) {
        return createJsonResponse([
          {
            id: "eval-1",
            title: "Controle histoire",
            status: "PUBLISHED",
            scheduledAt: "2026-04-01T08:00:00.000Z",
            createdAt: "2026-04-01T08:00:00.000Z",
            subject: { id: "hist", name: "Histoire" },
            subjectBranch: null,
            class: { id: "class-9", name: "6e A" },
            _count: { scores: 3 },
          },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-row-eval-1"),
    ).toBeInTheDocument();
  });

  it("navigue vers la classe de la ligne cliquee sans passer par le formulaire", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      if (
        url === "http://localhost:3001/api/schools/college-vogt/evaluations"
      ) {
        return createJsonResponse([
          {
            id: "eval-1",
            title: "Controle histoire",
            status: "PUBLISHED",
            scheduledAt: "2026-04-01T08:00:00.000Z",
            createdAt: "2026-04-01T08:00:00.000Z",
            subject: { id: "hist", name: "Histoire" },
            subjectBranch: null,
            class: { id: "class-9", name: "6e A" },
            _count: { scores: 3 },
          },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    fireEvent.click(await screen.findByTestId("notes-admin-entry-row-eval-1"));

    expect(pushMock).toHaveBeenCalledWith(
      "/schools/college-vogt/classes/class-9/notes",
    );
  });

  it("transmet le niveau choisi comme simple filtre de narrowing, sans exiger de classe", async () => {
    const evaluationsFetch = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
          {
            id: "class-10",
            name: "5e A",
            academicLevel: { id: "level-5e", label: "5ème" },
          },
        ]);
      }
      if (url.includes("/schools/college-vogt/evaluations")) {
        evaluationsFetch(url);
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    const levelSelect = await screen.findByTestId("notes-admin-entry-level");
    fireEvent.change(levelSelect, { target: { value: "level-6e" } });

    await waitFor(() => {
      expect(evaluationsFetch).toHaveBeenCalledWith(
        "http://localhost:3001/api/schools/college-vogt/evaluations?academicLevelId=level-6e",
      );
    });
    // Aucune classe n'a été choisie : le bouton "Gérer cette classe" reste désactivé,
    // mais la liste (via evaluationsFetch ci-dessus) n'attend jamais ce choix.
    expect(screen.getByTestId("notes-admin-entry-submit")).toBeDisabled();
  });

  it("filtre la liste par recherche texte côté client", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      if (
        url === "http://localhost:3001/api/schools/college-vogt/evaluations"
      ) {
        return createJsonResponse([
          {
            id: "eval-1",
            title: "Controle histoire",
            status: "PUBLISHED",
            scheduledAt: "2026-04-01T08:00:00.000Z",
            createdAt: "2026-04-01T08:00:00.000Z",
            subject: { id: "hist", name: "Histoire" },
            subjectBranch: null,
            class: { id: "class-9", name: "6e A" },
            _count: { scores: 3 },
          },
          {
            id: "eval-2",
            title: "Interro maths",
            status: "DRAFT",
            scheduledAt: "2026-04-02T08:00:00.000Z",
            createdAt: "2026-04-02T08:00:00.000Z",
            subject: { id: "math", name: "Mathématiques" },
            subjectBranch: null,
            class: { id: "class-9", name: "6e A" },
            _count: { scores: 0 },
          },
        ]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await screen.findByTestId("notes-admin-entry-row-eval-1");
    expect(
      screen.getByTestId("notes-admin-entry-row-eval-2"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("notes-admin-entry-search"), {
      target: { value: "maths" },
    });

    expect(
      screen.queryByTestId("notes-admin-entry-row-eval-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("notes-admin-entry-row-eval-2"),
    ).toBeInTheDocument();
  });

  it("affiche un état vide dédié quand aucune évaluation ne correspond", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      if (
        url === "http://localhost:3001/api/schools/college-vogt/evaluations"
      ) {
        return createJsonResponse([]);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-list-empty"),
    ).toBeInTheDocument();
  });

  it("affiche une erreur dédiée si le chargement des évaluations échoue", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return createJsonResponse([
          {
            id: "class-9",
            name: "6e A",
            academicLevel: { id: "level-6e", label: "6ème" },
          },
        ]);
      }
      if (
        url === "http://localhost:3001/api/schools/college-vogt/evaluations"
      ) {
        return createJsonResponse({ message: "boom" }, 500);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    expect(
      await screen.findByTestId("notes-admin-entry-list-error"),
    ).toBeInTheDocument();
  });

  describe("Onglet Notes — recherche élève sur toute l'école", () => {
    function mockClassroomsAndContexts() {
      return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);

        if (url.endsWith("/schools/college-vogt/me")) {
          return createJsonResponse({ role: "SCHOOL_ADMIN" });
        }
        if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
          return createJsonResponse([
            {
              id: "class-1",
              name: "6e A",
              academicLevel: { id: "level-6e", label: "6ème" },
            },
            {
              id: "class-2",
              name: "6e B",
              academicLevel: { id: "level-6e", label: "6ème" },
            },
          ]);
        }
        if (
          url === "http://localhost:3001/api/schools/college-vogt/evaluations"
        ) {
          return createJsonResponse([]);
        }
        if (
          url ===
          "http://localhost:3001/api/schools/college-vogt/classes/class-1/evaluations/context"
        ) {
          return createJsonResponse({
            students: [{ id: "stu-1", firstName: "Kevin", lastName: "Fouda" }],
          });
        }
        if (
          url ===
          "http://localhost:3001/api/schools/college-vogt/classes/class-2/evaluations/context"
        ) {
          // Homonyme du stu-1 dans une autre classe : cas exact à désambiguïser.
          return createJsonResponse({
            students: [{ id: "stu-2", firstName: "Kevin", lastName: "Fouda" }],
          });
        }
        if (
          url ===
          "http://localhost:3001/api/schools/college-vogt/students/stu-1/notes"
        ) {
          return createJsonResponse([
            {
              term: "TERM_1",
              label: "1er Trimestre",
              councilLabel: "",
              generatedAtLabel: "",
              generalAverage: { student: 14, class: 12, min: 8, max: 18 },
              sequences: [],
              subjects: [
                {
                  id: "sub-1",
                  subjectLabel: "Anglais",
                  teachers: ["Prof. Wome"],
                  coefficient: 1,
                  studentAverage: 17,
                  classAverage: 12,
                  classMin: 8,
                  classMax: 18,
                  appreciation: "Bon trimestre",
                  evaluations: [],
                },
              ],
            },
          ]);
        }
        return createJsonResponse({ message: "Not found" }, 404);
      });
    }

    it("n'appelle aucun contexte de classe tant que l'onglet Notes n'est pas ouvert", async () => {
      mockClassroomsAndContexts();
      render(<NotesAdminEntryPage />);

      await screen.findByTestId("notes-admin-entry-browse");
      expect(globalThis.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("evaluations/context"),
        expect.anything(),
      );
    });

    it("agrège les élèves de toutes les classes et affiche la classe pour désambiguïser les homonymes", async () => {
      mockClassroomsAndContexts();
      render(<NotesAdminEntryPage />);

      await screen.findByTestId("notes-admin-entry-browse");
      fireEvent.click(screen.getByTestId("notes-admin-entry-tab-notes"));

      const row1 = await screen.findByTestId(
        "notes-admin-entry-student-row-stu-1",
      );
      const row2 = await screen.findByTestId(
        "notes-admin-entry-student-row-stu-2",
      );
      expect(row1).toHaveTextContent("6e A");
      expect(row2).toHaveTextContent("6e B");
    });

    it("filtre la recherche élève côté client", async () => {
      mockClassroomsAndContexts();
      render(<NotesAdminEntryPage />);

      await screen.findByTestId("notes-admin-entry-browse");
      fireEvent.click(screen.getByTestId("notes-admin-entry-tab-notes"));
      await screen.findByTestId("notes-admin-entry-student-row-stu-1");

      fireEvent.change(screen.getByTestId("notes-admin-entry-student-search"), {
        target: { value: "zzz-no-match" },
      });

      expect(
        await screen.findByTestId("notes-admin-entry-student-search-empty"),
      ).toBeInTheDocument();
    });

    it("charge et affiche les notes de l'élève sélectionné", async () => {
      mockClassroomsAndContexts();
      render(<NotesAdminEntryPage />);

      await screen.findByTestId("notes-admin-entry-browse");
      fireEvent.click(screen.getByTestId("notes-admin-entry-tab-notes"));

      fireEvent.click(
        await screen.findByTestId("notes-admin-entry-student-row-stu-1"),
      );

      expect(
        await screen.findByTestId("notes-admin-entry-student-notes"),
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId("evaluations-subject-row-sub-1"),
      ).toBeInTheDocument();
    });

    it("affiche une erreur dédiée si le chargement des notes de l'élève échoue", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/schools/college-vogt/me")) {
          return createJsonResponse({ role: "SCHOOL_ADMIN" });
        }
        if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
          return createJsonResponse([
            {
              id: "class-1",
              name: "6e A",
              academicLevel: { id: "level-6e", label: "6ème" },
            },
          ]);
        }
        if (
          url === "http://localhost:3001/api/schools/college-vogt/evaluations"
        ) {
          return createJsonResponse([]);
        }
        if (url.includes("/evaluations/context")) {
          return createJsonResponse({
            students: [{ id: "stu-1", firstName: "Kevin", lastName: "Fouda" }],
          });
        }
        if (url.includes("/students/stu-1/notes")) {
          return createJsonResponse({ message: "boom" }, 500);
        }
        return createJsonResponse({ message: "Not found" }, 404);
      });

      render(<NotesAdminEntryPage />);
      await screen.findByTestId("notes-admin-entry-browse");
      fireEvent.click(screen.getByTestId("notes-admin-entry-tab-notes"));
      fireEvent.click(
        await screen.findByTestId("notes-admin-entry-student-row-stu-1"),
      );

      expect(
        await screen.findByTestId("notes-admin-entry-student-notes-error"),
      ).toBeInTheDocument();
    });
  });

  it("redirects to login when the session is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return createJsonResponse({ message: "Unauthorized" }, 401);
      }
      return createJsonResponse({ message: "Not found" }, 404);
    });

    render(<NotesAdminEntryPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/schools/college-vogt/login"),
    );
  });
});
