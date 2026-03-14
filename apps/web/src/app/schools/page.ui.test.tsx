import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SchoolsPage from "./page";

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

describe("Schools page create form", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps submit disabled until the form is valid", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools")) {
        return jsonResponse([]);
      }
      if (url.includes("/api/system/schools/slug-preview?")) {
        return jsonResponse({
          baseSlug: "college-vogt",
          suggestedSlug: "college-vogt",
          baseExists: false,
        });
      }
      if (url.includes("/api/system/users/exists?")) {
        return jsonResponse({ exists: false });
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Creer une ecole" }),
    );

    const submitButton = screen.getByRole("button", { name: "Creer l ecole" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "College Vogt" },
    });
    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "bad-email" },
    });

    expect(
      await screen.findByText("L'email du school admin est invalide."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "admin@vogt.cm" },
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
          return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
        }
        if (url.endsWith("/api/system/schools") && method === "GET") {
          return jsonResponse([]);
        }
        if (url.includes("/api/system/schools/slug-preview?")) {
          return jsonResponse({
            baseSlug: "college-vogt",
            suggestedSlug: "college-vogt",
            baseExists: false,
          });
        }
        if (url.includes("/api/system/users/exists?")) {
          return jsonResponse({ exists: false });
        }
        if (url.endsWith("/api/system/schools") && method === "POST") {
          return jsonResponse(
            { userExisted: false, setupCompleted: false },
            201,
          );
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<SchoolsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Creer une ecole" }),
    );

    fireEvent.change(screen.getByLabelText("Nom de l ecole"), {
      target: { value: "College Vogt" },
    });
    fireEvent.change(screen.getByLabelText("Pays"), {
      target: { value: "Cameroun" },
    });
    fireEvent.change(screen.getByLabelText("Region"), {
      target: { value: "Centre" },
    });
    fireEvent.change(screen.getByLabelText("Ville"), {
      target: { value: "Yaounde" },
    });
    fireEvent.change(screen.getByLabelText("Email School Admin"), {
      target: { value: "admin@vogt.cm" },
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Creer l ecole" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Creer l ecole" }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).endsWith("/api/system/schools") &&
          init?.method === "POST" &&
          init?.body ===
            JSON.stringify({
              name: "College Vogt",
              country: "Cameroun",
              region: "Centre",
              city: "Yaounde",
              schoolAdminEmail: "admin@vogt.cm",
            }),
      );
      expect(postCall).toBeDefined();
    });
  });
});
