import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentNotesPage } from "./student-notes-page";
import type { StudentNotesTermSnapshot } from "./student-notes.types";

vi.mock("../family/child-module-page", () => ({
  ChildModulePage: ({
    title,
    subtitle,
    content,
  }: {
    title: string;
    subtitle: string;
    content:
      | ReactNode
      | ((ctx: { child: null; loading: boolean }) => ReactNode);
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {typeof content === "function"
        ? content({ child: null, loading: false })
        : content}
    </div>
  ),
}));

const API_PAYLOAD: StudentNotesTermSnapshot[] = [
  {
    term: "TERM_1",
    label: "1er Trimestre",
    councilLabel: "Conseil de classe de 6eC le 09/12/2025 17:30",
    generatedAtLabel: "Donnees publiees le 12/03/2026 16:56",
    generalAverage: {
      student: 16.19,
      class: 14.65,
      min: 9.5,
      max: 18.6,
    },
    subjects: [
      {
        id: "anglais",
        subjectLabel: "Anglais",
        teachers: ["Albert Mvondo"],
        coefficient: 1,
        studentAverage: 16.53,
        classAverage: 14.74,
        classMin: 11.8,
        classMax: 17.7,
        appreciation: "Bonne participation et expression ecrite soignee.",
        evaluations: [
          {
            id: "ang-1",
            label: "[DEMO 6eC] Verbes usuels - Grammaire",
            score: 16.1,
            maxScore: 20,
            weight: 1,
            recordedAt: "10/09",
            status: "ENTERED",
          },
          {
            id: "ang-abs",
            label: "[DEMO 6eC] Questions et reponses - Grammaire",
            score: null,
            maxScore: 20,
            weight: 1,
            recordedAt: "15/10",
            status: "ABSENT",
          },
        ],
      },
      {
        id: "geographie",
        subjectLabel: "Geographie",
        teachers: ["Francois Mbarga"],
        coefficient: 2,
        studentAverage: 13.74,
        classAverage: 12.27,
        classMin: 9.5,
        classMax: 15,
        appreciation:
          "Le travail est serieux, avec de bons reperes territoriaux.",
        evaluations: [
          {
            id: "geo-disp",
            label: "[DEMO 6eC] Questionnaire localiser - Population",
            score: null,
            maxScore: 20,
            weight: 1,
            recordedAt: "07/11",
            status: "EXCUSED",
          },
          {
            id: "geo-ne",
            label: "[DEMO 6eC] Bilan de sequence - Relief",
            score: null,
            maxScore: 20,
            weight: 1,
            recordedAt: "28/11",
            status: "NOT_GRADED",
          },
        ],
      },
    ],
  },
  {
    term: "TERM_2",
    label: "2eme Trimestre",
    councilLabel: "Conseil de classe de 6eC le 17/03/2026 15:45",
    generatedAtLabel: "Donnees publiees le 18/03/2026 09:15",
    generalAverage: {
      student: 15.93,
      class: 14.47,
      min: 10.1,
      max: 19.2,
    },
    subjects: [
      {
        id: "chimie",
        subjectLabel: "Chimie",
        teachers: ["Guy Ndem"],
        coefficient: 1,
        studentAverage: 14.9,
        classAverage: 13.1,
        classMin: 10.2,
        classMax: 16,
        appreciation: "Bon engagement dans les activites experimentales.",
        evaluations: [
          {
            id: "chim-1",
            label: "[DEMO 6eC] Transformations de la matiere - Transformations",
            score: 15.5,
            maxScore: 20,
            weight: 1.5,
            recordedAt: "11/02",
            status: "ENTERED",
          },
        ],
      },
    ],
  },
  {
    term: "TERM_3",
    label: "3eme Trimestre",
    councilLabel: "Conseil de classe a venir",
    generatedAtLabel: "Aucune evaluation publiee pour cette periode",
    generalAverage: {
      student: null,
      class: null,
      min: null,
      max: null,
    },
    subjects: [],
  },
];

describe("StudentNotesPage UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(API_PAYLOAD), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("loads API-backed evaluations content and exposes special status badges", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    expect((await screen.findAllByText("Anglais")).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "1er Trimestre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2eme Trimestre" }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: "Abs" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Disp" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "NE" }).length,
    ).toBeGreaterThan(0);

    expect(screen.getAllByText("Absent").length).toBeGreaterThan(0);
    expect(screen.getByText("Dispense")).toBeInTheDocument();
    expect(screen.getByText("Non evalue")).toBeInTheDocument();
  });

  it("opens the evaluation detail modal when a note is clicked", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const absentBadge = (
      await screen.findAllByRole("button", { name: "Abs" })
    )[0];
    fireEvent.click(absentBadge);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Detail de l'evaluation"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Anglais")).toBeInTheDocument();
    expect(within(dialog).getByText("Absent")).toBeInTheDocument();
    expect(within(dialog).getByText("15/10")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Fermer le detail de la note"));
    await waitFor(() => {
      expect(
        screen.queryByText("Detail de l'evaluation"),
      ).not.toBeInTheDocument();
    });
  });

  it("switches to averages and shows the published appreciation and summary values", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    fireEvent.click(
      (
        await screen.findByText("Comparaison eleve, classe, min et max")
      ).closest("button")!,
    );

    expect(
      screen.getByText("Bonne participation et expression ecrite soignee."),
    ).toBeInTheDocument();
    const rowScope = within(screen.getByTestId("averages-subject-row-anglais"));
    expect(rowScope.getAllByText("16,53").length).toBeGreaterThan(0);
    expect(rowScope.getByText(/Classe :/i)).toBeInTheDocument();
    expect(rowScope.getAllByText(/14,74/).length).toBeGreaterThan(0);
    expect(rowScope.getAllByText(/11,80/).length).toBeGreaterThan(0);
    expect(rowScope.getAllByText(/17,70/).length).toBeGreaterThan(0);
  });

  it("keeps the mobile averages block compact while preserving all values", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    fireEvent.click(
      (
        await screen.findByText("Comparaison eleve, classe, min et max")
      ).closest("button")!,
    );

    const rowScope = within(screen.getByTestId("averages-subject-row-anglais"));
    expect(rowScope.getAllByText("16,53").length).toBeGreaterThan(0);
    expect(rowScope.getByText(/Coef 1/i)).toBeInTheDocument();
    expect(rowScope.getByText(/Classe :/i)).toBeInTheDocument();
    expect(rowScope.getAllByText(/14,74/).length).toBeGreaterThan(0);
    expect(rowScope.getByText(/Min :/i)).toBeInTheDocument();
    expect(rowScope.getAllByText(/11,80/).length).toBeGreaterThan(0);
    expect(rowScope.getByText(/Max :/i)).toBeInTheDocument();
    expect(rowScope.getAllByText(/17,70/).length).toBeGreaterThan(0);
  });

  it("keeps the period bulletin below the active tab content on mobile", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const tabsSummary = await screen.findByText(
      "Lecture detaillee des notes publiees par matiere",
    );
    const evaluationTable = screen.getByTestId(
      "evaluations-subject-row-anglais",
    );
    const periodHeroHeading = screen.getByText("Bulletin de periode");

    expect(
      tabsSummary.compareDocumentPosition(evaluationTable) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      evaluationTable.compareDocumentPosition(periodHeroHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses compact mobile view tabs without forcing wide subtitles", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const tabs = await screen.findByTestId("notes-view-tabs");
    expect(tabs.className).toContain("grid-cols-3");

    const evaluationTab = screen.getByTestId("notes-view-tab-evaluations");
    expect(evaluationTab.className).toContain("min-w-0");

    const tabsSummary = screen.getByText(
      "Lecture detaillee des notes publiees par matiere",
    );
    expect(tabsSummary.className).toContain("hidden");
    expect(tabsSummary.className).toContain("md:block");
  });

  it("uses a regular mobile grid for evaluation notes", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const row = await screen.findByTestId("evaluations-subject-row-anglais");
    const notesGrid = within(row).getByTestId("evaluations-notes-grid-anglais");

    expect(notesGrid.className).toContain("grid-cols-4");
    expect(notesGrid.className).toContain("min-[360px]:grid-cols-5");
    expect(notesGrid.className).toContain("w-full");
    expect(notesGrid.className).toContain("gap-y-2");
  });

  it("keeps the mobile evaluation header on a justify-between row", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const header = await screen.findByTestId(
      "evaluations-subject-header-anglais",
    );

    expect(header.className).toContain("justify-between");
  });

  it("uses a bounded mobile typography threshold at 360px", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    const tabs = await screen.findByTestId("notes-view-tabs");
    const evaluationTab = screen.getByTestId("notes-view-tab-evaluations");
    const notesGrid = screen.getByTestId("evaluations-notes-grid-anglais");
    const evaluationTabLabel = within(evaluationTab).getByText("Evaluations");

    expect(evaluationTabLabel.className).toContain("min-[360px]:text-sm");
    expect(notesGrid.className).toContain("min-[360px]:text-[13px]");
    expect(tabs.className).toContain("grid-cols-3");
  });

  it("shows an empty-state trimester without crashing when switching to term 3", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "3eme Trimestre" }),
    );

    expect(
      screen.getByRole("button", { name: "3eme Trimestre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Les evaluations de cette periode seront visibles/i),
    ).toBeInTheDocument();
  });
});
