import { describe, expect, it } from "vitest";
import { computeYearlySnapshot } from "./student-notes.utils";
import type {
  StudentNotesTermSnapshot,
  StudentSubjectNotes,
} from "./student-notes.types";

const t = (key: string) => key;

function makeSubject(
  overrides: Partial<StudentSubjectNotes> = {},
): StudentSubjectNotes {
  return {
    id: "subj-1",
    subjectLabel: "Mathematiques",
    teachers: ["M. Dupont"],
    coefficient: 3,
    studentAverage: 14,
    classAverage: 12,
    classMin: 5,
    classMax: 19,
    appreciation: null,
    evaluations: [],
    ...overrides,
  };
}

function makeSnapshot(
  term: StudentNotesTermSnapshot["term"],
  subjects: StudentSubjectNotes[],
  generalAverage: StudentNotesTermSnapshot["generalAverage"] = {
    student: 13,
    class: 12,
    min: 7,
    max: 18,
  },
): StudentNotesTermSnapshot {
  return {
    term,
    label: `Trimestre ${term.slice(-1)}`,
    councilLabel: "6e A",
    generatedAtLabel: "Publie",
    generalAverage,
    sequences: [],
    subjects,
  };
}

describe("computeYearlySnapshot", () => {
  it("returns null when no term bulletin is loaded", () => {
    expect(computeYearlySnapshot([], t)).toBeNull();
  });

  it("only averages the available terms (never counted as 0)", () => {
    // T1 missing, T2 = 10, T3 = 16 -> yearly = 13, not (0+10+16)/3.
    const snapshot = computeYearlySnapshot(
      [
        makeSnapshot(
          "TERM_2",
          [makeSubject({ id: "subj-1", studentAverage: 10 })],
          { student: 10, class: 9, min: 4, max: 15 },
        ),
        makeSnapshot(
          "TERM_3",
          [makeSubject({ id: "subj-1", studentAverage: 16 })],
          { student: 16, class: 13, min: 8, max: 19 },
        ),
      ],
      t,
    );

    expect(snapshot?.generalAverage.student).toBe(13);
    expect(snapshot?.term).toBe("YEARLY");
  });

  it("computes the yearly average per subject from the terms where it was graded", () => {
    const snapshot = computeYearlySnapshot(
      [
        makeSnapshot("TERM_1", [
          makeSubject({ id: "subj-1", studentAverage: 12 }),
        ]),
        makeSnapshot("TERM_2", [
          makeSubject({ id: "subj-1", studentAverage: 14 }),
          makeSubject({ id: "subj-2", studentAverage: 8 }),
        ]),
        makeSnapshot("TERM_3", [
          makeSubject({ id: "subj-1", studentAverage: 16 }),
        ]),
      ],
      t,
    );

    const subj1 = snapshot?.subjects.find((s) => s.id === "subj-1");
    const subj2 = snapshot?.subjects.find((s) => s.id === "subj-2");

    expect(subj1?.studentAverage).toBe(14); // (12+14+16)/3
    expect(subj1?.termAverages).toEqual({
      TERM_1: 12,
      TERM_2: 14,
      TERM_3: 16,
    });
    expect(subj2?.studentAverage).toBe(8); // only graded in T2
    expect(subj2?.termAverages).toEqual({
      TERM_1: null,
      TERM_2: 8,
      TERM_3: null,
    });
  });

  it("keeps a null yearly average for a subject never graded", () => {
    const snapshot = computeYearlySnapshot(
      [
        makeSnapshot("TERM_1", [
          makeSubject({ id: "subj-1", studentAverage: null }),
        ]),
      ],
      t,
    );

    expect(snapshot?.subjects[0]?.studentAverage).toBeNull();
  });
});
