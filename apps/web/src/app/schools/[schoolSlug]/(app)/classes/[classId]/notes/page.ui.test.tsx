import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassNotesPage from "./page";
import { translate } from "../../../../../../../i18n/useTranslation";
import { usePageHelpStore } from "../../../../../../../store/page-help";
import { useOnboardingTourStore } from "../../../../../../../store/onboarding-tour";

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
const pushMock = vi.fn();
const CREATED_EVALUATION_DATETIME = "2026-03-20T09:30";
const CREATED_EVALUATION_ISO = new Date(
  CREATED_EVALUATION_DATETIME,
).toISOString();

vi.mock("next/navigation", () => ({
  useParams: () => ({ schoolSlug: "college-vogt", classId: "class-1" }),
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
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
    sequence: "SEQ_1",
    isFinalExam: false,
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
  "eval-created": {
    id: "eval-created",
    title: "Composition fractions",
    description: "<p>Consignes <strong>riches</strong>.</p>",
    coefficient: 1.5,
    maxScore: 20,
    term: "TERM_1",
    status: "DRAFT",
    scheduledAt: CREATED_EVALUATION_ISO,
    createdAt: CREATED_EVALUATION_ISO,
    updatedAt: CREATED_EVALUATION_ISO,
    subject: { id: "sub-1", name: "Mathematiques" },
    subjectBranch: { id: "branch-1", name: "Algebre" },
    evaluationType: { id: "type-1", code: "COMP", label: "Composition" },
    attachments: [],
    _count: { scores: 0 },
    students: [],
  },
} as const;

const STUDENT_1_TERM_2_SNAPSHOT = {
  term: "TERM_2",
  label: "2eme Trimestre",
  councilLabel: "Conseil de classe 6eC - publication 2eme trimestre",
  generatedAtLabel: "Donnees publiees le 13/07/2026 09:08",
  generalAverage: { student: 10.56, class: 13.33, min: 9.5, max: 18 },
  sequences: [
    {
      sequence: "SEQ_3",
      sequenceLabel: "Sequence 3",
      isFirstSeq: true,
      generalAverage: { student: 10.56, class: 13.33, min: 9.5, max: 18 },
      subjects: [
        {
          id: "sub-1",
          subjectLabel: "Mathematiques",
          teachers: [],
          coefficient: 2,
          studentAverage: 10.56,
          classAverage: 13.33,
          classMin: 9.5,
          classMax: 18,
          evaluations: [],
        },
      ],
    },
  ],
  subjects: [
    {
      id: "sub-1",
      subjectLabel: "Mathematiques",
      teachers: [],
      coefficient: 2,
      studentAverage: 10.56,
      classAverage: 13.33,
      classMin: 9.5,
      classMax: 18,
      evaluations: [],
    },
  ],
};

function setupFetchMock(evaluations = EVALUATIONS) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = input instanceof Request ? input : null;
    const url = String(input);
    const method =
      request?.method ??
      (typeof init === "object" && init !== null && "method" in init
        ? init.method
        : undefined);

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
      if (method === "POST") {
        return jsonResponse({ id: "eval-created" }, 201);
      }
      return jsonResponse(evaluations);
    }
    if (url.includes("/classes/class-1/evaluations/eval-1")) {
      if (method === "PATCH") {
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
    if (url.includes("/term-reports/") && method === "PATCH") {
      return jsonResponse({ ok: true });
    }
    if (url.includes("/students/student-1/notes")) {
      return jsonResponse([STUDENT_1_TERM_2_SNAPSHOT]);
    }
    if (url.includes("/students/") && url.endsWith("/notes")) {
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
      screen.getByRole("button", {
        name: new RegExp(
          translate("fr", "notes.teacher.detail.enterScores"),
          "i",
        ),
      }),
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
      await screen.findByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    );

    expect(
      await screen.findByText(
        translate("fr", "notes.teacher.form.createTitle"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        translate("fr", "notes.teacher.form.titlePlaceholder"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: translate("fr", "notes.teacher.form.submitCreate"),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("fr", "common.requiredFieldsHint")),
    ).toBeInTheDocument();
  });

  it("validates the creation form on change with inline errors and a disabled submit", async () => {
    setupFetchMock();

    const { container } = render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    );

    await screen.findByText(translate("fr", "notes.teacher.form.createTitle"));
    const submitButton = await screen.findByRole("button", {
      name: translate("fr", "notes.teacher.form.submitCreate"),
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
      await screen.findByText(translate("fr", "common.requiredFieldsHint")),
    ).toBeInTheDocument();

    fireEvent.input(titleInput, { target: { value: "Ab" } });

    expect(
      await screen.findByText(
        translate("fr", "notes.teacher.validation.titleMinLength"),
      ),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(titleInput, { target: { value: "Composition fractions" } });
    fireEvent.input(scheduledAtInput, {
      target: { value: "2026-03-20T09:30" },
    });
    fireEvent.input(scheduledAtInput, { target: { value: "" } });

    expect(
      await screen.findByText(
        translate("fr", "notes.teacher.validation.scheduledAtRequired"),
      ),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fireEvent.input(scheduledAtInput, {
      target: { value: "2026-03-20T09:30" },
    });

    await waitFor(() => expect(submitButton).toBeEnabled());
    await waitFor(() =>
      expect(
        screen.queryByText(translate("fr", "common.requiredFieldsHint")),
      ).not.toBeInTheDocument(),
    );
  });

  it("blocks submission when coefficient is invalid then posts the evaluation once fixed", async () => {
    const fetchMock = setupFetchMock();

    const { container } = render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    );

    await screen.findByText(translate("fr", "notes.teacher.form.createTitle"));
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
      name: translate("fr", "notes.teacher.form.submitCreate"),
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
      target: { value: CREATED_EVALUATION_DATETIME },
    });

    expect(
      await screen.findByText(
        translate("fr", "notes.teacher.validation.coefficientPositive"),
      ),
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
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url).includes("/classes/class-1/evaluations") &&
          !String(url).includes("/context") &&
          typeof init === "object" &&
          init !== null &&
          "method" in init &&
          init.method === "POST",
      );

      expect(postCall).toBeDefined();
      const requestInit = postCall?.[1];
      expect(requestInit).toEqual(
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(
        JSON.parse(
          typeof requestInit?.body === "string" ? requestInit.body : "{}",
        ),
      ).toEqual({
        subjectId: "sub-1",
        subjectBranchId: "branch-1",
        evaluationTypeId: "type-1",
        title: "Composition fractions",
        description: "<p>Consignes <strong>riches</strong>.</p>",
        coefficient: 1.5,
        maxScore: 20,
        sequence: "SEQ_1",
        isFinalExam: false,
        scheduledAt: CREATED_EVALUATION_ISO,
        status: "DRAFT",
        attachments: [],
      });
    });
  });

  it("opens the selected evaluation in edit mode and patches it", async () => {
    const fetchMock = setupFetchMock();

    render(<TeacherClassNotesPage />);

    await screen.findByTestId("evaluation-detail-panel");

    fireEvent.click(
      screen.getByRole("button", {
        name: translate("fr", "notes.teacher.detail.editAria"),
      }),
    );

    expect(
      await screen.findByText(translate("fr", "notes.teacher.form.editTitle")),
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText(
      translate("fr", "notes.teacher.form.title"),
    ) as HTMLInputElement;
    const submitButton = screen.getByRole("button", {
      name: translate("fr", "notes.teacher.form.submitEdit"),
    });
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
        sequence: "SEQ_1",
        isFinalExam: false,
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
        name: translate("fr", "notes.teacher.detail.editAria"),
      }),
    );

    const scheduledAtInput = (await screen.findByLabelText(
      translate("fr", "notes.teacher.form.scheduledAt"),
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
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      const request = input instanceof Request ? input : null;
      const method =
        request?.method ??
        (typeof init === "object" && init !== null && "method" in init
          ? init.method
          : undefined);

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
        if (method === "POST") {
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
      await screen.findByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    );

    const fileInput = screen.getByLabelText(
      new RegExp(translate("fr", "notes.teacher.form.attachmentAdd"), "i"),
      {
        selector: 'input[type="file"]',
      },
    );
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

    expect(
      screen.getAllByText(translate("fr", "notes.teacher.status.published"))
        .length,
    ).toBeGreaterThan(0);
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
      await screen.findByText(translate("fr", "notes.teacher.list.empty")),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Page suivante" }),
    ).not.toBeInTheDocument();
  });

  it("filters the list by search on title or subject", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("notes-evaluations-search-input"), {
      target: { value: "Calcul mental" },
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Calcul mental/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /Composition fractions/i }),
    ).not.toBeInTheDocument();
  });

  it("filters by evaluation type through the filter panel", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-toggle"));
    await waitFor(() =>
      expect(
        screen.getByTestId("notes-evaluations-filter-panel"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-type-type-1"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Composition fractions/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Problemes geometriques/i }),
      ).not.toBeInTheDocument();
    });

    // Le bouton filtre devient actif (teal plein)
    expect(screen.getByTestId("notes-evaluations-filter-toggle")).toHaveClass(
      "bg-accent-teal",
    );
  });

  it("filters by sequence through the filter panel", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-toggle"));
    fireEvent.click(
      await screen.findByTestId("notes-evaluations-filter-sequence-SEQ_1"),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Composition fractions/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Problemes geometriques/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("filters by grade completion through the filter panel", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-toggle"));
    fireEvent.click(
      await screen.findByTestId("notes-evaluations-filter-completion-complete"),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Fractions avancees/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Composition fractions/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("resets the filters via the reset button", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", { name: /Composition fractions/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-toggle"));
    fireEvent.click(
      await screen.findByTestId("notes-evaluations-filter-completion-complete"),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Composition fractions/i }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("notes-evaluations-filter-reset"));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Composition fractions/i }),
      ).toBeInTheDocument(),
    );
  });

  it("colors the score progress badge according to grade completion", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    // eval-1 : 12/20 (incomplet) -> couleur "warm accent"
    const incomplete = await screen.findByText("12/20");
    expect(incomplete).toHaveClass("text-warm-accent-dark");

    // eval-5 : 20/20 (complet) -> couleur teal
    const complete = screen.getByText("20/20");
    expect(complete).toHaveClass("text-accent-teal-dark");
  });
});

