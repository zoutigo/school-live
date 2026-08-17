import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PromotionsPage from "./page";

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

const CLASSROOMS = [
  {
    id: "class-source",
    name: "CE1 A",
    schoolYear: { id: "sy-2025", label: "2025-2026" },
    academicLevel: { id: "level-ce1", code: "CE1", label: "CE1" },
    track: null,
  },
  {
    id: "class-target",
    name: "CE2 A",
    schoolYear: { id: "sy-2026", label: "2026-2027" },
    academicLevel: { id: "level-ce2", code: "CE2", label: "CE2" },
    track: null,
  },
];

function mockFetchBase() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.endsWith("/api/me")) {
      return jsonResponse({ role: "SCHOOL_ADMIN", schoolSlug: "college-vogt" });
    }
    if (url.includes("/admin/classrooms")) {
      return jsonResponse(CLASSROOMS);
    }
    if (url.includes("/admin/academic-levels")) {
      return jsonResponse([{ id: "level-ce2", code: "CE2", label: "CE2" }]);
    }
    if (url.includes("/admin/tracks")) {
      return jsonResponse([]);
    }
    if (url.includes("/admin/school-years")) {
      return jsonResponse([
        { id: "sy-2025", label: "2025-2026", isActive: true },
        { id: "sy-2026", label: "2026-2027", isActive: false },
      ]);
    }
    if (url.includes("/promotions/classes/") && url.includes("/term-reports")) {
      return jsonResponse([
        {
          id: "report-1",
          student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
          decision: null,
          nextAcademicLevel: null,
          nextTrack: null,
        },
      ]);
    }
    if (url.includes("/promotions/term-reports/") && method === "PATCH") {
      return jsonResponse({ id: "report-1", decision: "PROMOTED" });
    }
    if (url.includes("/promotions/waiting-enrollments")) {
      return jsonResponse([
        {
          id: "enr-waiting-1",
          student: { id: "student-1", firstName: "Remi", lastName: "Ntamack" },
          academicLevel: { id: "level-ce2", label: "CE2" },
          track: null,
        },
      ]);
    }
    if (
      url.includes("/promotions/enrollments/") &&
      url.includes("/assign-class")
    ) {
      return jsonResponse({ id: "enr-waiting-1", classId: "class-target" });
    }

    return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
  });
}

describe("Promotions page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  it("charge les bulletins d'une classe et enregistre une decision avec le jeton CSRF", async () => {
    const fetchMock = mockFetchBase();
    render(<PromotionsPage />);

    fireEvent.click(await screen.findByLabelText("Classe (annee en cours)"));
    fireEvent.click(await screen.findByRole("option", { name: /CE1 A/ }));

    expect(await screen.findByText("Ntamack Remi")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Niveau cible"));
    fireEvent.click(await screen.findByRole("option", { name: "CE2" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/promotions/term-reports/") &&
          init?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      const headers = patchCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
      const body = JSON.parse(String(patchCall?.[1]?.body));
      expect(body).toMatchObject({
        decision: "PROMOTED",
        nextAcademicLevelId: "level-ce2",
      });
    });
  });

  it("liste les eleves en attente et les affecte a une classe cible", async () => {
    const fetchMock = mockFetchBase();
    render(<PromotionsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Attente d'affectation" }),
    );

    fireEvent.click(await screen.findByLabelText("Annee scolaire cible"));
    fireEvent.click(await screen.findByRole("option", { name: "2026-2027" }));

    expect(await screen.findByText("Ntamack Remi")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Classe definitive"));
    fireEvent.click(await screen.findByRole("option", { name: "CE2 A" }));
    fireEvent.click(screen.getByRole("button", { name: "Affecter" }));

    await waitFor(() => {
      const assignCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/promotions/enrollments/") &&
          String(url).includes("/assign-class") &&
          init?.method === "PATCH",
      );
      expect(assignCall).toBeTruthy();
      const headers = assignCall?.[1]?.headers as Record<string, string>;
      expect(headers["X-CSRF-Token"]).toBe("csrf-token-test");
    });
  });
});
