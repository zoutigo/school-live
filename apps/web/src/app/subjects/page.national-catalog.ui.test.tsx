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

describe("Subjects page — catalogue national", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  function mockBaseRoutes(nationalSubjects: unknown[] = []) {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools/options")) {
        return jsonResponse([
          { id: "school-1", slug: "lycee-du-poisson-d-avril", name: "LPA" },
        ]);
      }
      if (url.endsWith("/api/system/subjects")) {
        if (method === "POST") {
          return jsonResponse({ id: "subject-national-1" }, 201);
        }
        return jsonResponse(nationalSubjects);
      }
      if (url.includes("/admin/subjects")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/evaluation-types")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/teachers")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/school-years")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/classrooms")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/teacher-assignments")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("shows the national catalog tab for SUPER_ADMIN and lists national subjects", async () => {
    mockBaseRoutes([
      {
        id: "subject-national-1",
        code: "MATH",
        name: "Mathematiques",
        _count: {
          assignments: 0,
          studentGrades: 0,
          curriculumSubjects: 0,
          classOverrides: 0,
        },
      },
    ]);

    render(<SubjectsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    expect(await screen.findByText("Mathematiques")).toBeInTheDocument();
    expect(screen.getByText("MATH")).toBeInTheDocument();
  });

  it("keeps the submit button always enabled, rejects an empty submission with inline errors, then submits once valid", async () => {
    const fetchMock = mockBaseRoutes([]);

    render(<SubjectsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    const submitButton = await screen.findByRole("button", {
      name: "Ajouter",
    });
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Le code est obligatoire.")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/system/subjects"),
      expect.objectContaining({ method: "POST" }),
    );

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "MATH" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mathematiques" },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/subjects"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "MATH", name: "Mathematiques" }),
        }),
      );
    });
  });

  it("does not show the national catalog tab for a SCHOOL_ADMIN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "lycee-du-poisson-d-avril",
        });
      }
      if (url.includes("/admin/")) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<SubjectsPage />);

    await screen.findByRole("button", { name: "Catalogue" });
    expect(
      screen.queryByRole("button", { name: "Catalogue national" }),
    ).not.toBeInTheDocument();
  });
});