describe("TeacherClassNotesPage council tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("shows the bulletin search list and opens a student's term report", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Conseil de classe/i }),
    );

    expect(
      await screen.findByTestId("teacher-reports-search-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-row-student-1"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );

    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("teacher-reports-subject-card-sub-1"),
    ).toBeInTheDocument();
  });

  it("saves a subject appreciation from the report through the class council endpoint", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Conseil de classe/i }),
    );
    fireEvent.click(await screen.findByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByTestId("teacher-reports-subject-sub-1-display"),
    );
    fireEvent.change(
      screen.getByTestId("teacher-reports-subject-sub-1-input"),
      { target: { value: "Bon travail" } },
    );
    fireEvent.click(screen.getByTestId("teacher-reports-subject-sub-1-save"));

    await waitFor(() => {
      const patchCall = vi
        .mocked(globalThis.fetch)
        .mock.calls.find(([input, init]) => {
          const url = String(input);
          const method =
            init && typeof init === "object" && "method" in init
              ? init.method
              : undefined;
          return url.includes("/term-reports/TERM_2") && method === "PATCH";
        });
      expect(patchCall).toBeDefined();
    });
  });
});

describe("TeacherClassNotesPage decision tab (referent teacher only)", () => {
  const DECISION_ROW = {
    id: "report-1",
    studentId: "student-1",
    student: { id: "student-1", firstName: "Eleve1", lastName: "MBELE" },
    decision: null,
    nextAcademicLevel: null,
    nextTrack: null,
    termAverages: { TERM_1: 10, TERM_2: 12, TERM_3: 14 },
    yearlyAverage: 12,
    rank: 1,
    classSize: 20,
  };

  function setupReferentFetchMock() {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const request = input instanceof Request ? input : null;
      const url = String(input);
      const method =
        request?.method ??
        (typeof init === "object" && init !== null && "method" in init
          ? init.method
          : undefined);

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      if (url.includes("/classes/class-1/evaluations/context")) {
        return jsonResponse({
          class: {
            id: "class-1",
            name: "6eC",
            schoolYearId: "sy-1",
            isReferentTeacher: true,
          },
          subjects: [{ id: "sub-1", name: "Mathematiques", branches: [] }],
          evaluationTypes: [],
          students: [
            { id: "student-1", firstName: "Eleve1", lastName: "MBELE" },
          ],
        });
      }
      if (
        url.includes("/classes/class-1/evaluations") &&
        !url.includes("/context")
      ) {
        return jsonResponse([]);
      }
      if (url.includes("/term-reports?term=")) {
        return jsonResponse([]);
      }
      if (url.includes("/admin/academic-levels")) {
        return jsonResponse([{ id: "level-5e", label: "5eme" }]);
      }
      if (
        url.includes("/admin/promotions/classes/class-1/term-reports") &&
        method !== "PATCH"
      ) {
        return jsonResponse([DECISION_ROW]);
      }
      if (
        url.includes("/admin/promotions/term-reports/report-1/decision") &&
        method === "PATCH"
      ) {
        return jsonResponse({ ...DECISION_ROW, decision: "PROMOTED" });
      }
      if (url.includes("/students/") && url.endsWith("/notes")) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  it("hides the Decision tab when the teacher is not the class referent", async () => {
    setupFetchMock();
    render(<TeacherClassNotesPage />);
    await screen.findByRole("button", { name: /Conseil de classe/i });
    expect(
      screen.queryByRole("button", { name: /^Décision$/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the yearly synthesis and saves a decision for the referent teacher", async () => {
    setupReferentFetchMock();
    render(<TeacherClassNotesPage />);

    fireEvent.click(await screen.findByRole("button", { name: /^Décision$/i }));

    expect(
      await screen.findByTestId("decision-row-report-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("decision-tab")).toHaveTextContent("12");

    fireEvent.change(screen.getByTestId("decision-row-report-1-select"), {
      target: { value: "PROMOTED" },
    });
    fireEvent.change(screen.getByTestId("decision-row-report-1-level"), {
      target: { value: "level-5e" },
    });
    fireEvent.click(screen.getByTestId("decision-row-report-1-save"));

    await waitFor(() => {
      const patchCall = vi
        .mocked(globalThis.fetch)
        .mock.calls.find(([reqInput, reqInit]) => {
          const url = String(reqInput);
          const method =
            reqInit && typeof reqInit === "object" && "method" in reqInit
              ? reqInit.method
              : undefined;
          return (
            url.includes("/admin/promotions/term-reports/report-1/decision") &&
            method === "PATCH"
          );
        });
      expect(patchCall).toBeDefined();
    });
  });
});

describe("TeacherClassNotesPage admin class switcher", () => {
  const ADMIN_CLASSROOMS = [
    {
      id: "class-1",
      name: "6eC",
      academicLevel: { id: "level-6e", code: "6E", label: "6eme" },
    },
    {
      id: "class-2",
      name: "6eD",
      academicLevel: { id: "level-6e", code: "6E", label: "6eme" },
    },
    {
      id: "class-3",
      name: "5eA",
      academicLevel: { id: "level-5e", code: "5E", label: "5eme" },
    },
  ];

  function setupAdminFetchMock(
    evaluations: Array<Record<string, unknown>> = EVALUATIONS,
  ) {
    return vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const request = input instanceof Request ? input : null;
      const url = String(input);
      const method =
        request?.method ??
        (typeof init === "object" && init !== null && "method" in init
          ? init.method
          : undefined);

      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.endsWith("/schools/college-vogt/admin/classrooms")) {
        return jsonResponse(ADMIN_CLASSROOMS);
      }
      if (url.includes("/classes/class-1/evaluations/context")) {
        return jsonResponse({
          class: { id: "class-1", name: "6eC", schoolYearId: "sy-1" },
          subjects: [],
          evaluationTypes: [],
          students: [],
        });
      }
      const evalDetailMatch = url.match(
        /\/classes\/class-1\/evaluations\/(eval-[\w-]+)$/,
      );
      if (evalDetailMatch) {
        const evaluation = evaluations.find(
          (entry) => entry.id === evalDetailMatch[1],
        );
        return jsonResponse({ ...evaluation, students: [] });
      }
      if (
        url.includes("/classes/class-1/evaluations") &&
        !url.includes("/context")
      ) {
        if (method === "POST") return jsonResponse({ id: "eval-created" }, 201);
        return jsonResponse(evaluations);
      }
      if (url.includes("/term-reports?term=")) {
        return jsonResponse([]);
      }

      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
  });

  it("shows the class name and the author (teacher) on the same line as the subject", async () => {
    setupAdminFetchMock([
      {
        ...EVALUATIONS[0],
        class: { id: "class-1", name: "6eC" },
        author: { id: "teacher-1", firstName: "Awa", lastName: "Diallo" },
      },
    ]);

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByText(
        (_, element) =>
          element?.textContent ===
          "Mathematiques - Algebre • Composition • 6eC • Awa Diallo",
      ),
    ).toBeInTheDocument();
  });

  it("shows the Level and Class selectors for a school admin", async () => {
    setupAdminFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByTestId("notes-admin-class-switcher"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("notes-admin-level-select")).toBeInTheDocument();
    expect(screen.getByTestId("notes-admin-class-select")).toBeInTheDocument();
  });

  it("does not show the Level/Class selectors for a teacher", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    await screen.findByTestId("notes-evaluations-search-input");
    expect(
      screen.queryByTestId("notes-admin-class-switcher"),
    ).not.toBeInTheDocument();
  });

  it("limits the class options to the selected level", async () => {
    setupAdminFetchMock();

    render(<TeacherClassNotesPage />);

    const levelSelect = (await screen.findByTestId(
      "notes-admin-level-select",
    )) as HTMLSelectElement;
    fireEvent.change(levelSelect, { target: { value: "level-5e" } });

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        "/schools/college-vogt/classes/class-3/notes",
      ),
    );

    const classSelect = screen.getByTestId(
      "notes-admin-class-select",
    ) as HTMLSelectElement;
    const optionLabels = Array.from(classSelect.options).map(
      (option) => option.textContent,
    );
    expect(optionLabels).toEqual(["5eA"]);
  });

  it("navigates to the selected class's notes page when changing the class", async () => {
    setupAdminFetchMock();

    render(<TeacherClassNotesPage />);

    const classSelect = (await screen.findByTestId(
      "notes-admin-class-select",
    )) as HTMLSelectElement;
    fireEvent.change(classSelect, { target: { value: "class-2" } });

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        "/schools/college-vogt/classes/class-2/notes",
      ),
    );
  });
});

