import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurriculumsPage from "./page";
import { selectSearchableOption } from "../../test/searchable-select";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../lib/auth-cookies", () => ({
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

const NATIONAL_CURRICULUM = {
  id: "curriculum-national-1",
  name: "1ERE - A1",
  academicLevelId: "level-1",
  trackId: "track-1",
  academicLevel: { id: "level-1", code: "1ERE", label: "1ere" },
  track: { id: "track-1", code: "A1", label: "A1" },
  _count: { classes: 0, subjects: 2 },
};

describe("Curriculums page — matieres d'un curriculum national (ecole)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  function mockRoutes(options?: { curriculumSubjects?: unknown[] }) {
    let curriculumSubjects = options?.curriculumSubjects ?? [
      {
        id: "cs-math",
        subjectId: "subject-math",
        subject: { id: "subject-math", name: "Mathematiques" },
        isMandatory: true,
        coefficient: 4,
        weeklyHours: 5,
        isNational: true,
        isCustomized: false,
      },
      {
        id: "cs-grec",
        subjectId: "subject-grec",
        subject: { id: "subject-grec", name: "Grec" },
        isMandatory: true,
        coefficient: 2,
        weeklyHours: 3,
        isNational: true,
        isCustomized: false,
      },
    ];

    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/academic-levels")) return jsonResponse([]);
      if (url.includes("/admin/tracks")) return jsonResponse([]);
      if (url.includes("/admin/subjects")) {
        return jsonResponse([
          { id: "subject-math", name: "Mathematiques" },
          { id: "subject-grec", name: "Grec" },
          { id: "subject-chinois", name: "Chinois" },
        ]);
      }
      if (
        /\/admin\/curriculums\/[^/]+\/subjects\/[^/]+$/.test(url) &&
        method === "DELETE"
      ) {
        const subjectId = url.split("/").pop() as string;
        curriculumSubjects = curriculumSubjects.filter(
          (entry) => (entry as { subjectId: string }).subjectId !== subjectId,
        );
        return jsonResponse({ success: true });
      }
      if (/\/admin\/curriculums\/[^/]+\/subjects$/.test(url)) {
        if (method === "POST") {
          curriculumSubjects = [
            ...curriculumSubjects,
            {
              id: "cs-chinois",
              subjectId: "subject-chinois",
              subject: { id: "subject-chinois", name: "Chinois" },
              isMandatory: true,
              coefficient: 1,
              weeklyHours: 2,
              isNational: false,
              isCustomized: false,
            },
          ];
          return jsonResponse({ id: "cs-chinois" }, 201);
        }
        return jsonResponse(curriculumSubjects);
      }
      if (url.includes("/admin/curriculums")) {
        return jsonResponse([NATIONAL_CURRICULUM]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("affiche l'origine des matieres d'un curriculum national (badge)", async () => {
    mockRoutes();

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Matieres du curriculum" }),
    );

    await selectSearchableOption("Curriculum", "1ERE - A1");

    await waitFor(() => {
      expect(screen.getAllByText("Mathematiques").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("National").length).toBeGreaterThan(0);
  });

  it("ajoute une matiere supplementaire a un curriculum national sans toucher la base partagee", async () => {
    const fetchMock = mockRoutes();

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Matieres du curriculum" }),
    );
    await selectSearchableOption("Curriculum", "1ERE - A1");
    await waitFor(() => {
      expect(screen.getAllByText("Mathematiques").length).toBeGreaterThan(0);
    });

    await selectSearchableOption("Matiere", "Chinois");
    fireEvent.change(screen.getByLabelText("Coefficient"), {
      target: { value: "1" },
    });
    const saveButton = screen.getByRole("button", { name: "Enregistrer" });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/admin/curriculums/curriculum-national-1/subjects",
        ),
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText("Chinois").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Ajoutee par l'ecole")).toBeInTheDocument();
  });

  it("exclut une matiere nationale pour cette ecole sans supprimer la ligne partagee (Retirer)", async () => {
    const fetchMock = mockRoutes();

    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Matieres du curriculum" }),
    );
    await selectSearchableOption("Curriculum", "1ERE - A1");
    const grecCell = await screen.findByText("Grec");
    const grecRow = grecCell.closest("tr");
    if (!grecRow) {
      throw new Error("Grec row not found");
    }
    const removeButton = within(grecRow).getByRole("button", {
      name: "Retirer",
    });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "/admin/curriculums/curriculum-national-1/subjects/subject-grec",
        ),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Grec")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Mathematiques").length).toBeGreaterThan(0);
  });
});
