import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CurriculumsPage from "./page";

const replaceMock = vi.fn();
const getCsrfTokenCookieMock = vi.fn(() => "csrf-token-test");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
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

const LEVELS = [
  {
    id: "level-fr",
    code: "1ERE",
    label: "1ere",
    languageSystem: "FRANCOPHONE",
    _count: { classes: 0, curriculums: 1 },
  },
  {
    id: "level-en",
    code: "FORM1",
    label: "Form 1",
    languageSystem: "ANGLOPHONE",
    _count: { classes: 0, curriculums: 1 },
  },
];

const TRACKS = [
  {
    id: "track-fr",
    code: "A1",
    label: "Serie A1",
    languageSystem: "FRANCOPHONE",
    _count: { classes: 0, curriculums: 1 },
  },
  {
    id: "track-en",
    code: "SCI",
    label: "Science",
    languageSystem: "ANGLOPHONE",
    _count: { classes: 0, curriculums: 1 },
  },
];

const CURRICULUMS = [
  {
    id: "curr-fr",
    name: "1ERE - A1",
    academicLevelId: "level-fr",
    trackId: "track-fr",
    academicLevel: { id: "level-fr", code: "1ERE", label: "1ere", languageSystem: "FRANCOPHONE" },
    track: { id: "track-fr", code: "A1", label: "A1", languageSystem: "FRANCOPHONE" },
    _count: { classes: 0, subjects: 3 },
  },
  {
    id: "curr-en",
    name: "FORM1 - SCI",
    academicLevelId: "level-en",
    trackId: "track-en",
    academicLevel: { id: "level-en", code: "FORM1", label: "Form 1", languageSystem: "ANGLOPHONE" },
    track: { id: "track-en", code: "SCI", label: "Science", languageSystem: "ANGLOPHONE" },
    _count: { classes: 0, subjects: 3 },
  },
];

describe("Curriculums page — filtre et badges de langue (Niveaux, Filieres, Curriculums)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    getCsrfTokenCookieMock.mockReset();
    getCsrfTokenCookieMock.mockReturnValue("csrf-token-test");
  });

  function mockRoutes() {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/api/me")) {
        return jsonResponse({
          role: "SCHOOL_ADMIN",
          schoolSlug: "college-vogt",
        });
      }
      if (url.includes("/admin/academic-levels")) return jsonResponse(LEVELS);
      if (url.includes("/admin/tracks")) return jsonResponse(TRACKS);
      if (url.includes("/admin/subjects")) return jsonResponse([]);
      if (url.includes("/admin/curriculums")) return jsonResponse(CURRICULUMS);

      return jsonResponse({ message: `Unhandled ${method} ${url}` }, 404);
    });
  }

  it("affiche le badge de langue sur les niveaux et permet de filtrer", async () => {
    mockRoutes();
    render(<CurriculumsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Niveaux" }));

    await waitFor(() => {
      expect(screen.getByText("1ERE")).toBeInTheDocument();
      expect(screen.getByText("FORM1")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Francophone").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anglophone").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Filtrer par langue"), {
      target: { value: "ANGLOPHONE" },
    });

    await waitFor(() => {
      expect(screen.queryByText("1ERE")).not.toBeInTheDocument();
      expect(screen.getByText("FORM1")).toBeInTheDocument();
    });
  });

  it("affiche le badge de langue sur les filieres et permet de filtrer", async () => {
    mockRoutes();
    render(<CurriculumsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Filieres" }));

    await waitFor(() => {
      expect(screen.getByText("A1")).toBeInTheDocument();
      expect(screen.getByText("SCI")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filtrer par langue"), {
      target: { value: "FRANCOPHONE" },
    });

    await waitFor(() => {
      expect(screen.getByText("A1")).toBeInTheDocument();
      expect(screen.queryByText("SCI")).not.toBeInTheDocument();
    });
  });

  it("affiche le badge de langue sur les curriculums et permet de filtrer", async () => {
    mockRoutes();
    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Curriculums" }),
    );

    await waitFor(() => {
      expect(screen.getByText("1ERE - A1")).toBeInTheDocument();
      expect(screen.getByText("FORM1 - SCI")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filtrer par langue"), {
      target: { value: "ANGLOPHONE" },
    });

    await waitFor(() => {
      expect(screen.queryByText("1ERE - A1")).not.toBeInTheDocument();
      expect(screen.getByText("FORM1 - SCI")).toBeInTheDocument();
    });
  });

  it("filtre aussi les listes deroulantes de creation de curriculum (niveau et filiere)", async () => {
    mockRoutes();
    render(<CurriculumsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Curriculums" }),
    );
    await waitFor(() => {
      expect(screen.getByText("1ERE - A1")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filtrer par langue"), {
      target: { value: "ANGLOPHONE" },
    });

    fireEvent.click(screen.getByLabelText("Niveau academique"));
    expect(
      await screen.findByRole("option", { name: "FORM1 - Form 1" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "1ERE - 1ere" }),
    ).not.toBeInTheDocument();
  });
});
