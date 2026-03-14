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
});
