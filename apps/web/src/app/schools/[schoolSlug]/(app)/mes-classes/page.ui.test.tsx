import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassesPage from "./page";
import { selectSearchableOption } from "../../../../../test/searchable-select";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt" }),
  useRouter: () => ({ replace: replaceMock }),
}));

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const CONTEXT = {
  schoolYears: [
    { id: "sy-2025", label: "2025-2026", isActive: true },
    { id: "sy-2024", label: "2024-2025", isActive: false },
  ],
  selectedSchoolYearId: "sy-2025",
  assignments: [
    {
      classId: "class-6a",
      subjectId: "sub-math",
      className: "6eme A",
      subjectName: "Mathematiques",
      schoolYearId: "sy-2025",
    },
    {
      classId: "class-5a",
      subjectId: "sub-math",
      className: "5eme A",
      subjectName: "Mathematiques",
      schoolYearId: "sy-2024",
    },
  ],
  students: [],
};

describe("TeacherClassesPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      if (url.endsWith("/schools/college-vogt/student-grades/context")) {
        return jsonResponse(CONTEXT);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });
  });

  it("filtre les classes par annee scolaire via la liste deroulante", async () => {
    render(<TeacherClassesPage />);

    await screen.findByText("6eme A");
    expect(screen.queryByText("5eme A")).toBeNull();

    await selectSearchableOption("Annee scolaire", "2024-2025");

    await waitFor(() => {
      expect(screen.getByText("5eme A")).toBeInTheDocument();
      expect(screen.queryByText("6eme A")).toBeNull();
    });
  });

  it("affiche le detail d'une classe choisie dans l'onglet Voir", async () => {
    render(<TeacherClassesPage />);

    await screen.findByText("6eme A");
    fireEvent.click(screen.getByRole("button", { name: "Voir" }));

    await selectSearchableOption("Classe", "6eme A (2025-2026)");

    await waitFor(() => {
      expect(screen.getByText("6eme A - 2025-2026")).toBeInTheDocument();
    });
  });
});
