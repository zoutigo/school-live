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
            referentTeacher: {
              id: "teacher-1",
              firstName: "Valery",
              lastName: "MBELE",
              email: "valery@example.com",
            },
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
    expect(
      screen.getByText("Enseignant referent: MBELE Valery"),
    ).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText("Classe"), {
      target: { value: "class-1" },
    });

    const referentSelect = await screen.findByLabelText(
      "Enseignant referent de la classe",
    );
    fireEvent.change(referentSelect, { target: { value: "teacher-1" } });
    const referentButton = screen.getByRole("button", {
      name: "Affecter referent",
    });

    await waitFor(() => {
      expect(referentButton).toBeEnabled();
    });

    fireEvent.click(referentButton);

    await waitFor(() => {
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

  it("keeps class creation submit disabled until the form is valid and submits valid values", async () => {
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
          !url.includes("subject-overrides") &&
          method === "GET"
        ) {
          return jsonResponse([]);
        }

        if (url.endsWith("/admin/classrooms") && method === "POST") {
          return jsonResponse({ id: "class-1" }, 201);
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
          return jsonResponse([]);
        }

        if (url.includes("/admin/students")) {
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<ClassesPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de classe").className).toContain(
      "border-notification",
    );
    expect(screen.getByLabelText("Curriculum").className).toContain(
      "border-notification",
    );

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Annee scolaire") as HTMLSelectElement).value,
      ).toBe("sy-1");
    });

    fireEvent.change(screen.getByLabelText("Nom de classe"), {
      target: { value: "6e A" },
    });
    fireEvent.change(screen.getByLabelText("Curriculum"), {
      target: { value: "cur-1" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(
        screen.queryByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/admin/classrooms") && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/admin/classrooms") && init?.method === "POST",
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"name":"6e A"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"schoolYearId":"sy-1"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"curriculumId":"cur-1"',
    );
  });

  it("keeps teacher assignment submit disabled until the form is valid and submits values", async () => {
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
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Valery",
              lastName: "MBELE",
              email: "valery@example.com",
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
          return jsonResponse([
            {
              id: "cs-1",
              subjectId: "sub-1",
              isMandatory: true,
              coefficient: 1,
              weeklyHours: 3,
              subject: { id: "sub-1", name: "Anglais" },
            },
          ]);
        }

        if (
          url.endsWith("/api/schools/college-vogt/admin/teacher-assignments") &&
          method === "POST"
        ) {
          return jsonResponse({ id: "assign-1" }, 201);
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
            subjectStyles: [{ subjectId: "sub-1", colorHex: "#2563EB" }],
          });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<ClassesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );

    const submitButton = await screen.findByRole("button", {
      name: "Affecter enseignant",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Matiere"), {
      target: { value: "sub-1" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/admin/teacher-assignments") &&
          init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("submits referent teacher update from the assignments panel", async () => {
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
              referentTeacher: null,
              schoolYear: { id: "sy-1", label: "2025-2026" },
              academicLevel: { id: "lvl-1", code: "6EME", label: "6eme" },
              track: null,
              curriculum: { id: "cur-1", name: "6EME - TRONC_COMMUN" },
              _count: { enrollments: 1 },
            },
          ]);
        }
        if (url.includes("/admin/school-years"))
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        if (url.includes("/admin/curriculums") && !url.includes("/subjects"))
          return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
        if (url.includes("/admin/teachers"))
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Valery",
              lastName: "MBELE",
              email: "valery@example.com",
            },
          ]);
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/"))
          return jsonResponse([]);
        if (url.includes("/admin/students")) return jsonResponse([]);
        if (url.includes("/admin/teacher-assignments?classId=class-1"))
          return jsonResponse([]);
        if (url.includes("/admin/classrooms/class-1/subject-overrides"))
          return jsonResponse([]);
        if (url.includes("/admin/curriculums/cur-1/subjects"))
          return jsonResponse([]);
        if (
          url.endsWith("/api/schools/college-vogt/admin/classrooms/class-1") &&
          method === "PATCH"
        ) {
          return jsonResponse({ success: true });
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
    fireEvent.change(screen.getByLabelText("Classe"), {
      target: { value: "class-1" },
    });
    fireEvent.change(
      screen.getByLabelText("Enseignant referent de la classe"),
      {
        target: { value: "teacher-1" },
      },
    );

    const referentButton = screen.getByRole("button", {
      name: "Affecter referent",
    });

    await waitFor(() => {
      expect(referentButton).toBeEnabled();
    });

    fireEvent.click(referentButton);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/admin/classrooms/class-1") &&
          init?.method === "PATCH" &&
          String(init?.body).includes('"referentTeacherUserId":"teacher-1"'),
      );
      expect(patchCall).toBeDefined();
    });
  });

  it("submits student assignment to selected class", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me"))
          return jsonResponse({
            role: "SCHOOL_ADMIN",
            schoolSlug: "college-vogt",
          });
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
        if (url.includes("/admin/school-years"))
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        if (url.includes("/admin/curriculums") && !url.includes("/subjects"))
          return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
        if (url.includes("/admin/teachers")) return jsonResponse([]);
        if (url.includes("/admin/subjects") && !url.includes("/curriculums/"))
          return jsonResponse([]);
        if (url.includes("/admin/students"))
          return jsonResponse([
            {
              id: "student-1",
              firstName: "Lisa",
              lastName: "MBELE",
              parentLinks: [],
              currentEnrollment: null,
              enrollments: [],
            },
          ]);
        if (url.includes("/admin/teacher-assignments?classId=class-1"))
          return jsonResponse([]);
        if (url.includes("/admin/classrooms/class-1/subject-overrides"))
          return jsonResponse([]);
        if (url.includes("/admin/curriculums/cur-1/subjects"))
          return jsonResponse([]);
        if (
          url.endsWith(
            "/api/schools/college-vogt/admin/students/student-1/enrollments",
          ) &&
          method === "POST"
        )
          return jsonResponse({ id: "enr-1" }, 201);
        if (
          url.includes("/api/schools/college-vogt/timetable/classes/class-1") &&
          method === "GET"
        )
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
        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<ClassesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Classe"), {
      target: { value: "class-1" },
    });

    const studentButton = await screen.findByRole("button", {
      name: "Affecter eleve",
    });
    await waitFor(() => {
      expect(studentButton).toBeEnabled();
    });
    fireEvent.click(studentButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/admin/students/student-1/enrollments") &&
          init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("shows inline create-class validation and enables submit only when valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/classrooms") && method === "GET")
        return jsonResponse([]);
      if (url.includes("/admin/school-years"))
        return jsonResponse([
          { id: "sy-1", label: "2025-2026", isActive: true },
        ]);
      if (url.includes("/admin/curriculums") && !url.includes("/subjects"))
        return jsonResponse([{ id: "cur-1", name: "6EME - TRONC_COMMUN" }]);
      if (url.includes("/admin/teachers")) return jsonResponse([]);
      if (url.includes("/admin/subjects") && !url.includes("/curriculums/"))
        return jsonResponse([]);
      if (url.includes("/admin/students")) return jsonResponse([]);
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<ClassesPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        (screen.getByLabelText("Annee scolaire") as HTMLSelectElement).value,
      ).toBe("sy-1");
    });

    fireEvent.change(screen.getByLabelText("Nom de classe"), {
      target: { value: "6e A" },
    });
    fireEvent.change(screen.getByLabelText("Curriculum"), {
      target: { value: "cur-1" },
    });
    fireEvent.change(screen.getByLabelText("Curriculum"), {
      target: { value: "" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Le curriculum est obligatoire."),
      ).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Curriculum"), {
      target: { value: "cur-1" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Le curriculum est obligatoire."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
      expect(
        screen.queryByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).not.toBeInTheDocument();
    });
  });
});
