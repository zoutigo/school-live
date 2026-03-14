import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UsersPage from "./page";

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

describe("Users page create form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("shows inline validation and keeps submit disabled until the form is valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SUPER_ADMIN",
          schoolSlug: null,
        });
      }

      if (url.endsWith("/api/system/schools")) {
        return jsonResponse([
          { id: "school-1", slug: "college-vogt", name: "College Vogt" },
        ]);
      }

      if (url.includes("/api/system/users?")) {
        return jsonResponse({
          items: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
        });
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<UsersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Creer un utilisateur" }),
    );

    const submitButton = screen.getByRole("button", {
      name: "Creer le compte",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Albert" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mvondo" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "albert@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "61234" },
    });

    expect(
      await screen.findByText("Le numero doit contenir exactement 9 chiffres."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "612345678" },
    });
    fireEvent.click(screen.getByLabelText("TEACHER"));
    fireEvent.change(screen.getByLabelText("Mot de passe provisoire"), {
      target: { value: "Secret123" },
    });

    const schoolSelect = await screen.findByRole("combobox", {
      name: "Ecole assignee",
    });
    fireEvent.change(schoolSelect, {
      target: { value: "college-vogt" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });

  it("submits the validated create form", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/me")) {
          return jsonResponse({
            role: "SUPER_ADMIN",
            schoolSlug: null,
          });
        }

        if (url.endsWith("/api/system/schools")) {
          return jsonResponse([
            { id: "school-1", slug: "college-vogt", name: "College Vogt" },
          ]);
        }

        if (url.includes("/api/system/users?")) {
          return jsonResponse({
            items: [],
            meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
          });
        }

        if (url.endsWith("/api/system/users") && method === "POST") {
          return jsonResponse({ id: "user-1" }, 201);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<UsersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Creer un utilisateur" }),
    );

    fireEvent.change(screen.getByLabelText("Prenom"), {
      target: { value: "Albert" },
    });
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Mvondo" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "albert@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Telephone"), {
      target: { value: "612345678" },
    });
    fireEvent.click(screen.getByLabelText("TEACHER"));
    fireEvent.change(screen.getByLabelText("Mot de passe provisoire"), {
      target: { value: "Secret123" },
    });
    fireEvent.change(
      await screen.findByRole("combobox", { name: "Ecole assignee" }),
      {
        target: { value: "college-vogt" },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Creer le compte" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/users"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            firstName: "Albert",
            lastName: "Mvondo",
            email: "albert@example.com",
            phone: "612345678",
            platformRoles: [],
            schoolRoles: ["TEACHER"],
            temporaryPassword: "Secret123",
            schoolSlug: "college-vogt",
            avatarUrl: "",
          }),
        }),
      );
    });
  });
});
