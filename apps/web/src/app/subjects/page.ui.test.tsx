import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubjectsPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
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

describe("Subjects page forms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps subject creation disabled until valid and submits", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          if (method === "POST") {
            return jsonResponse({ id: "sub-1" }, 201);
          }
          return jsonResponse([]);
        }
        if (url.includes("/admin/evaluation-types")) return jsonResponse([]);
        if (url.includes("/admin/teachers")) return jsonResponse([]);
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }
        if (url.includes("/admin/classrooms")) return jsonResponse([]);
        if (url.includes("/admin/teacher-assignments")) return jsonResponse([]);

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nouvelle matiere"), {
      target: { value: "Mathematiques" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/subjects"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Mathematiques" }),
        }),
      );
    });
  });

  it("shows inline zod errors for evaluation type creation and posts once valid", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/evaluation-types")) {
          if (method === "POST") {
            return jsonResponse({ id: "eval-1" }, 201);
          }
          return jsonResponse([]);
        }
        if (url.includes("/admin/teachers")) return jsonResponse([]);
        if (url.includes("/admin/school-years")) return jsonResponse([]);
        if (url.includes("/admin/classrooms")) return jsonResponse([]);
        if (url.includes("/admin/teacher-assignments")) return jsonResponse([]);

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Types d'evaluation" }),
    );

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    const codeInput = screen.getByLabelText("Code");
    const labelInput = screen.getByLabelText("Libelle");

    expect(submitButton).toBeDisabled();

    fireEvent.change(labelInput, {
      target: { value: "Interrogation ecrite" },
    });
    fireEvent.change(codeInput, {
      target: { value: "INT" },
    });
    fireEvent.change(codeInput, {
      target: { value: "" },
    });
    fireEvent.blur(codeInput);

    expect(
      await screen.findByText("Le code est obligatoire."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(codeInput, {
      target: { value: "INT" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Le code est obligatoire."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/evaluation-types"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            code: "INT",
            label: "Interrogation ecrite",
          }),
        }),
      );
    });
  });

  it("submits the validated assignment form", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([
            {
              id: "sub-1",
              name: "Mathematiques",
              branches: [],
              _count: {
                assignments: 0,
                studentGrades: 0,
                curriculumSubjects: 0,
                classOverrides: 0,
              },
            },
          ]);
        }
        if (url.includes("/admin/evaluation-types")) return jsonResponse([]);
        if (url.includes("/admin/teachers")) {
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Albert",
              lastName: "Mvondo",
              email: "albert@example.com",
            },
          ]);
        }
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }
        if (url.includes("/admin/classrooms")) {
          return jsonResponse([
            {
              id: "class-1",
              name: "6eC",
              schoolYear: { id: "sy-1", label: "2025-2026" },
            },
          ]);
        }
        if (url.includes("/admin/teacher-assignments")) {
          if (method === "POST") {
            return jsonResponse({ id: "assign-1" }, 201);
          }
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ajouter affectation" }),
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter affectation" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/teacher-assignments"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            schoolYearId: "sy-1",
            teacherUserId: "teacher-1",
            classId: "class-1",
            subjectId: "sub-1",
          }),
        }),
      );
    });
  });

  it("uses inline validation for subject edition and submits the patch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          if (method === "PATCH") {
            return jsonResponse({ id: "sub-1" });
          }
          return jsonResponse([
            {
              id: "sub-1",
              name: "Mathematiques",
              branches: [],
              _count: {
                assignments: 0,
                studentGrades: 0,
                curriculumSubjects: 0,
                classOverrides: 0,
              },
            },
          ]);
        }
        if (url.includes("/admin/evaluation-types")) return jsonResponse([]);
        if (url.includes("/admin/teachers")) return jsonResponse([]);
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }
        if (url.includes("/admin/classrooms")) return jsonResponse([]);
        if (url.includes("/admin/teacher-assignments")) return jsonResponse([]);

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });

    fireEvent.change(screen.getByLabelText("Nom de la matiere"), {
      target: { value: "" },
    });
    expect(
      await screen.findByText("Le nom de la matiere est obligatoire."),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nom de la matiere"), {
      target: { value: "Mathematiques avancees" },
    });
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/subjects/sub-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Mathematiques avancees" }),
        }),
      );
    });
  });

  it("uses inline validation for evaluation type edition and submits the patch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/evaluation-types")) {
          if (method === "PATCH") {
            return jsonResponse({ id: "eval-1" });
          }
          return jsonResponse([
            {
              id: "eval-1",
              code: "DEVOIR",
              label: "Devoir surveille",
              isDefault: false,
            },
          ]);
        }
        if (url.includes("/admin/teachers")) return jsonResponse([]);
        if (url.includes("/admin/school-years")) return jsonResponse([]);
        if (url.includes("/admin/classrooms")) return jsonResponse([]);
        if (url.includes("/admin/teacher-assignments")) return jsonResponse([]);

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Types d'evaluation" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });

    fireEvent.change(screen.getByLabelText("Code type"), {
      target: { value: "" },
    });
    expect(
      await screen.findByText("Le code est obligatoire."),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Code type"), {
      target: { value: "INTERRO" },
    });
    fireEvent.change(screen.getByLabelText("Libelle type"), {
      target: { value: "Interrogation ecrite" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/evaluation-types/eval-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            code: "INTERRO",
            label: "Interrogation ecrite",
          }),
        }),
      );
    });
  });

  it("uses inline validation for assignment edition and submits the patch", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
        }
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([
            {
              id: "sub-1",
              name: "Mathematiques",
              branches: [],
              _count: {
                assignments: 1,
                studentGrades: 0,
                curriculumSubjects: 0,
                classOverrides: 0,
              },
            },
          ]);
        }
        if (url.includes("/admin/evaluation-types")) return jsonResponse([]);
        if (url.includes("/admin/teachers")) {
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Albert",
              lastName: "Mvondo",
              email: "albert@example.com",
            },
            {
              userId: "teacher-2",
              firstName: "Laure",
              lastName: "Fotsing",
              email: "laure@example.com",
            },
          ]);
        }
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
            { id: "sy-2", label: "2026-2027", isActive: false },
          ]);
        }
        if (url.includes("/admin/classrooms")) {
          return jsonResponse([
            {
              id: "class-1",
              name: "6eC",
              schoolYear: { id: "sy-1", label: "2025-2026" },
            },
            {
              id: "class-2",
              name: "5eA",
              schoolYear: { id: "sy-2", label: "2026-2027" },
            },
          ]);
        }
        if (url.includes("/admin/teacher-assignments")) {
          if (method === "PATCH") {
            return jsonResponse({ id: "assign-1" });
          }
          return jsonResponse([
            {
              id: "assign-1",
              schoolYearId: "sy-1",
              teacherUserId: "teacher-1",
              classId: "class-1",
              subjectId: "sub-1",
              createdAt: "2026-01-01T00:00:00.000Z",
              schoolYear: { id: "sy-1", label: "2025-2026" },
              teacherUser: {
                id: "teacher-1",
                firstName: "Albert",
                lastName: "Mvondo",
                email: "albert@example.com",
              },
              class: { id: "class-1", name: "6eC" },
              subject: { id: "sub-1", name: "Mathematiques" },
            },
          ]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SubjectsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const saveButton = screen.getByRole("button", { name: "Enregistrer" });

    fireEvent.change(screen.getByLabelText("Enseignant edition"), {
      target: { value: "" },
    });
    expect(
      await screen.findByText("L'enseignant est obligatoire."),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Annee scolaire edition"), {
      target: { value: "sy-2" },
    });
    fireEvent.change(screen.getByLabelText("Enseignant edition"), {
      target: { value: "teacher-2" },
    });
    fireEvent.change(screen.getByLabelText("Classe edition"), {
      target: { value: "class-2" },
    });
    fireEvent.change(screen.getByLabelText("Matiere edition"), {
      target: { value: "sub-1" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/teacher-assignments/assign-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            schoolYearId: "sy-2",
            teacherUserId: "teacher-2",
            classId: "class-2",
            subjectId: "sub-1",
          }),
        }),
      );
    });
  });
});
