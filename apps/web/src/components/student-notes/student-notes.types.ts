export type StudentNotesTerm = "TERM_1" | "TERM_2" | "TERM_3";

export type StudentNotesView = "evaluations" | "averages" | "charts";

export type StudentEvaluation = {
  id: string;
  label: string;
  score: number | null;
  maxScore: number;
  weight?: number;
  recordedAt: string;
  status?: "ENTERED" | "ABSENT" | "EXCUSED" | "NOT_GRADED";
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
  subjects: StudentSubjectNotes[];
};
