import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeacherPeriodReports } from "./teacher-period-reports";
import type { StudentNotesTermSnapshot } from "../student-notes/student-notes.types";

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const STUDENTS = [
  { id: "student-1", firstName: "Lisa", lastName: "Ntamack" },
  { id: "student-2", firstName: "Paul", lastName: "Ateba" },
];

const SNAPSHOT_TERM_2: StudentNotesTermSnapshot = {
  term: "TERM_2",
  label: "2eme Trimestre",
  councilLabel: "Conseil de classe 6eB - publication 2eme trimestre",
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
          subjectLabel: "Anglais",
          teachers: ["Mme Kamga"],
          coefficient: 1,
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
      subjectLabel: "Anglais",
      teachers: ["Mme Kamga"],
      coefficient: 1,
      studentAverage: 10.56,
      classAverage: 13.33,
      classMin: 9.5,
      classMax: 18,
      evaluations: [],
    },
  ],
};

function setupFetchMock() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/students/student-1/notes")) {
      return jsonResponse([SNAPSHOT_TERM_2]);
    }
    if (url.includes("/students/student-2/notes")) {
      return jsonResponse([]);
    }
    return jsonResponse({ message: `Unhandled ${url}` }, 404);
  });
}

function baseProps() {
  return {
    schoolSlug: "college-vogt",
    className: "6eB",
    students: STUDENTS,
    term: "TERM_1" as const,
    onTermChange: vi.fn(),
    drafts: {},
    onSaveAppreciation: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
  };
}

describe("TeacherPeriodReports", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the searchable student list", () => {
    setupFetchMock();
    render(<TeacherPeriodReports {...baseProps()} />);

    expect(screen.getByTestId("teacher-reports-row-student-1")).toHaveTextContent(
      "Ntamack Lisa",
    );
    expect(screen.getByTestId("teacher-reports-row-student-2")).toHaveTextContent(
      "Ateba Paul",
    );
  });

  it("filters students by search query", () => {
    setupFetchMock();
    render(<TeacherPeriodReports {...baseProps()} />);

    fireEvent.change(screen.getByTestId("teacher-reports-search-input"), {
      target: { value: "ateba" },
    });

    expect(
      screen.queryByTestId("teacher-reports-row-student-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-row-student-2"),
    ).toBeInTheDocument();
  });

  it("expands a student row into 3 term bulletin cards", () => {
    setupFetchMock();
    render(<TeacherPeriodReports {...baseProps()} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));

    expect(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_3"),
    ).toBeInTheDocument();
  });

  it("opens a bulletin and shows the hero, subject cards and published footer", async () => {
    const props = baseProps();
    setupFetchMock();
    render(<TeacherPeriodReports {...props} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );

    expect(props.onTermChange).toHaveBeenCalledWith("TERM_2");

    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    expect(
      screen.getByTestId("teacher-reports-subject-card-sub-1"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-subject-sub-1-sequence-SEQ_3"),
    ).toHaveTextContent("10,56");
    expect(screen.getByTestId("teacher-reports-published")).toHaveTextContent(
      "13/07/2026",
    );
  });

  it("saves the general appreciation via the inline editor", async () => {
    const props = baseProps();
    setupFetchMock();
    render(<TeacherPeriodReports {...props} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("teacher-reports-general-display"));
    fireEvent.change(screen.getByTestId("teacher-reports-general-input"), {
      target: { value: "Bon trimestre" },
    });
    fireEvent.click(screen.getByTestId("teacher-reports-general-save"));

    await waitFor(() =>
      expect(props.onSaveAppreciation).toHaveBeenCalledWith("student-1", {
        generalAppreciation: "Bon trimestre",
      }),
    );
    expect(
      screen.queryByTestId("teacher-reports-general-editor"),
    ).not.toBeInTheDocument();
  });

  it("saves a per-subject appreciation via the inline editor", async () => {
    const props = baseProps();
    setupFetchMock();
    render(<TeacherPeriodReports {...props} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("teacher-reports-subject-sub-1-display"));
    fireEvent.change(
      screen.getByTestId("teacher-reports-subject-sub-1-input"),
      { target: { value: "Peut mieux faire" } },
    );
    fireEvent.click(screen.getByTestId("teacher-reports-subject-sub-1-save"));

    await waitFor(() =>
      expect(props.onSaveAppreciation).toHaveBeenCalledWith("student-1", {
        subject: { subjectId: "sub-1", value: "Peut mieux faire" },
      }),
    );
  });

  it("cancels an inline edit without saving", async () => {
    const props = baseProps();
    setupFetchMock();
    render(<TeacherPeriodReports {...props} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("teacher-reports-general-display"));
    fireEvent.click(screen.getByTestId("teacher-reports-general-cancel"));

    expect(
      screen.queryByTestId("teacher-reports-general-editor"),
    ).not.toBeInTheDocument();
    expect(props.onSaveAppreciation).not.toHaveBeenCalled();
  });

  it("returns to the list via the back button", async () => {
    setupFetchMock();
    render(<TeacherPeriodReports {...baseProps()} />);

    fireEvent.click(screen.getByTestId("teacher-reports-row-student-1"));
    fireEvent.click(
      screen.getByTestId("teacher-reports-bulletin-student-1-TERM_2"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("teacher-reports-hero")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId("teacher-reports-detail-back"));

    expect(screen.getByTestId("teacher-reports-tab")).toBeInTheDocument();
    expect(
      screen.getByTestId("teacher-reports-bulletins-student-1"),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the class has no students", () => {
    setupFetchMock();
    render(<TeacherPeriodReports {...baseProps()} students={[]} />);

    expect(screen.getByTestId("teacher-reports-empty")).toBeInTheDocument();
  });
});
