import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeacherClassNotesPage from "./page";
import { useLocaleStore } from "../../../../../../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../../../../../../i18n/translations";
import { translate } from "../../../../../../../i18n/useTranslation";

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
    attachments: [],
    _count: { scores: 12 },
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
} as const;

function setupFetchMock() {
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
        ],
        students: [{ id: "student-1", firstName: "Lisa", lastName: "MBELE" }],
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
      return jsonResponse(EVALUATIONS);
    }
    if (url.includes("/term-reports?term=")) {
      return jsonResponse([]);
    }

    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

describe("TeacherClassNotesPage i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    vi.restoreAllMocks();
    replaceMock.mockReset();
  });

  afterEach(() => {
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the evaluations list and detail panel in French by default", async () => {
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    expect(
      await screen.findByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("evaluation-detail-panel")).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", {
        name: new RegExp(
          translate("fr", "notes.teacher.detail.enterScores"),
          "i",
        ),
      }),
    ).toBeInTheDocument();
  });

  it("renders the evaluations list, detail panel and creation form in English when locale=en", async () => {
    useLocaleStore.setState({ locale: "en" });
    setupFetchMock();

    render(<TeacherClassNotesPage />);

    const addButton = await screen.findByRole("button", {
      name: translate("en", "notes.teacher.list.addAria"),
    });
    expect(addButton).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("evaluation-detail-panel")).toBeInTheDocument(),
    );

    expect(
      screen.getByRole("button", {
        name: new RegExp(
          translate("en", "notes.teacher.detail.enterScores"),
          "i",
        ),
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: translate("fr", "notes.teacher.list.addAria"),
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(addButton);

    expect(
      await screen.findByText(
        translate("en", "notes.teacher.form.createTitle"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("en", "common.requiredFieldsHint")),
    ).toBeInTheDocument();
  });
});
