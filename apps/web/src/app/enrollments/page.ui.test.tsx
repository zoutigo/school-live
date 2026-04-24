import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EnrollmentsPage from "./page";

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

function buildEnrollmentRow(
  overrides?: Partial<{
    id: string;
    status: "ACTIVE" | "TRANSFERRED" | "WITHDRAWN" | "GRADUATED";
    isCurrent: boolean;
    createdAt: string;
    schoolYear: { id: string; label: string };
    class: { id: string; name: string };
  }>,
) {
  return {
    id: "enr-1",
    status: "ACTIVE" as const,
    isCurrent: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    schoolYear: { id: "sy-1", label: "2025-2026" },
    class: { id: "class-1", name: "6eC" },
    ...overrides,
  };
}

function buildStudentRow(
  overrides?: Partial<{
    id: string;
    firstName: string;
    lastName: string;
    currentEnrollment: ReturnType<typeof buildEnrollmentRow> | null;
    enrollments: ReturnType<typeof buildEnrollmentRow>[];
  }>,
) {
  const enrollment = buildEnrollmentRow();
  return {
    id: "student-1",
    firstName: "Remi",
    lastName: "Ntamack",
    currentEnrollment: enrollment,
    enrollments: [enrollment],
    ...overrides,
  };
}

describe("Enrollments page forms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("submits filters through the managed form", async () => {
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
        if (url.includes("/admin/students?")) {
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<EnrollmentsPage />);

    fireEvent.change(await screen.findByLabelText("Annee scolaire"), {
      target: { value: "sy-1" },
    });
    fireEvent.change(screen.getByLabelText("Classe"), {
      target: { value: "class-1" },
    });
    fireEvent.change(screen.getByLabelText("Statut"), {
      target: { value: "WITHDRAWN" },
    });
    fireEvent.change(screen.getByLabelText("Recherche eleve"), {
      target: { value: "Ntamack" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Filtrer" }));

    await waitFor(() => {
      const studentsCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/admin/students?"),
      );
      expect(studentsCalls.length).toBeGreaterThan(0);
      const latestStudentsCall = studentsCalls.at(-1);
      expect(latestStudentsCall).toBeTruthy();
      const latestUrl = String(latestStudentsCall?.[0] ?? "");
      expect(latestUrl).toContain("status=WITHDRAWN");
      expect(latestUrl).toContain("search=Ntamack");
    });
  });

  it("submits the bulk status update from the managed selection form", async () => {
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
        if (url.includes("/admin/students?")) {
          return jsonResponse([
            {
              id: "student-1",
              firstName: "Remi",
              lastName: "Ntamack",
              currentEnrollment: {
                id: "enr-1",
                status: "ACTIVE",
                isCurrent: true,
                createdAt: "2026-01-01T00:00:00.000Z",
                schoolYear: { id: "sy-1", label: "2025-2026" },
                class: { id: "class-1", name: "6eC" },
              },
              enrollments: [
                {
                  id: "enr-1",
                  status: "ACTIVE",
                  isCurrent: true,
                  createdAt: "2026-01-01T00:00:00.000Z",
                  schoolYear: { id: "sy-1", label: "2025-2026" },
                  class: { id: "class-1", name: "6eC" },
                },
              ],
            },
          ]);
        }
        if (url.includes("/admin/enrollments/status") && method === "PATCH") {
          return jsonResponse({ count: 1 });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<EnrollmentsPage />);

    const bulkButton = await screen.findByRole("button", {
      name: "Appliquer a la selection (0)",
    });
    expect(bulkButton).toBeDisabled();

    await screen.findByText("Ntamack Remi");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Statut cible"), {
      target: { value: "GRADUATED" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Appliquer a la selection (1)" }),
      ).toBeEnabled();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Appliquer a la selection (1)" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/enrollments/status"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            enrollmentIds: ["enr-1"],
            status: "GRADUATED",
          }),
        }),
      );
    });
  });

  it("shows the empty state when no enrollment matches the current filters", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/school-years")) {
        return jsonResponse([
          { id: "sy-1", label: "2025-2026", isActive: true },
        ]);
      }
      if (url.includes("/admin/classrooms")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/students?")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<EnrollmentsPage />);

    expect(
      await screen.findByText("Aucune inscription trouvee."),
    ).toBeInTheDocument();
  });

  it("submits an inline status update for one enrollment", async () => {
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
        if (url.includes("/admin/students?")) {
          return jsonResponse([buildStudentRow()]);
        }
        if (
          url.includes("/admin/students/student-1/enrollments/enr-1") &&
          method === "PATCH"
        ) {
          return jsonResponse({ id: "enr-1" });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<EnrollmentsPage />);

    await screen.findByText("Ntamack Remi");
    const statusSelect = screen.getAllByDisplayValue(
      "ACTIVE",
    )[1] as HTMLSelectElement;
    fireEvent.change(statusSelect, {
      target: { value: "TRANSFERRED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Maj" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/students/student-1/enrollments/enr-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "TRANSFERRED" }),
        }),
      );
    });
  });

  it("resets the class filter when the school year changes", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
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
      if (url.includes("/admin/students?")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<EnrollmentsPage />);

    const schoolYearSelect = (await screen.findByLabelText(
      "Annee scolaire",
    )) as HTMLSelectElement;
    const classSelect = screen.getByLabelText("Classe") as HTMLSelectElement;

    fireEvent.change(schoolYearSelect, {
      target: { value: "sy-2" },
    });

    await waitFor(() => {
      const option = Array.from(classSelect.options).find(
        (entry) => entry.value === "class-2",
      );
      expect(option).toBeTruthy();
    });

    fireEvent.change(classSelect, {
      target: { value: "class-2" },
    });
    await waitFor(() => {
      expect(classSelect.value).toBe("class-2");
    });

    fireEvent.change(schoolYearSelect, {
      target: { value: "sy-1" },
    });

    await waitFor(() => {
      expect(classSelect.value).toBe("");
    });
  });
});
