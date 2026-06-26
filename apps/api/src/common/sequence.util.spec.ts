import type { Sequence, Term } from "@prisma/client";
import {
  evaluationCountsForAverage,
  isFirstSequenceOfTerm,
  sequenceLabel,
  SEQUENCE_TO_TERM,
  termFromSequence,
  termLabel,
  TERM_TO_SEQUENCES,
} from "./sequence.util.js";

describe("sequence.util", () => {
  describe("SEQUENCE_TO_TERM", () => {
    it("maps SEQ_1 and SEQ_2 to TERM_1", () => {
      expect(SEQUENCE_TO_TERM["SEQ_1"]).toBe("TERM_1");
      expect(SEQUENCE_TO_TERM["SEQ_2"]).toBe("TERM_1");
    });

    it("maps SEQ_3 and SEQ_4 to TERM_2", () => {
      expect(SEQUENCE_TO_TERM["SEQ_3"]).toBe("TERM_2");
      expect(SEQUENCE_TO_TERM["SEQ_4"]).toBe("TERM_2");
    });

    it("maps SEQ_5 and SEQ_6 to TERM_3", () => {
      expect(SEQUENCE_TO_TERM["SEQ_5"]).toBe("TERM_3");
      expect(SEQUENCE_TO_TERM["SEQ_6"]).toBe("TERM_3");
    });

    it("covers all 6 sequences", () => {
      const sequences: Sequence[] = [
        "SEQ_1",
        "SEQ_2",
        "SEQ_3",
        "SEQ_4",
        "SEQ_5",
        "SEQ_6",
      ];
      for (const seq of sequences) {
        expect(SEQUENCE_TO_TERM[seq]).toBeDefined();
      }
    });
  });

  describe("TERM_TO_SEQUENCES", () => {
    it("TERM_1 yields [SEQ_1, SEQ_2]", () => {
      expect(TERM_TO_SEQUENCES["TERM_1"]).toEqual(["SEQ_1", "SEQ_2"]);
    });

    it("TERM_2 yields [SEQ_3, SEQ_4]", () => {
      expect(TERM_TO_SEQUENCES["TERM_2"]).toEqual(["SEQ_3", "SEQ_4"]);
    });

    it("TERM_3 yields [SEQ_5, SEQ_6]", () => {
      expect(TERM_TO_SEQUENCES["TERM_3"]).toEqual(["SEQ_5", "SEQ_6"]);
    });

    it("is the inverse of SEQUENCE_TO_TERM", () => {
      const terms: Term[] = ["TERM_1", "TERM_2", "TERM_3"];
      for (const term of terms) {
        const [seq1, seq2] = TERM_TO_SEQUENCES[term];
        expect(SEQUENCE_TO_TERM[seq1]).toBe(term);
        expect(SEQUENCE_TO_TERM[seq2]).toBe(term);
      }
    });
  });

  describe("termFromSequence", () => {
    const cases: [Sequence, Term][] = [
      ["SEQ_1", "TERM_1"],
      ["SEQ_2", "TERM_1"],
      ["SEQ_3", "TERM_2"],
      ["SEQ_4", "TERM_2"],
      ["SEQ_5", "TERM_3"],
      ["SEQ_6", "TERM_3"],
    ];

    it.each(cases)("termFromSequence(%s) → %s", (seq, expected) => {
      expect(termFromSequence(seq)).toBe(expected);
    });
  });

  describe("isFirstSequenceOfTerm", () => {
    it("returns true for odd sequences (SEQ_1, SEQ_3, SEQ_5)", () => {
      expect(isFirstSequenceOfTerm("SEQ_1")).toBe(true);
      expect(isFirstSequenceOfTerm("SEQ_3")).toBe(true);
      expect(isFirstSequenceOfTerm("SEQ_5")).toBe(true);
    });

    it("returns false for even sequences (SEQ_2, SEQ_4, SEQ_6)", () => {
      expect(isFirstSequenceOfTerm("SEQ_2")).toBe(false);
      expect(isFirstSequenceOfTerm("SEQ_4")).toBe(false);
      expect(isFirstSequenceOfTerm("SEQ_6")).toBe(false);
    });
  });

  describe("evaluationCountsForAverage", () => {
    describe("odd sequences (SEQ_1, SEQ_3, SEQ_5) — all evaluations count", () => {
      const oddSeqs: Sequence[] = ["SEQ_1", "SEQ_3", "SEQ_5"];

      it.each(oddSeqs)(
        "%s: formative evaluation counts (isFinalExam=false)",
        (seq) => {
          expect(evaluationCountsForAverage(seq, false)).toBe(true);
        },
      );

      it.each(oddSeqs)(
        "%s: final exam also counts (isFinalExam=true)",
        (seq) => {
          expect(evaluationCountsForAverage(seq, true)).toBe(true);
        },
      );
    });

    describe("even sequences (SEQ_2, SEQ_4, SEQ_6) — only final exam counts", () => {
      const evenSeqs: Sequence[] = ["SEQ_2", "SEQ_4", "SEQ_6"];

      it.each(evenSeqs)(
        "%s: formative evaluation does NOT count (isFinalExam=false)",
        (seq) => {
          expect(evaluationCountsForAverage(seq, false)).toBe(false);
        },
      );

      it.each(evenSeqs)("%s: final exam counts (isFinalExam=true)", (seq) => {
        expect(evaluationCountsForAverage(seq, true)).toBe(true);
      });
    });
  });

  describe("sequenceLabel", () => {
    const cases: [Sequence, string][] = [
      ["SEQ_1", "Séquence 1"],
      ["SEQ_2", "Séquence 2"],
      ["SEQ_3", "Séquence 3"],
      ["SEQ_4", "Séquence 4"],
      ["SEQ_5", "Séquence 5"],
      ["SEQ_6", "Séquence 6"],
    ];

    it.each(cases)("sequenceLabel(%s) → %s", (seq, expected) => {
      expect(sequenceLabel(seq)).toBe(expected);
    });

    it("returns a non-empty string for every sequence", () => {
      const sequences: Sequence[] = [
        "SEQ_1",
        "SEQ_2",
        "SEQ_3",
        "SEQ_4",
        "SEQ_5",
        "SEQ_6",
      ];
      for (const seq of sequences) {
        expect(sequenceLabel(seq).trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("termLabel", () => {
    it("returns '1er Trimestre' for TERM_1", () => {
      expect(termLabel("TERM_1")).toBe("1er Trimestre");
    });

    it("returns '2ème Trimestre' for TERM_2", () => {
      expect(termLabel("TERM_2")).toBe("2ème Trimestre");
    });

    it("returns '3ème Trimestre' for TERM_3", () => {
      expect(termLabel("TERM_3")).toBe("3ème Trimestre");
    });

    it("returns distinct labels for each term", () => {
      const terms: Term[] = ["TERM_1", "TERM_2", "TERM_3"];
      const labels = terms.map(termLabel);
      expect(new Set(labels).size).toBe(3);
    });
  });
});
