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
  LifeEventsList: () => <div>LifeEventsList</div>,
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

    fireEvent.change(await screen.findByDisplayValue("Telephone + PIN"), {
      target: { value: "email" },
    });
    fireEvent.input(await screen.findByPlaceholderText("parent@email.com"), {
      target: { value: "parent@example.test" },
    });
    fireEvent.input(screen.getByPlaceholderText("MotDePasse123"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Affecter parent" }));

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

    fireEvent.input(screen.getByPlaceholderText("6XXXXXXXX"), {
      target: { value: "699001122" },
    });
    fireEvent.input(screen.getByPlaceholderText("123456"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Affecter parent" }));

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

    expect(await screen.findByDisplayValue("Telephone + PIN")).toBeDefined();
    expect(screen.getByPlaceholderText("6XXXXXXXX")).toBeDefined();
    expect(screen.getByPlaceholderText("123456")).toBeDefined();
  });
});
