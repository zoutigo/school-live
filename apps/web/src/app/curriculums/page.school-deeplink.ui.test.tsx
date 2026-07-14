import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurriculumsPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () =>
    new URLSearchParams({ schoolSlug: "lycee-du-poisson-d-avril" }),
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

describe("Curriculums page — deep link depuis la fiche ecole", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("preselectionne l'ecole passee en query param et ouvre l'onglet curriculums plutot que le catalogue national", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools/options")) {
        return jsonResponse([
          { id: "school-1", slug: "college-vogt", name: "College Vogt" },
          {
            id: "school-2",
            slug: "lycee-du-poisson-d-avril",
            name: "Lycee du Poisson d'Avril",
          },
        ]);
      }
      if (
        url.endsWith(
          "/api/schools/lycee-du-poisson-d-avril/admin/academic-levels",
        )
      ) {
        return jsonResponse([]);
      }
      if (url.endsWith("/api/schools/lycee-du-poisson-d-avril/admin/tracks")) {
        return jsonResponse([]);
      }
      if (
        url.endsWith("/api/schools/lycee-du-poisson-d-avril/admin/subjects")
      ) {
        return jsonResponse([]);
      }
      if (
        url.endsWith("/api/schools/lycee-du-poisson-d-avril/admin/curriculums")
      ) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<CurriculumsPage />);

    expect(
      await screen.findByDisplayValue("Lycee du Poisson d'Avril"),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText("Niveau academique"),
    ).toBeInTheDocument();
  });
});
