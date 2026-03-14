import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassNotesPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", classId: "class-1" }),
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

const EVALUATIONS = [
  {
    id: "eval-1",
    title: "Composition fractions",
    description: "Resoudre les exercices 1 a 4.",
    coefficient: 2,
    maxScore: 20,
    term: "TERM_1",
    status: "PUBLISHED",
    scheduledAt: "2026-03-11T08:00:00.000Z",
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-10T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: { id: "branch-1", name: "Algebre" },
    evaluationType: { id: "type-1", code: "COMP", label: "Composition" },
    attachments: [],
    _count: { scores: 12 },
  },
  {
    id: "eval-2",
    title: "Problemes geometriques",
    description: "Figures et constructions.",
    coefficient: 1,
    maxScore: 20,
    term: "TERM_2",
    status: "DRAFT",
    scheduledAt: null,
    createdAt: "2026-03-12T08:00:00.000Z",
    updatedAt: "2026-03-12T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: null,
    evaluationType: { id: "type-2", code: "INT", label: "Interrogation" },
    attachments: [],
    _count: { scores: 0 },
  },
  {
    id: "eval-3",
    title: "Problemes numeriques",
    description: "Questions a reponses courtes.",
    coefficient: 1,
    maxScore: 20,
    term: "TERM_2",
    status: "PUBLISHED",
    scheduledAt: "2026-03-13T08:00:00.000Z",
    createdAt: "2026-03-13T08:00:00.000Z",
    updatedAt: "2026-03-13T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: null,
    evaluationType: { id: "type-2", code: "INT", label: "Interrogation" },
    attachments: [],
    _count: { scores: 6 },
  },
  {
    id: "eval-4",
    title: "Calcul mental",
    description: "Serie rapide.",
    coefficient: 1,
    maxScore: 20,
    term: "TERM_2",
    status: "DRAFT",
    scheduledAt: "2026-03-14T08:00:00.000Z",
    createdAt: "2026-03-14T08:00:00.000Z",
    updatedAt: "2026-03-14T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: null,
    evaluationType: { id: "type-2", code: "INT", label: "Interrogation" },
    attachments: [],
    _count: { scores: 4 },
  },
  {
    id: "eval-5",
    title: "Fractions avancees",
    description: "Exercices de synthese.",
    coefficient: 2,
    maxScore: 20,
    term: "TERM_2",
    status: "PUBLISHED",
    scheduledAt: "2026-03-15T08:00:00.000Z",
    createdAt: "2026-03-15T08:00:00.000Z",
    updatedAt: "2026-03-15T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: { id: "branch-1", name: "Algebre" },
    evaluationType: { id: "type-1", code: "COMP", label: "Composition" },
    attachments: [],
    _count: { scores: 20 },
  },
  {
    id: "eval-6",
    title: "Solides et volumes",
    description: "Derniere evaluation de la page 2.",
    coefficient: 1,
    maxScore: 20,
    term: "TERM_3",
    status: "DRAFT",
    scheduledAt: "2026-03-16T08:00:00.000Z",
    createdAt: "2026-03-16T08:00:00.000Z",
    updatedAt: "2026-03-16T08:00:00.000Z",
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: null,
    evaluationType: { id: "type-2", code: "INT", label: "Interrogation" },
    attachments: [],
    _count: { scores: 1 },
  },
];

const DETAIL_BY_ID = {
  "eval-1": {
    ...EVALUATIONS[0],
    students: [
      {
        id: "student-1",
        firstName: "Lisa",
        lastName: "MBELE",
        score: 14,
        scoreStatus: "ENTERED",
        comment: "",
      },
    ],
  },
  "eval-2": {
    ...EVALUATIONS[1],
    students: [
      {
        id: "student-1",
        firstName: "Lisa",
        lastName: "MBELE",
        score: null,
        scoreStatus: "NOT_GRADED",
        comment: "",
      },
    ],
  },
  "eval-3": {
    ...EVALUATIONS[2],
    students: [],
  },
  "eval-4": {
    ...EVALUATIONS[3],
    students: [],
  },
  "eval-5": {
    ...EVALUATIONS[4],
    students: [],
  },
  "eval-6": {
    ...EVALUATIONS[5],
    students: [],
  },
} as const;

