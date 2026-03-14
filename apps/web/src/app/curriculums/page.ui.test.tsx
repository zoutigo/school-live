import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurriculumsPage from "./page";

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

describe("Curriculums page forms", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("keeps academic level creation disabled until valid and submits", async () => {
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
        if (url.includes("/admin/academic-levels")) {
          if (method === "POST") return jsonResponse({ id: "lvl-1" }, 201);
          return jsonResponse([]);
        }
        if (url.includes("/admin/tracks")) return jsonResponse([]);
        if (url.includes("/admin/subjects")) return jsonResponse([]);
        if (url.includes("/admin/curriculums")) return jsonResponse([]);

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<CurriculumsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Niveaux" }));

    const submitButton = screen.getByRole("button", { name: "Ajouter" });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "6EME" },
    });
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "6eme" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/academic-levels"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "6EME", label: "6eme" }),
        }),
      );
    });
  });

  it("submits the validated curriculum form", async () => {
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
        if (url.includes("/admin/academic-levels")) {
          return jsonResponse([{ id: "lvl-1", code: "6EME", label: "6eme" }]);
        }
        if (url.includes("/admin/tracks")) {
          return jsonResponse([
            { id: "track-1", code: "C", label: "Scientifique" },
          ]);
        }
        if (url.includes("/admin/subjects")) return jsonResponse([]);
        if (url.includes("/admin/curriculums/") && url.includes("/subjects")) {
          return jsonResponse([]);
        }
        if (url.includes("/admin/curriculums")) {
          if (method === "POST") return jsonResponse({ id: "cur-1" }, 201);
          return jsonResponse([]);
        }

        return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
      });

    render(<CurriculumsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Curriculums" }));

    const submitButton = screen.getByRole("button", { name: "Creer" });
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText("Filiere (optionnel)"), {
      target: { value: "track-1" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/curriculums"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            academicLevelId: "lvl-1",
            trackId: "track-1",
          }),
        }),
      );
    });
  });
});