describe("TeacherClassNotesPage notes tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
  });

  async function openNotesTab() {
    render(<TeacherClassNotesPage />);
    await screen.findByRole("button", { name: /Composition fractions/i });
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    return screen.findByTestId("teacher-notes-tab");
  }

  it("does not fetch any student's notes before the Notes tab is opened", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);
    await screen.findByRole("button", { name: /Composition fractions/i });

    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/notes"),
      expect.anything(),
    );
  });

  it("lists every student of the class, scoped to this class only", async () => {
    setupFetchMock();

    await openNotesTab();

    expect(
      screen.getByTestId("teacher-notes-search-result-student-1"),
    ).toHaveTextContent("MBELE Eleve1");
    expect(
      screen.getByTestId("teacher-notes-search-result-student-20"),
    ).toHaveTextContent("MBELE Eleve20");
  });

  it("filters the student list client-side as the user types", async () => {
    setupFetchMock();

    await openNotesTab();

    fireEvent.change(screen.getByTestId("teacher-notes-search-input"), {
      target: { value: "Eleve5" },
    });

    expect(
      screen.getByTestId("teacher-notes-search-result-student-5"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("teacher-notes-search-result-student-1"),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when no student matches the search", async () => {
    setupFetchMock();

    await openNotesTab();

    fireEvent.change(screen.getByTestId("teacher-notes-search-input"), {
      target: { value: "zzz-no-match" },
    });

    expect(
      await screen.findByTestId("teacher-notes-search-empty"),
    ).toBeInTheDocument();
  });

  it("loads and displays the selected student's notes for the current term", async () => {
    setupFetchMock();

    await openNotesTab();

    fireEvent.click(
      screen.getByTestId("teacher-notes-search-result-student-1"),
    );

    expect(
      await screen.findByTestId("teacher-notes-student-notes"),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId("evaluations-subject-row-sub-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("teacher-notes-term-TERM_2")).toBeInTheDocument();
  });

  it("shows an empty snapshot state when the student has no notes", async () => {
    setupFetchMock();

    await openNotesTab();

    fireEvent.click(
      screen.getByTestId("teacher-notes-search-result-student-2"),
    );

    expect(
      await screen.findByTestId("teacher-notes-student-notes-empty"),
    ).toBeInTheDocument();
  });

  it("shows a dedicated error state if loading the student's notes fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "TEACHER" });
      }
      if (url.includes("/classes/class-1/evaluations/context")) {
        return jsonResponse({
          class: { id: "class-1", name: "6eC", schoolYearId: "sy-1" },
          subjects: [],
          evaluationTypes: [],
          students: [{ id: "student-1", firstName: "Lisa", lastName: "MBELE" }],
        });
      }
      if (
        url.includes("/classes/class-1/evaluations") &&
        !url.includes("/context")
      ) {
        return jsonResponse([]);
      }
      if (url.includes("/term-reports?term=")) {
        return jsonResponse([]);
      }
      if (url.includes("/students/student-1/notes")) {
        return jsonResponse({ message: "boom" }, 500);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TeacherClassNotesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Notes" }));
    await screen.findByTestId("teacher-notes-tab");

    fireEvent.click(
      screen.getByTestId("teacher-notes-search-result-student-1"),
    );

    expect(
      await screen.findByTestId("teacher-notes-student-notes-error"),
    ).toBeInTheDocument();
  });
});

describe("TeacherClassNotesPage — aide enseignant (par onglet) et tour", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockReset();
    pushMock.mockReset();
    useOnboardingTourStore.setState({
      activeTourId: null,
      activeRole: null,
      steps: [],
      stepIndex: 0,
      targetRect: null,
    });
    usePageHelpStore.setState({ entry: null, open: false });
  });

  function mockTeacherRouter() {
    return setupFetchMock();
  }

  it("enregistre le contenu d'aide de l'onglet Évaluations (6 sections) pour un enseignant", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);

    await waitFor(() =>
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Évaluations",
      ),
    );
    const sections = usePageHelpStore.getState().entry?.sections ?? [];
    expect(sections.map((section) => section.title)).toEqual([
      "Rechercher et filtrer",
      "Statut brouillon ou publié",
      "Suivre l'avancement de la saisie",
      "Créer une évaluation",
      "Modifier une évaluation",
      "Passer à la saisie des notes",
    ]);
  });

  it("bascule vers un contenu d'aide différent et plus ciblé sur l'onglet Notes", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Notes" }));

    await waitFor(() =>
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Notes",
      ),
    );
  });

  it("bascule vers le contenu d'aide de l'onglet Saisie des notes", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Saisie des notes" }),
    );

    await waitFor(() =>
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Saisie des notes",
      ),
    );
  });

  it("bascule vers le contenu d'aide de l'onglet Conseil de classe", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Conseil de classe" }),
    );

    await waitFor(() =>
      expect(usePageHelpStore.getState().entry?.title).toBe(
        "Comment utiliser l'onglet Conseil de classe",
      ),
    );
  });

  it("retire le contenu d'aide au démontage", async () => {
    mockTeacherRouter();

    const { unmount } = render(<TeacherClassNotesPage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    unmount();
    expect(usePageHelpStore.getState().entry).toBeNull();
  });

  it("masque l'onglet Aide (ancien pattern) pour un enseignant", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);
    await waitFor(() =>
      expect(usePageHelpStore.getState().entry).not.toBeNull(),
    );

    expect(
      screen.queryByRole("button", { name: "Aide" }),
    ).not.toBeInTheDocument();
  });

  it("démarre le tour d'aide guidée pour un enseignant par défaut", async () => {
    mockTeacherRouter();

    render(<TeacherClassNotesPage />);

    await waitFor(() =>
      expect(useOnboardingTourStore.getState().activeTourId).toBe(
        "teacher-notes",
      ),
    );
    expect(useOnboardingTourStore.getState().activeRole).toBe("teacher");
  });

  it("ne démarre pas le tour ni n'enregistre d'aide pour un administrateur (garde l'onglet Aide existant)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith("/schools/college-vogt/me")) {
        return jsonResponse({ role: "SCHOOL_ADMIN" });
      }
      if (url.includes("/classes/class-1/evaluations/context")) {
        return jsonResponse({
          class: { id: "class-1", name: "6eC", schoolYearId: "sy-1" },
          subjects: [],
          evaluationTypes: [],
          students: [],
        });
      }
      if (url.includes("/admin/classrooms")) {
        return jsonResponse([]);
      }
      if (
        url.includes("/classes/class-1/evaluations") &&
        !url.includes("/context")
      ) {
        return jsonResponse([]);
      }
      return jsonResponse({ message: `Unhandled ${url}` }, 404);
    });

    render(<TeacherClassNotesPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Aide" })).toBeInTheDocument(),
    );
    expect(usePageHelpStore.getState().entry).toBeNull();
    expect(useOnboardingTourStore.getState().activeTourId).toBeNull();
  });
});
