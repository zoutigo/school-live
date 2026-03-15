import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassNotesPage from "./page";

function setRichTextEditorHtml(container: HTMLElement, value: string) {
  const editor = container.querySelector(
    '[contenteditable="true"]',
  ) as HTMLElement | null;
  if (!editor) {
    throw new Error("Rich text editor not found");
  }
  editor.innerHTML = value;
  fireEvent.input(editor);
}

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
    description: "<p>Resoudre les exercices <strong>1 a 4</strong>.</p>",
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
    attachments: [
      {
        id: "att-1",
        fileName: "consignes-composition.pdf",
        fileUrl: "https://files.local/consignes-composition.pdf",
        sizeLabel: "216 Ko",
        mimeType: "application/pdf",
      },
    ],
    _count: { scores: 12 },
  },
  {
    id: "eval-2",
    title: "Problemes geometriques",
    description: "<p>Figures et constructions.</p>",
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
    description: "<p>Questions a reponses courtes.</p>",
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
    description: "<p>Serie rapide.</p>",
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
    description: "<p>Exercices de synthese.</p>",
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
    description: "<p>Derniere evaluation de la page 2.</p>",
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
    if (url.includes("/classes/class-1/evaluations/eval-1")) {
      if (request?.method === "PATCH") {
        return jsonResponse({ id: "eval-1" });
      }
      return jsonResponse(DETAIL_BY_ID["eval-1"]);
    }
    if (url.includes("/evaluations/uploads/attachment")) {
      return jsonResponse(
        { url: "https://files.local/doc.pdf", size: 1024 },
        200,
      );
    }
    if (url.startsWith("https://files.local/")) {
      return Promise.resolve(
        new Response(new Blob(["file-content"], { type: "application/pdf" }), {
          status: 200,
        }),
      );
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
    const attachmentDownloadButton = screen.getByRole("button", {
      name: "consignes-composition.pdf",
    });
    expect(attachmentDownloadButton).toBeInTheDocument();

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
    expect(
      screen.getByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();
  });

  it("validates the creation form on change with inline errors and a disabled submit", async () => {
    setupFetchMock();

    const { container } = render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une evaluation" }),
    );

    await screen.findByText("Nouvelle evaluation");
    const submitButton = await screen.findByRole("button", {
      name: "Creer l'evaluation",
    });
    const titleInput = container.querySelector(
      "#evaluation-title",
    ) as HTMLInputElement | null;
    const scheduledAtInput = container.querySelector(
      "#evaluation-scheduled-at",
    ) as HTMLInputElement | null;

    expect(titleInput).not.toBeNull();
    expect(scheduledAtInput).not.toBeNull();
    if (!titleInput || !scheduledAtInput) {
      throw new Error("Creation form inputs not found");
    }

    expect(submitButton).toBeDisabled();
    expect(titleInput).toHaveAttribute("aria-invalid", "true");
    expect(scheduledAtInput).toHaveAttribute("aria-invalid", "true");
    expect(titleInput.className).toContain("border-notification");
    expect(scheduledAtInput.className).toContain("border-notification");
    expect(
      await screen.findByText(
        "Vous devez remplir correctement les champs obligatoires.",
      ),
    ).toBeInTheDocument();

    fireEvent.input(titleInput, { target: { value: "Ab" } });

    expect(
      await screen.findByText("Le titre doit contenir au moins 3 caracteres."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(titleInput, { target: { value: "Composition fractions" } });
    fireEvent.input(scheduledAtInput, {
      target: { value: "2026-03-20T09:30" },
    });
    fireEvent.input(scheduledAtInput, { target: { value: "" } });

    expect(
      await screen.findByText("La date prevue est obligatoire."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(scheduledAtInput, {
      target: { value: "2026-03-20T09:30" },
    });

    await waitFor(() => expect(submitButton).toBeEnabled());
    await waitFor(() =>
      expect(
        screen.queryByText(
          "Vous devez remplir correctement les champs obligatoires.",
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it("blocks submission when coefficient is invalid then posts the evaluation once fixed", async () => {
    const fetchMock = setupFetchMock();

    const { container } = render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une evaluation" }),
    );

    await screen.findByText("Nouvelle evaluation");
    const titleInput = container.querySelector(
      "#evaluation-title",
    ) as HTMLInputElement | null;
    const coefficientInput = container.querySelector(
      "#evaluation-coefficient",
    ) as HTMLInputElement | null;
    const scheduledAtInput = container.querySelector(
      "#evaluation-scheduled-at",
    ) as HTMLInputElement | null;
    const submitButton = screen.getByRole("button", {
      name: "Creer l'evaluation",
    });
    const descriptionEditor = screen.getByTestId(
      "evaluation-description-editor",
    );

    expect(titleInput).not.toBeNull();
    expect(coefficientInput).not.toBeNull();
    expect(scheduledAtInput).not.toBeNull();
    if (!titleInput || !coefficientInput || !scheduledAtInput) {
      throw new Error("Creation form inputs not found");
    }

    fireEvent.input(titleInput, { target: { value: "Composition fractions" } });
    fireEvent.input(coefficientInput, { target: { value: "0" } });
    fireEvent.input(scheduledAtInput, {
      target: { value: "2026-03-20T09:30" },
    });

    expect(
      await screen.findByText("Le coefficient doit etre superieur a 0."),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(coefficientInput, { target: { value: "1.5" } });

    await waitFor(() => expect(submitButton).toBeEnabled());
    setRichTextEditorHtml(
      descriptionEditor,
      "<p>Consignes <strong>riches</strong>.</p>",
    );

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/classes/class-1/evaluations"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            subjectId: "sub-1",
            subjectBranchId: "branch-1",
            evaluationTypeId: "type-1",
            title: "Composition fractions",
            description: "<p>Consignes <strong>riches</strong>.</p>",
            coefficient: 1.5,
            maxScore: 20,
            term: "TERM_1",
            scheduledAt: "2026-03-20T08:30:00.000Z",
            status: "DRAFT",
            attachments: [],
          }),
        }),
      );
    });
  });

  it("opens the selected evaluation in edit mode and patches it", async () => {
    const fetchMock = setupFetchMock();

    render(<TeacherClassNotesPage />);

    await screen.findByTestId("evaluation-detail-panel");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Editer l'evaluation selectionnee",
      }),
    );

    expect(await screen.findByText("Editer l'evaluation")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Titre") as HTMLInputElement;
    const submitButton = screen.getByRole("button", { name: "Enregistrer" });
    const descriptionEditor = screen.getByTestId(
      "evaluation-description-editor",
    );

    expect(titleInput.value).toBe("Composition fractions");
    expect(descriptionEditor.textContent).toContain("Resoudre les exercices");

    fireEvent.input(titleInput, {
      target: { value: "Composition fractions revisee" },
    });
    setRichTextEditorHtml(
      descriptionEditor,
      "<p>Resoudre les exercices <em>1 a 6</em>.</p>",
    );
    fireEvent.click(submitButton);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/classes/class-1/evaluations/eval-1") &&
          init &&
          typeof init === "object" &&
          "method" in init &&
          init.method === "PATCH",
      );

      expect(patchCall).toBeTruthy();

      const payload = JSON.parse(
        ((patchCall?.[1] as RequestInit | undefined)?.body as string) ?? "{}",
      ) as Record<string, unknown>;

      expect(payload).toMatchObject({
        subjectId: "sub-1",
        subjectBranchId: "branch-1",
        evaluationTypeId: "type-1",
        title: "Composition fractions revisee",
        description: "<p>Resoudre les exercices <em>1 a 6</em>.</p>",
        coefficient: 2,
        maxScore: 20,
        term: "TERM_1",
        status: "PUBLISHED",
        attachments: [
          {
            fileName: "consignes-composition.pdf",
            fileUrl: "https://files.local/consignes-composition.pdf",
            mimeType: "application/pdf",
            sizeLabel: "216 Ko",
          },
        ],
      });
      expect(String(payload.scheduledAt)).toMatch(
        /^2026-03-11T0[78]:00:00.000Z$/,
      );
    });
  });

  it("prefills the edit date with createdAt when scheduledAt is missing", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Problemes geometriques/i }),
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Editer l'evaluation selectionnee",
      }),
    );

    const scheduledAtInput = (await screen.findByLabelText(
      "Date prevue",
    )) as HTMLInputElement;

    expect(scheduledAtInput.value).toBe("2026-03-12T08:00");
  });

  it("downloads an attachment without navigating away", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "consignes-composition.pdf",
      }),
    );

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://files.local/consignes-composition.pdf",
      ),
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("surfaces the backend upload error message inline", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      const request = input instanceof Request ? input : null;

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
            {
              id: "type-1",
              code: "COMP",
              label: "Composition",
              isDefault: true,
            },
          ],
          students: [],
        });
      }
      if (
        url.includes("/classes/class-1/evaluations") &&
        !url.includes("/context") &&
        !url.includes("/eval-")
      ) {
        if (request?.method === "POST") {
          return jsonResponse({ id: "eval-created" }, 201);
        }
        return jsonResponse(EVALUATIONS);
      }
      if (url.includes("/classes/class-1/evaluations/eval-")) {
        const evaluationId = url.split("/").pop() as keyof typeof DETAIL_BY_ID;
        return jsonResponse(DETAIL_BY_ID[evaluationId]);
      }
      if (url.includes("/evaluations/uploads/attachment")) {
        return jsonResponse({ message: "Type upload non supporte" }, 502);
      }
      if (url.includes("/term-reports?term=")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une evaluation" }),
    );

    const fileInput = screen.getByLabelText(/Ajouter un fichier/i, {
      selector: 'input[type="file"]',
    });
    const file = new File(["bad"], "archive.zip", { type: "application/zip" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText("Type upload non supporte"),
    ).toBeInTheDocument();
  });

  it("renders compact metadata in the left list cards", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Publiee").length).toBeGreaterThan(0);
    expect(screen.getByText("11/03/2026")).toBeInTheDocument();
    expect(screen.getAllByText("12/20").length).toBeGreaterThan(0);
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
