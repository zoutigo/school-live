import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeachersPage from "./page";

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

describe("Teachers page create modes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("submits email + password payload in email mode", async () => {
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
        if (url.includes("/admin/teachers") && method === "GET") {
          return jsonResponse([]);
        }
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }
        if (url.includes("/admin/classrooms")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/subjects")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/teacher-assignments")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/teachers") && method === "POST") {
          return jsonResponse({ success: true }, 201);
        }
        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeachersPage />);

    expect(
      await screen.findByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("6XXXXXXXX")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    fireEvent.change(await screen.findByDisplayValue("Telephone + PIN"), {
      target: { value: "email" },
    });
    fireEvent.change(
      await screen.findByPlaceholderText("enseignant@ecole.com"),
      {
        target: { value: "prof@example.test" },
      },
    );
    fireEvent.change(screen.getByPlaceholderText("MotDePasse123"), {
      target: { value: "StrongPass1" },
    });
    const submitButton = screen.getByRole("button", { name: "Ajouter" });

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
          String(url).includes("/admin/teachers") && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/admin/teachers") && init?.method === "POST",
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"email":"prof@example.test"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"password":"StrongPass1"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).not.toContain(
      '"mode"',
    );
  });

  it("submits phone + pin payload in phone mode", async () => {
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
        if (url.includes("/admin/teachers") && method === "GET") {
          return jsonResponse([]);
        }
        if (url.includes("/admin/school-years")) {
          return jsonResponse([
            { id: "sy-1", label: "2025-2026", isActive: true },
          ]);
        }
        if (url.includes("/admin/classrooms")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/subjects")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/teacher-assignments")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/teachers") && method === "POST") {
          return jsonResponse({ success: true }, 201);
        }
        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeachersPage />);

    fireEvent.change(await screen.findByPlaceholderText("6XXXXXXXX"), {
      target: { value: "699001122" },
    });
    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "654321" },
    });
    const submitButton = screen.getByRole("button", { name: "Ajouter" });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/admin/teachers") && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/admin/teachers") && init?.method === "POST",
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"phone":"699001122"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"pin":"654321"',
    );
  });

  it("keeps assignment creation disabled until valid and submits", async () => {
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
        if (url.includes("/admin/teachers") && method === "GET") {
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Albert",
              lastName: "Mvondo",
              email: "albert@example.test",
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
        if (url.includes("/admin/subjects") && method === "GET") {
          return jsonResponse([{ id: "sub-1", name: "Anglais" }]);
        }
        if (url.includes("/admin/teacher-assignments") && method === "GET") {
          return jsonResponse([]);
        }
        if (url.includes("/admin/teacher-assignments") && method === "POST") {
          return jsonResponse({ id: "assign-1" }, 201);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeachersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();
    expect(
      screen.getAllByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByLabelText("Classe affectation")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    fireEvent.change(screen.getByLabelText("Classe affectation"), {
      target: { value: "class-1" },
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

  it("validates assignment edition inline before submitting", async () => {
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
        if (url.includes("/admin/teachers") && method === "GET") {
          return jsonResponse([
            {
              userId: "teacher-1",
              firstName: "Albert",
              lastName: "Mvondo",
              email: "albert@example.test",
            },
            {
              userId: "teacher-2",
              firstName: "Laure",
              lastName: "Fotsing",
              email: "laure@example.test",
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
            {
              id: "class-2",
              name: "5eA",
              schoolYear: { id: "sy-1", label: "2025-2026" },
            },
          ]);
        }
        if (url.includes("/admin/subjects") && method === "GET") {
          return jsonResponse([
            { id: "sub-1", name: "Anglais" },
            { id: "sub-2", name: "Chimie" },
          ]);
        }
        if (url.includes("/admin/teacher-assignments") && method === "GET") {
          return jsonResponse([
            {
              id: "assign-1",
              schoolYearId: "sy-1",
              teacherUserId: "teacher-1",
              classId: "class-1",
              subjectId: "sub-1",
              createdAt: "2026-03-14T10:00:00.000Z",
              schoolYear: { id: "sy-1", label: "2025-2026" },
              teacherUser: {
                id: "teacher-1",
                firstName: "Albert",
                lastName: "Mvondo",
                email: "albert@example.test",
              },
              class: { id: "class-1", name: "6eC" },
              subject: { id: "sub-1", name: "Anglais" },
            },
          ]);
        }
        if (
          url.includes("/admin/teacher-assignments/assign-1") &&
          method === "PATCH"
        ) {
          return jsonResponse({ id: "assign-1" });
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<TeachersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Modifier" }));

    const saveButton = await screen.findByRole("button", {
      name: "Enregistrer",
    });

    fireEvent.change(screen.getByLabelText("Classe edition affectation"), {
      target: { value: "" },
    });

    expect(
      await screen.findByText("La classe est obligatoire."),
    ).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(
      screen.getAllByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ).length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Classe edition affectation"), {
      target: { value: "class-2" },
    });
    fireEvent.change(screen.getByLabelText("Matiere edition affectation"), {
      target: { value: "sub-2" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
      expect(
        screen.getByLabelText("Classe edition affectation"),
      ).toHaveAttribute("aria-invalid", "false");
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/teacher-assignments/assign-1"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            schoolYearId: "sy-1",
            teacherUserId: "teacher-1",
            classId: "class-2",
            subjectId: "sub-2",
          }),
        }),
      );
    });
  });
});
