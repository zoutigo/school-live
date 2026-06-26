import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentNotesPage } from "./student-notes-page";
import type { StudentNotesTermSnapshot } from "./student-notes.types";
import { useLocaleStore } from "../../i18n/locale-store";
import { DEFAULT_LOCALE } from "../../i18n/translations";
import { translate } from "../../i18n/useTranslation";

vi.mock("../family/child-module-page", () => ({
  ChildModulePage: ({
    title,
    subtitle,
    content,
    hideModuleHeader,
  }: {
    title: string;
    subtitle: string;
    content:
      | ReactNode
      | ((ctx: {
          child: {
            id: string;
            firstName: string;
            lastName: string;
          } | null;
          loading: boolean;
        }) => ReactNode);
    hideModuleHeader?: boolean;
  }) => (
    <div>
      {hideModuleHeader ? null : <h1>{title}</h1>}
      {hideModuleHeader ? null : <p>{subtitle}</p>}
      {typeof content === "function"
        ? content({
            child: { id: "child-1", firstName: "Lisa", lastName: "MBELE" },
            loading: false,
          })
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
            countsForAverage: true,
            isFinalExam: false,
          },
          {
            id: "ang-abs",
            label: "[DEMO 6eC] Questions et reponses - Grammaire",
            score: null,
            maxScore: 20,
            weight: 1,
            recordedAt: "15/10",
            status: "ABSENT",
            countsForAverage: true,
            isFinalExam: false,
          },
        ],
      },
    ],
    sequences: [],
  },
];

describe("StudentNotesPage i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(API_PAYLOAD), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  });

  it("renders the page header and tabs in French by default", async () => {
    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    expect(
      await screen.findByRole("heading", {
        name: translate("fr", "notes.student.page.title"),
      }),
    ).toBeInTheDocument();

    expect(
      within(screen.getByTestId("notes-view-tab-evaluations")).getByText(
        translate("fr", "notes.student.tabs.evaluations.label"),
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("notes-view-tab-averages")).getByText(
        translate("fr", "notes.student.tabs.averages.label"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("fr", "notes.student.tabs.charts.label")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(translate("fr", "notes.student.hero.badge")),
    ).toBeInTheDocument();
  });

  it("renders the page header, tabs and evaluation detail in English when locale=en", async () => {
    useLocaleStore.setState({ locale: "en" });

    render(<StudentNotesPage schoolSlug="college-vogt" childId="child-1" />);

    expect(
      await screen.findByRole("heading", {
        name: translate("en", "notes.student.page.title"),
      }),
    ).toBeInTheDocument();

    expect(
      within(screen.getByTestId("notes-view-tab-evaluations")).getByText(
        translate("en", "notes.student.tabs.evaluations.label"),
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("notes-view-tab-averages")).getByText(
        translate("en", "notes.student.tabs.averages.label"),
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("notes-view-tab-charts")).getAllByText(
        translate("en", "notes.student.tabs.charts.label"),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(translate("en", "notes.student.hero.badge")),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(translate("fr", "notes.student.hero.badge")),
    ).not.toBeInTheDocument();

    const absentBadge = (
      await screen.findAllByRole("button", {
        name: translate("en", "notes.student.evaluation.shortAbsent"),
      })
    )[0];
    fireEvent.click(absentBadge);

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        translate("en", "notes.student.evaluation.detailTitle"),
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        translate("en", "notes.student.evaluation.statusAbsent"),
      ),
    ).toBeInTheDocument();
  });
});
