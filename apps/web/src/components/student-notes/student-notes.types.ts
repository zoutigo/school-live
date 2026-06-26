export type StudentNotesTerm = "TERM_1" | "TERM_2" | "TERM_3";
export type StudentNotesSequence =
  | "SEQ_1"
  | "SEQ_2"
  | "SEQ_3"
  | "SEQ_4"
  | "SEQ_5"
  | "SEQ_6";

export type StudentNotesView = "evaluations" | "averages" | "charts";

export type StudentEvaluation = {
  id: string;
  label: string;
  score: number | null;
  maxScore: number;
  weight?: number;
  recordedAt: string;
  status?: "ENTERED" | "ABSENT" | "EXCUSED" | "NOT_GRADED";
  countsForAverage: boolean;
  isFinalExam: boolean;
};

export type StudentSubjectNotes = {
  id: string;
  subjectLabel: string;
  teachers: string[];
  coefficient: number;
  studentAverage: number | null;
  classAverage: number | null;
  classMin: number | null;
  classMax: number | null;
  appreciation?: string | null;
  evaluations: StudentEvaluation[];
};

export type StudentNotesSequenceSnapshot = {
  sequence: StudentNotesSequence;
  sequenceLabel: string;
  isFirstSeq: boolean;
  generalAverage: {
    student: number | null;
    class: number | null;
    min: number | null;
    max: number | null;
  };
  subjects: StudentSubjectNotes[];
};

export type StudentNotesTermSnapshot = {
  term: StudentNotesTerm;
  label: string;
  councilLabel: string;
  generatedAtLabel: string;
  generalAverage: {
    student: number | null;
    class: number | null;
    min: number | null;
    max: number | null;
  };
  sequences: StudentNotesSequenceSnapshot[];
  subjects: StudentSubjectNotes[];
};