function setupFetchMock(evaluations = EVALUATIONS) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const request = input instanceof Request ? input : null;
    const url = String(input);

    if (url.endsWith("/schools/college-vogt/me")) {
      return jsonResponse({ role: "TEACHER" });
    }
    if (url.includes("/classes/class-1/evaluations/context")) {
      return jsonResponse({
        class: { id: "class-1", name: "6eC", schoolYearId: "sy-1" },
        subjects: [
          {
            id: "sub-1",
            name: "Mathematiques",
            branches: [{ id: "branch-1", name: "Algebre" }],
          },
        ],
        evaluationTypes: [
          { id: "type-1", code: "COMP", label: "Composition", isDefault: true },
          {
            id: "type-2",
            code: "INT",
            label: "Interrogation",
            isDefault: false,
          },
        ],
        students: Array.from({ length: 20 }, (_, index) => ({
          id: `student-${index + 1}`,
          firstName: `Eleve${index + 1}`,
          lastName: "MBELE",
        })),
      });
    }
    if (url.includes("/classes/class-1/evaluations/eval-")) {
      const evaluationId = url.split("/").pop() as keyof typeof DETAIL_BY_ID;
      return jsonResponse(DETAIL_BY_ID[evaluationId]);
    }
    if (
      url.includes("/classes/class-1/evaluations") &&
      !url.includes("/context") &&
      !url.includes("/eval-")
    ) {
      if (request?.method === "POST") {
        return jsonResponse({ id: "eval-created" }, 201);
      }
      return jsonResponse(evaluations);
    }
    if (url.includes("/term-reports?term=")) {
      return jsonResponse([]);
    }

    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("TeacherClassNotesPage evaluations tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("renders evaluations as a left list with a detail panel", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("evaluation-detail-panel")).toBeInTheDocument(),
    );

    expect(screen.getAllByText("Composition fractions").length).toBeGreaterThan(
      1,
    );
    expect(
      screen.getByRole("button", { name: /Saisir les notes/i }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Problemes geometriques/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("Figures et constructions.")).toBeInTheDocument(),
    );
  });

  it("opens the creation form when clicking the add button", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une evaluation" }),
    );

    expect(await screen.findByText("Nouvelle evaluation")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Ex. Composition sur les fractions"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Creer l'evaluation" }),
    ).toBeInTheDocument();
  });

  it("validates the creation form on change with inline errors and a disabled submit", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une evaluation" }),
    );

    const submitButton = await screen.findByRole("button", {
      name: "Creer l'evaluation",
    });
    const titleInput = screen.getByLabelText("Titre");

    expect(submitButton).toBeDisabled();

    fireEvent.input(titleInput, { target: { value: "Ab" } });

    expect(
      await screen.findByText("Le titre doit contenir au moins 3 caracteres."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(titleInput, { target: { value: "Composition fractions" } });

    await waitFor(() => expect(submitButton).toBeEnabled());
  });

  it("renders compact metadata in the left list cards", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Publiee").length).toBeGreaterThan(0);
    expect(screen.getByText("11/03/2026")).toBeInTheDocument();
    expect(screen.getByText("12/20")).toBeInTheDocument();
  });

  it("paginates the left evaluations list and opens details from another page", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Solides et volumes/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Page suivante" }));

    expect(
      await screen.findByRole("button", { name: /Solides et volumes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Composition fractions/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Solides et volumes/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Derniere evaluation de la page 2."),
      ).toBeInTheDocument(),
    );
  });

  it("renders an empty state when there are no evaluations", async () => {
    setupFetchMock([]);

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByText("Aucune evaluation pour cette classe."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Page suivante" }),
    ).not.toBeInTheDocument();
  });
});
