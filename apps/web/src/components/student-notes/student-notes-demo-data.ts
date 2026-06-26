import type {
  StudentNotesSequenceSnapshot,
  StudentNotesTermSnapshot,
} from "./student-notes.types";

const makeSubjectsTerm1Seq1 = (): StudentNotesSequenceSnapshot["subjects"] => [
  {
    id: "francais",
    subjectLabel: "Francais",
    teachers: ["M. Jamet P.", "Mme Lambert M."],
    coefficient: 1,
    studentAverage: 15.5,
    classAverage: 13.92,
    classMin: 9,
    classMax: 17.33,
    appreciation: null,
    evaluations: [
      {
        id: "fr-1",
        label: "Lecture",
        score: 20,
        maxScore: 20,
        recordedAt: "05/09",
        countsForAverage: true,
        isFinalExam: false,
      },
      {
        id: "fr-2",
        label: "Expression ecrite",
        score: 16,
        maxScore: 20,
        recordedAt: "22/10",
        countsForAverage: true,
        isFinalExam: false,
      },
      {
        id: "fr-3",
        label: "Composition",
        score: 10.5,
        maxScore: 20,
        recordedAt: "18/11",
        countsForAverage: true,
        isFinalExam: true,
      },
    ],
  },
  {
    id: "mathematiques",
    subjectLabel: "Mathematiques",
    teachers: ["M. Auberger C."],
    coefficient: 1,
    studentAverage: 18.38,
    classAverage: 16.72,
    classMin: 5.25,
    classMax: 20,
    appreciation: null,
    evaluations: [
      {
        id: "ma-1",
        label: "Calcul",
        score: 19.5,
        maxScore: 20,
        recordedAt: "12/09",
        countsForAverage: true,
        isFinalExam: false,
      },
      {
        id: "ma-2",
        label: "Problemes",
        score: 36.5,
        maxScore: 40,
        weight: 2,
        recordedAt: "07/10",
        countsForAverage: true,
        isFinalExam: false,
      },
      {
        id: "ma-3",
        label: "Composition",
        score: 17.5,
        maxScore: 20,
        recordedAt: "28/11",
        countsForAverage: true,
        isFinalExam: true,
      },
    ],
  },
];

const makeSubjectsTerm1Seq2 = (): StudentNotesSequenceSnapshot["subjects"] => [
  {
    id: "francais",
    subjectLabel: "Francais",
    teachers: ["M. Jamet P.", "Mme Lambert M."],
    coefficient: 1,
    studentAverage: 14.0,
    classAverage: 13.2,
    classMin: 8,
    classMax: 18,
    appreciation:
      "Bonne participation francais, Paul travaille avec motivation, continue ainsi.",
    evaluations: [
      {
        id: "fr-s2-1",
        label: "Interro (formative)",
        score: 12,
        maxScore: 20,
        recordedAt: "08/12",
        countsForAverage: false,
        isFinalExam: false,
      },
      {
        id: "fr-s2-2",
        label: "Examen de sequence",
        score: 14,
        maxScore: 20,
        recordedAt: "15/12",
        countsForAverage: true,
        isFinalExam: true,
      },
    ],
  },
  {
    id: "mathematiques",
    subjectLabel: "Mathematiques",
    teachers: ["M. Auberger C."],
    coefficient: 1,
    studentAverage: 17.5,
    classAverage: 15.8,
    classMin: 6,
    classMax: 20,
    appreciation:
      "Tres bon premier trimestre. Paul est implique a l'ecrit et doit intensifier sa participation a l'oral.",
    evaluations: [
      {
        id: "ma-s2-1",
        label: "Exercice (formative)",
        score: 15,
        maxScore: 20,
        recordedAt: "09/12",
        countsForAverage: false,
        isFinalExam: false,
      },
      {
        id: "ma-s2-2",
        label: "Examen de sequence",
        score: 17.5,
        maxScore: 20,
        recordedAt: "16/12",
        countsForAverage: true,
        isFinalExam: true,
      },
    ],
  },
];

const TERM_1_SEQ_1: StudentNotesSequenceSnapshot = {
  sequence: "SEQ_1",
  sequenceLabel: "Sequence 1",
  isFirstSeq: true,
  generalAverage: { student: 16.94, class: 15.32, min: 7.13, max: 18.87 },
  subjects: makeSubjectsTerm1Seq1(),
};

