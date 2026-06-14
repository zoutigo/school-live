import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassHomeworkPage from "./page";
import { useLocaleStore } from "../../../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../../../i18n/translations";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({
    schoolSlug: "college-vogt",
    classId: "class-1",
  }),
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

const contextPayload = {
  schoolYears: [{ id: "sy-1", label: "2025-2026", isActive: true }],
  selectedSchoolYearId: "sy-1",
  assignments: [
    {
      classId: "class-1",
      subjectId: "sub-1",
      className: "6eC",
      subjectName: "Anglais",
      schoolYearId: "sy-1",
    },
  ],
  students: [],
};

function mockFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ role: "TEACHER" });
    }
    if (url.endsWith("/schools/college-vogt/student-grades/context")) {
      return jsonResponse(contextPayload);
    }

    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("Teacher class homework page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("affiche les onglets, le tableau et le statut en francais par defaut", async () => {
    mockFetch();

    render(<TeacherClassHomeworkPage />);

    expect(await screen.findByText("Liste")).toBeInTheDocument();
    expect(screen.getByText("Voir")).toBeInTheDocument();
    expect(screen.getByText("Aide")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Devoirs - 6eC")).toBeInTheDocument();
    });

    expect(screen.getByText("Titre")).toBeInTheDocument();
    expect(screen.getByText("Matiere")).toBeInTheDocument();
    expect(screen.getByText("Echeance")).toBeInTheDocument();
    expect(screen.getByText("Statut")).toBeInTheDocument();
    expect(screen.getByText("A faire")).toBeInTheDocument();
    expect(screen.getByText("En retard")).toBeInTheDocument();
    expect(screen.getByText("Valide")).toBeInTheDocument();
  });

  it("traduit les onglets, le tableau et le statut en anglais", async () => {
    useLocaleStore.setState({ locale: "en" });
    mockFetch();

    render(<TeacherClassHomeworkPage />);

    expect(await screen.findByText("List")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Homework - 6eC")).toBeInTheDocument();
    });

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});
