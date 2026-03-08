import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClassesPage from "./page";

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

describe("Classes page subject color UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("displays subject color indicator in the subjects table", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }

      if (
        url.includes("/admin/classrooms") &&
        !url.includes("subject-overrides")
      ) {
        return jsonResponse([
          {
            id: "class-1",
            schoolId: "school-1",
            name: "6eB",
            schoolYear: { id: "sy-1", label: "2025-2026" },
            academicLevel: { id: "lvl-1", code: "6EME", label: "6eme" },
            track: null,
            curriculum: { id: "cur-1", name: "6EME - TRONC_COMMUN" },
            _count: { enrollments: 1 },
          },
        ]);
      }

      if (url.includes("/admin/school-years")) {
        return jsonResponse([
          { id: "sy-1", label: "2025-2026", isActive: true },
        ]);
      }

      if (url.includes("/admin/curriculums") && !url.includes("/subjects")) {
        return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
      }

      if (url.includes("/admin/teachers")) {
        return jsonResponse([]);
      }

      if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
        return jsonResponse([
          { id: "sub-1", name: "Anglais" },
          { id: "sub-2", name: "Chimie" },
        ]);
      }

      if (url.includes("/admin/students")) {
        return jsonResponse([]);
      }

      if (url.includes("/admin/teacher-assignments?classId=class-1")) {
        return jsonResponse([]);
      }

      if (url.includes("/admin/classrooms/class-1/subject-overrides")) {
        return jsonResponse([]);
      }

      if (url.includes("/admin/curriculums/cur-1/subjects")) {
        return jsonResponse([
          {
            id: "cs-1",
            subjectId: "sub-1",
            isMandatory: true,
            coefficient: 1,
            weeklyHours: 3,
            subject: { id: "sub-1", name: "Anglais" },
          },
          {
            id: "cs-2",
            subjectId: "sub-2",
            isMandatory: true,
            coefficient: 1,
            weeklyHours: 2,
            subject: { id: "sub-2", name: "Chimie" },
          },
        ]);
      }

      if (
        url.includes("/api/schools/college-vogt/timetable/classes/class-1") &&
        method === "GET"
      ) {
        return jsonResponse({
          class: {
            id: "class-1",
            schoolYearId: "sy-1",
            academicLevelId: "lvl-1",
          },
          slots: [],
          calendarEvents: [],
          subjectStyles: [
            { subjectId: "sub-1", colorHex: "#2563EB" },
            { subjectId: "sub-2", colorHex: "#DC2626" },
          ],
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<ClassesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Voir" }));

    const colorButton = await screen.findByRole("button", {
      name: "Modifier couleur Anglais",
    });

    expect(colorButton).toBeInTheDocument();
    expect((colorButton as HTMLButtonElement).style.backgroundColor).toBe(
      "rgb(37, 99, 235)",
    );
  });

  it("opens color modal on click and updates subject color", async () => {
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

        if (
          url.includes("/admin/classrooms") &&
          !url.includes("subject-overrides")
        ) {
          return jsonResponse([
            {
              id: "class-1",
              schoolId: "school-1",
              name: "6eB",
              schoolYear: { id: "sy-1", label: "2025-2026" },
              academicLevel: { id: "lvl-1", code: "6EME", label: "6eme" },
              track: null,
              curriculum: { id: "cur-1", name: "6EME - TRONC_COMMUN" },
              _count: { enrollments: 1 },
            },
          ]);
        }

        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }

        if (url.includes("/admin/curriculums") && !url.includes("/subjects")) {
          return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
        }

        if (url.includes("/admin/teachers")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([
            { id: "sub-1", name: "Anglais" },
            { id: "sub-2", name: "Chimie" },
          ]);
        }

        if (url.includes("/admin/students")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/teacher-assignments?classId=class-1")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/classrooms/class-1/subject-overrides")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/curriculums/cur-1/subjects")) {
          return jsonResponse([
            {
              id: "cs-1",
              subjectId: "sub-1",
              isMandatory: true,
              coefficient: 1,
              weeklyHours: 3,
              subject: { id: "sub-1", name: "Anglais" },
            },
            {
              id: "cs-2",
              subjectId: "sub-2",
              isMandatory: true,
              coefficient: 1,
              weeklyHours: 2,
              subject: { id: "sub-2", name: "Chimie" },
            },
          ]);
        }

        if (
          url.includes("/api/schools/college-vogt/timetable/classes/class-1") &&
          method === "GET"
        ) {
          return jsonResponse({
            class: {
              id: "class-1",
              schoolYearId: "sy-1",
              academicLevelId: "lvl-1",
            },
            slots: [],
            calendarEvents: [],
            subjectStyles: [
              { subjectId: "sub-1", colorHex: "#2563EB" },
              { subjectId: "sub-2", colorHex: "#DC2626" },
            ],
          });
        }

        if (
          url.includes(
            "/api/schools/college-vogt/timetable/classes/class-1/subjects/sub-1/style",
          ) &&
          method === "PATCH"
        ) {
          return jsonResponse({
            subjectId: "sub-1",
            classId: "class-1",
            schoolYearId: "sy-1",
            colorHex: "#10B981",
          });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<ClassesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Voir" }));

    const colorButton = await screen.findByRole("button", {
      name: "Modifier couleur Anglais",
    });

    fireEvent.click(colorButton);

    expect(await screen.findByText("Couleur de Anglais")).toBeInTheDocument();
    expect(screen.queryByLabelText("Choisir #DC2626")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Choisir #10B981"));

    await waitFor(() => {
      expect(
        screen.getByText("Couleur de la matiere mise a jour."),
      ).toBeInTheDocument();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/subjects/sub-1/style") &&
        init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    expect(String((patchCall?.[1]?.body as string) ?? "")).toContain(
      '"colorHex":"#10B981"',
    );

    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Modifier couleur Anglais",
          }) as HTMLButtonElement
        ).style.backgroundColor,
      ).toBe("rgb(16, 185, 129)");
    });
  });

  it("assigns a referent teacher to the selected class", async () => {
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

        if (url.includes("/admin/classrooms/class-1") && method === "PATCH") {
          return jsonResponse({
            id: "class-1",
            schoolId: "school-1",
            name: "6eB",
            referentTeacher: {
              id: "teacher-1",
              firstName: "Valery",
              lastName: "MBELE",
              email: "valery@school.test",
            },
            schoolYear: { id: "sy-1", label: "2025-2026" },
            academicLevel: { id: "lvl-1", code: "6EME", label: "6eme" },
            track: null,
            curriculum: { id: "cur-1", name: "6EME - TRONC_COMMUN" },
            _count: { enrollments: 1 },
          });
        }

        if (
          url.includes("/admin/classrooms") &&
          !url.includes("subject-overrides")
        ) {
          return jsonResponse([
            {
              id: "class-1",
              schoolId: "school-1",
              name: "6eB",
              referentTeacher: null,
              schoolYear: { id: "sy-1", label: "2025-2026" },
              academicLevel: { id: "lvl-1", code: "6EME", label: "6eme" },
              track: null,
              curriculum: { id: "cur-1", name: "6EME - TRONC_COMMUN" },
              _count: { enrollments: 1 },
            },
          ]);
        }

        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }

        if (url.includes("/admin/curriculums") && !url.includes("/subjects")) {
          return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
        }

        if (url.includes("/admin/teachers")) {
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Valery",
              lastName: "MBELE",
              email: "valery@school.test",
            },
          ]);
        }

        if (url.includes("/admin/subjects") && !url.includes("/curriculums/")) {
          return jsonResponse([{ id: "sub-1", name: "Anglais" }]);
        }

        if (url.includes("/admin/students")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/teacher-assignments?classId=class-1")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/classrooms/class-1/subject-overrides")) {
          return jsonResponse([]);
        }

        if (url.includes("/admin/curriculums/cur-1/subjects")) {
          return jsonResponse([]);
        }

        if (
          url.includes("/api/schools/college-vogt/timetable/classes/class-1") &&
          method === "GET"
        ) {
          return jsonResponse({
            class: {
              id: "class-1",
              schoolYearId: "sy-1",
              academicLevelId: "lvl-1",
            },
            slots: [],
            calendarEvents: [],
            subjectStyles: [],
          });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<ClassesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );

    const referentSelect = await screen.findByLabelText(
      "Enseignant referent de la classe",
    );
    fireEvent.change(referentSelect, { target: { value: "teacher-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Affecter referent" }));

    await waitFor(() => {
      expect(
        screen.getByText("Enseignant referent affecte a la classe."),
      ).toBeInTheDocument();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/admin/classrooms/class-1") &&
        init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    expect(String((patchCall?.[1]?.body as string) ?? "")).toContain(
      '"referentTeacherUserId":"teacher-1"',
    );
  });
});
