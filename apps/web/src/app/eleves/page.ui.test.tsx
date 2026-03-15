import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ElevesPage from "./page";

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

vi.mock("../../components/life-events/life-events-list", () => ({
  LifeEventsList: ({
    events,
    onEdit,
  }: {
    events: Array<{ id: string; reason: string }>;
    onEdit?: (row: { id: string; reason: string }) => void;
  }) => (
    <div>
      {events.length === 0 ? <div>LifeEventsList</div> : null}
      {events.map((event) => (
        <div key={event.id}>
          <span>{event.reason}</span>
          {onEdit ? (
            <button type="button" onClick={() => onEdit(event)}>
              Modifier l'evenement
            </button>
          ) : null}
        </div>
      ))}
    </div>
  ),
  lifeEventTypeLabel: (value: string) => value,
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function setupFetchMock() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/me")) {
      return jsonResponse({ role: "SCHOOL_ADMIN", schoolSlug: "college-vogt" });
    }
    if (url.includes("/admin/school-years")) {
      return jsonResponse([{ id: "sy-1", label: "2025-2026", isActive: true }]);
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
          firstName: "Lisa",
          lastName: "MBELE",
          parentLinks: [],
          currentEnrollment: {
            id: "enr-1",
            status: "ACTIVE",
            isCurrent: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            schoolYear: { id: "sy-1", label: "2025-2026" },
            class: { id: "class-1", name: "6eC" },
          },
          enrollments: [
            {
              id: "enr-1",
              status: "ACTIVE",
              isCurrent: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              schoolYear: { id: "sy-1", label: "2025-2026" },
              class: { id: "class-1", name: "6eC" },
            },
          ],
        },
      ]);
    }
    if (
      url.includes("/admin/students/student-1/enrollments") &&
      method === "GET"
    ) {
      return jsonResponse([
        {
          id: "enr-1",
          status: "ACTIVE",
          isCurrent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schoolYear: { id: "sy-1", label: "2025-2026" },
          class: { id: "class-1", name: "6eC" },
        },
      ]);
    }
    if (url.includes("/students/student-1/life-events") && method === "GET") {
      return jsonResponse([]);
    }
    if (url.includes("/students/student-1/life-events") && method === "POST") {
      return jsonResponse({ id: "event-1" }, 201);
    }
    if (url.includes("/admin/parent-students") && method === "POST") {
      return jsonResponse({ id: "link-1" }, 201);
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Eleves page parent link modes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("submits email + password payload for parent link", async () => {
    const fetchMock = setupFetchMock();

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    fireEvent.change(await screen.findByDisplayValue("Telephone + PIN"), {
      target: { value: "email" },
    });
    fireEvent.input(await screen.findByPlaceholderText("parent@email.com"), {
      target: { value: "parent@example.test" },
    });
    fireEvent.input(screen.getByPlaceholderText("MotDePasse123"), {
      target: { value: "StrongPass1" },
    });
    const submitButton = screen.getByRole("button", {
      name: "Affecter parent",
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Parent affecte/i)).toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/admin/parent-students") &&
        init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"email":"parent@example.test"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"password":"StrongPass1"',
    );
  });

  it("submits phone + pin payload for parent link", async () => {
    const fetchMock = setupFetchMock();

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(await screen.findByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    fireEvent.input(await screen.findByPlaceholderText("6XXXXXXXX"), {
      target: { value: "699001122" },
    });
    fireEvent.input(screen.getByPlaceholderText("123456"), {
      target: { value: "123456" },
    });
    const submitButton = screen.getByRole("button", {
      name: "Affecter parent",
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Parent affecte/i)).toBeInTheDocument();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes("/admin/parent-students") &&
        init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"phone":"699001122"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"pin":"123456"',
    );
  });

  it("defaults parent link mode to phone + pin", async () => {
    setupFetchMock();

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    expect(await screen.findByDisplayValue("Telephone + PIN")).toBeDefined();
    expect(screen.getByPlaceholderText("6XXXXXXXX")).toBeDefined();
    expect(screen.getByPlaceholderText("123456")).toBeDefined();
  });

  it("shows inline parent email validation and keeps submit disabled until valid", async () => {
    setupFetchMock();

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    fireEvent.change(await screen.findByDisplayValue("Telephone + PIN"), {
      target: { value: "email" },
    });

    const submitButton = screen.getByRole("button", {
      name: "Affecter parent",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.input(await screen.findByPlaceholderText("parent@email.com"), {
      target: { value: "bad-email" },
    });

    await waitFor(() => {
      expect(screen.getByText("Email parent invalide.")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    fireEvent.input(screen.getByPlaceholderText("MotDePasse123"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.input(screen.getByPlaceholderText("parent@email.com"), {
      target: { value: "parent@example.test" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Email parent invalide."),
      ).not.toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });

  it("keeps life event submit disabled until the form is valid and submits values", async () => {
    const fetchMock = setupFetchMock();

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    const submitButton = await screen.findByRole("button", {
      name: "Signaler",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Motif de l'evenement"), {
      target: { value: "Absence justifiee" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/students/student-1/life-events") &&
          init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("validates life event edition inline before submitting", async () => {
    const fetchMock = setupFetchMock();
    fetchMock.mockImplementation((input, init) => {
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
            firstName: "Lisa",
            lastName: "MBELE",
            parentLinks: [],
            currentEnrollment: {
              id: "enr-1",
              status: "ACTIVE",
              isCurrent: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              schoolYear: { id: "sy-1", label: "2025-2026" },
              class: { id: "class-1", name: "6eC" },
            },
            enrollments: [
              {
                id: "enr-1",
                status: "ACTIVE",
                isCurrent: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                schoolYear: { id: "sy-1", label: "2025-2026" },
                class: { id: "class-1", name: "6eC" },
              },
            ],
          },
        ]);
      }
      if (
        url.includes("/admin/students/student-1/enrollments") &&
        method === "GET"
      ) {
        return jsonResponse([
          {
            id: "enr-1",
            status: "ACTIVE",
            isCurrent: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            schoolYear: { id: "sy-1", label: "2025-2026" },
            class: { id: "class-1", name: "6eC" },
          },
        ]);
      }
      if (url.includes("/students/student-1/life-events") && method === "GET") {
        return jsonResponse([
          {
            id: "event-1",
            type: "ABSENCE",
            occurredAt: "2026-03-15T08:30:00.000Z",
            durationMinutes: 10,
            justified: false,
            reason: "Absence initiale",
            comment: null,
            authorUser: {
              id: "teacher-1",
              firstName: "Jean",
              lastName: "Prof",
              email: "prof@example.test",
            },
          },
        ]);
      }
      if (
        url.includes("/students/student-1/life-events/event-1") &&
        method === "PATCH"
      ) {
        return jsonResponse({ id: "event-1" });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<ElevesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Affectations" }),
    );
    fireEvent.change(screen.getByLabelText("Eleve"), {
      target: { value: "student-1" },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier l'evenement" }),
    );

    const saveButton = await screen.findByRole("button", {
      name: "Enregistrer",
    });

    fireEvent.change(screen.getByLabelText("Motif edition evenement"), {
      target: { value: "" },
    });

    await waitFor(() => {
      expect(screen.getByText("Le motif est obligatoire.")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    fireEvent.change(screen.getByLabelText("Motif edition evenement"), {
      target: { value: "Absence corrigee" },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/students/student-1/life-events/event-1"),
        expect.objectContaining({
          method: "PATCH",
          body: expect.any(String),
        }),
      );
    });
  });

  it("keeps student creation submit disabled until the form is valid and submits values", async () => {
    const fetchMock = setupFetchMock();
    fetchMock.mockImplementation((input, init) => {
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
      if (url.endsWith("/admin/students") && method === "POST") {
        return jsonResponse({ id: "student-2" }, 201);
      }
      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });

    render(<ElevesPage />);

    const submitButton = await screen.findByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Paul" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mbele" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/admin/students") && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith("/admin/students") && init?.method === "POST",
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"firstName":"Paul"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"lastName":"Mbele"',
    );
    expect(String((postCall?.[1]?.body as string) ?? "")).toContain(
      '"classId":"class-1"',
    );
  });
});
