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
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

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
});
