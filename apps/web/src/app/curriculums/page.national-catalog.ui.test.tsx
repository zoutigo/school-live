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

describe("Curriculums page — catalogue national", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  function mockBaseRoutes(options?: {
    nationalLevels?: unknown[];
    nationalCurriculums?: unknown[];
  }) {
    const nationalLevels = options?.nationalLevels ?? [];
    const nationalCurriculums = options?.nationalCurriculums ?? [];

    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({ role: "SUPER_ADMIN", schoolSlug: null });
      }
      if (url.endsWith("/api/system/schools")) {
        return jsonResponse([
          { id: "school-1", slug: "lycee-du-poisson-d-avril", name: "LPA" },
        ]);
      }
      if (url.endsWith("/api/system/academic-levels")) {
        if (method === "POST") {
          return jsonResponse({ id: "level-national-1" }, 201);
        }
        return jsonResponse(nationalLevels);
      }
      if (url.endsWith("/api/system/curriculums")) {
        if (method === "POST") {
          return jsonResponse({ id: "curriculum-national-1" }, 201);
        }
        return jsonResponse(nationalCurriculums);
      }
      if (url.includes("/admin/academic-levels")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/tracks")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/subjects")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/curriculums")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("shows the national catalog tab for SUPER_ADMIN and lists national levels and curriculums", async () => {
    mockBaseRoutes({
      nationalLevels: [{ id: "level-1", code: "6EME", label: "6eme" }],
      nationalCurriculums: [
        {
          id: "curriculum-1",
          name: "6EME - TRONC_COMMUN",
          academicLevelId: "level-1",
          academicLevel: { id: "level-1", code: "6EME", label: "6eme" },
          _count: { classes: 0, subjects: 0 },
        },
      ],
    });

    render(<CurriculumsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    expect((await screen.findAllByText("6eme")).length).toBeGreaterThan(0);
    expect(await screen.findByText("6EME - TRONC_COMMUN")).toBeInTheDocument();
  });

  it("creates a national academic level with always-enabled submit and inline validation", async () => {
    const fetchMock = mockBaseRoutes();

    render(<CurriculumsPage />);

    const nationalTab = await screen.findByRole("button", {
      name: "Catalogue national",
    });
    fireEvent.click(nationalTab);

    const submitButtons = await screen.findAllByRole("button", {
      name: "Ajouter",
    });
    const addLevelButton = submitButtons[0];
    expect(addLevelButton).toBeEnabled();

    fireEvent.click(addLevelButton);
    await waitFor(() => {
      expect(screen.getByText("Le code est obligatoire.")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Code"), {
      target: { value: "6EME" },
    });
    fireEvent.change(screen.getByLabelText("Libelle"), {
      target: { value: "6eme" },
    });

    fireEvent.click(addLevelButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/system/academic-levels"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "6EME", label: "6eme" }),
        }),
      );
    });
  });

  it("does not show the national catalog tab for a SCHOOL_ADMIN", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "lycee-du-poisson-d-avril",
        });
      }
      if (url.includes("/admin/")) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: "Unhandled" }, 404);
    });

    render(<CurriculumsPage />);

    await screen.findByRole("button", { name: "Curriculums" });
    expect(
      screen.queryByRole("button", { name: "Catalogue national" }),
    ).not.toBeInTheDocument();
  });
});
