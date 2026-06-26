import type { Sequence, Term } from "@prisma/client";

export const SEQUENCE_TO_TERM: Record<Sequence, Term> = {
  SEQ_1: "TERM_1",
  SEQ_2: "TERM_1",
  SEQ_3: "TERM_2",
  SEQ_4: "TERM_2",
  SEQ_5: "TERM_3",
  SEQ_6: "TERM_3",
};

export const TERM_TO_SEQUENCES: Record<Term, [Sequence, Sequence]> = {
  TERM_1: ["SEQ_1", "SEQ_2"],
  TERM_2: ["SEQ_3", "SEQ_4"],
  TERM_3: ["SEQ_5", "SEQ_6"],
};

export function termFromSequence(sequence: Sequence): Term {
  return SEQUENCE_TO_TERM[sequence];
}

/** SEQ_1, SEQ_3, SEQ_5 → toutes les évals comptent */
export function isFirstSequenceOfTerm(sequence: Sequence): boolean {
  return sequence === "SEQ_1" || sequence === "SEQ_3" || sequence === "SEQ_5";
}

/** Une évaluation compte-t-elle dans la moyenne de séquence ? */
export function evaluationCountsForAverage(
  sequence: Sequence,
  isFinalExam: boolean,
): boolean {
  // Séquence impaire (1ère du trimestre) → tout compte
  if (isFirstSequenceOfTerm(sequence)) return true;
  // Séquence paire (2ème du trimestre) → seulement l'éval de fin de séquence
  return isFinalExam;
}

export function sequenceLabel(sequence: Sequence): string {
  const labels: Record<Sequence, string> = {
    SEQ_1: "Séquence 1",
    SEQ_2: "Séquence 2",
    SEQ_3: "Séquence 3",
    SEQ_4: "Séquence 4",
    SEQ_5: "Séquence 5",
    SEQ_6: "Séquence 6",
  };
  return labels[sequence];
}

export function termLabel(term: Term): string {
  if (term === "TERM_1") return "1er Trimestre";
  if (term === "TERM_2") return "2ème Trimestre";
  return "3ème Trimestre";
}