const TERM_1_SEQ_2: StudentNotesSequenceSnapshot = {
  sequence: "SEQ_2",
  sequenceLabel: "Sequence 2",
  isFirstSeq: false,
  generalAverage: { student: 15.75, class: 14.5, min: 7.0, max: 19.0 },
  subjects: makeSubjectsTerm1Seq2(),
};

export const STUDENT_NOTES_DEMO_DATA: StudentNotesTermSnapshot[] = [
  {
    term: "TERM_1",
    label: "1er Trimestre",
    councilLabel:
      "Conseil de classe de 6eme N3 le mardi 9 decembre 2025 a 17:30",
    generatedAtLabel: "Moyennes calculees le jeudi 18 decembre a 09:32",
    generalAverage: {
      student: 16.31,
      class: 16.29,
      min: 12.45,
      max: 18.84,
    },
    sequences: [TERM_1_SEQ_1, TERM_1_SEQ_2],
    subjects: [
      ...makeSubjectsTerm1Seq1().map((s) => ({
        ...s,
        appreciation:
          makeSubjectsTerm1Seq2().find((s2) => s2.id === s.id)?.appreciation ??
          null,
      })),
    ],
  },
  {
    term: "TERM_2",
    label: "2eme Trimestre",
    councilLabel: "Conseil de classe de 6eme N3 le mardi 17 mars 2026 a 16:45",
    generatedAtLabel: "Moyennes calculees le mardi 10 mars a 23:03",
    generalAverage: {
      student: 15.93,
      class: 16.47,
      min: 13,
      max: 19.47,
    },
    sequences: [
      {
        sequence: "SEQ_3",
        sequenceLabel: "Sequence 3",
        isFirstSeq: true,
        generalAverage: { student: 15.5, class: 16.0, min: 12.0, max: 19.5 },
        subjects: [
          {
            id: "francais",
            subjectLabel: "Francais",
            teachers: ["M. Jamet P."],
            coefficient: 1,
            studentAverage: 16.5,
            classAverage: 15.8,
            classMin: 10,
            classMax: 20,
            appreciation: null,
            evaluations: [
              {
                id: "fr3-1",
                label: "Lecture",
                score: 17,
                maxScore: 20,
                recordedAt: "10/01",
                countsForAverage: true,
                isFinalExam: false,
              },
              {
                id: "fr3-2",
                label: "Composition S3",
                score: 16,
                maxScore: 20,
                recordedAt: "28/01",
                countsForAverage: true,
                isFinalExam: true,
              },
            ],
          },
        ],
      },
      {
        sequence: "SEQ_4",
        sequenceLabel: "Sequence 4",
        isFirstSeq: false,
        generalAverage: { student: 16.36, class: 16.94, min: 14.0, max: 19.44 },
        subjects: [
          {
            id: "francais",
            subjectLabel: "Francais",
            teachers: ["M. Jamet P."],
            coefficient: 1,
            studentAverage: 18.0,
            classAverage: 17.29,
            classMin: 12.86,
            classMax: 20,
            appreciation:
              "Des resultats solides et reguliers. Maintenir les efforts en production ecrite.",
            evaluations: [
              {
                id: "fr4-1",
                label: "Exercice (formative)",
                score: 15,
                maxScore: 20,
                recordedAt: "14/02",
                countsForAverage: false,
                isFinalExam: false,
              },
              {
                id: "fr4-2",
                label: "Examen S4",
                score: 18,
                maxScore: 20,
                recordedAt: "05/03",
                countsForAverage: true,
                isFinalExam: true,
              },
            ],
          },
        ],
      },
    ],
    subjects: [
      {
        id: "francais",
        subjectLabel: "Francais",
        teachers: ["M. Jamet P.", "Mme Lambert M."],
        coefficient: 1,
        studentAverage: 17.25,
        classAverage: 16.55,
        classMin: 11.43,
        classMax: 20,
        appreciation:
          "Des resultats solides et reguliers. Maintenir les efforts en production ecrite.",
        evaluations: [],
      },
    ],
  },
  {
    term: "TERM_3",
    label: "3eme Trimestre",
    councilLabel: "Conseil de classe a venir",
    generatedAtLabel: "Donnees de demonstration en attente de consolidation",
    generalAverage: { student: null, class: null, min: null, max: null },
    sequences: [],
    subjects: [],
  },
];
