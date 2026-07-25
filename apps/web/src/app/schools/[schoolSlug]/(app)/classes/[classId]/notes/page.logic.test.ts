import { describe, expect, it } from "vitest";
import {
  filterEvaluations,
  getCreateEvaluationDefaults,
  getEvaluationListMeta,
  hasActiveEvaluationListFilters,
  hasMeaningfulRichTextContent,
  isEvaluationComplete,
  NO_EVALUATION_LIST_FILTERS,
  normalizeOptionalRichTextHtml,
  paginateEvaluations,
  type EvaluationListFilters,
} from "./page-logic";

describe("TeacherClassNotesPage evaluations list logic", () => {
  it("paginates evaluations with a stable page size", () => {
    const items = ["a", "b", "c", "d", "e", "f"];

    expect(paginateEvaluations(items, 1, 5)).toEqual(["a", "b", "c", "d", "e"]);
    expect(paginateEvaluations(items, 2, 5)).toEqual(["f"]);
  });

  it("builds compact list metadata from scheduled date and scores", () => {
    expect(
      getEvaluationListMeta(
        {
          scheduledAt: "2026-03-30T10:00:00.000Z",
          createdAt: "2026-03-11T08:00:00.000Z",
          _count: { scores: 2 },
        },
        20,
      ),
    ).toEqual({
      scoreProgress: "2/20",
      dateLabel: "30/03/2026",
    });
  });

  it("builds default create-form values from the teacher context", () => {
    expect(
      getCreateEvaluationDefaults({
        class: { id: "class-1", name: "6eC", schoolYearId: "sy-1" },
        subjects: [
          {
            id: "sub-1",
            name: "Anglais",
            branches: [{ id: "branch-1", name: "Expression ecrite" }],
          },
        ],
        evaluationTypes: [
          { id: "type-1", code: "COMP", label: "Composition", isDefault: true },
        ],
        students: [],
      }),
    ).toEqual({
      subjectId: "sub-1",
      subjectBranchId: "branch-1",
      evaluationTypeId: "type-1",
      title: "",
      description: "",
      coefficient: 1,
      maxScore: 20,
      sequence: "SEQ_1",
      isFinalExam: false,
      scheduledAt: "",
      status: "DRAFT",
    });
  });

  it("normalizes optional rich text content", () => {
    expect(normalizeOptionalRichTextHtml("<p><br></p>")).toBeUndefined();
    expect(normalizeOptionalRichTextHtml("  <p>Consigne</p>  ")).toBe(
      "<p>Consigne</p>",
    );
    expect(hasMeaningfulRichTextContent("<p>&nbsp;</p>")).toBe(false);
    expect(hasMeaningfulRichTextContent("<p>Texte</p>")).toBe(true);
  });
});

// ─── isEvaluationComplete ────────────────────────────────────────────────────

describe("isEvaluationComplete", () => {
  it("retourne true quand toutes les notes sont saisies", () => {
    expect(isEvaluationComplete({ _count: { scores: 20 } }, 20)).toBe(true);
  });

  it("retourne false quand des notes manquent", () => {
    expect(isEvaluationComplete({ _count: { scores: 5 } }, 20)).toBe(false);
  });

  it("retourne false quand aucun eleve n'est inscrit", () => {
    expect(isEvaluationComplete({ _count: { scores: 0 } }, 0)).toBe(false);
  });
});

// ─── hasActiveEvaluationListFilters ──────────────────────────────────────────

describe("hasActiveEvaluationListFilters", () => {
  it("retourne false pour les filtres par defaut", () => {
    expect(hasActiveEvaluationListFilters(NO_EVALUATION_LIST_FILTERS)).toBe(
      false,
    );
  });

  it("retourne true des qu'un filtre est actif", () => {
    const filters: EvaluationListFilters = {
      ...NO_EVALUATION_LIST_FILTERS,
      evaluationTypeId: "type-1",
    };
    expect(hasActiveEvaluationListFilters(filters)).toBe(true);
  });
});

// ─── filterEvaluations ───────────────────────────────────────────────────────

describe("filterEvaluations", () => {
  const EVAL_A = {
    title: "Composition 1",
    subject: { name: "Mathematiques" },
    evaluationType: { id: "type-1" },
    sequence: "SEQ_1" as const,
    _count: { scores: 10 },
  };
  const EVAL_B = {
    title: "DS Algebre",
    subject: { name: "Mathematiques" },
    evaluationType: { id: "type-2" },
    sequence: "SEQ_3" as const,
    _count: { scores: 0 },
  };
  const items = [EVAL_A, EVAL_B];

  it("filtre par recherche sur le titre ou la matiere", () => {
    expect(
      filterEvaluations(items, "DS Algebre", NO_EVALUATION_LIST_FILTERS, 20),
    ).toEqual([EVAL_B]);
  });

  it("filtre par type d'evaluation", () => {
    expect(
      filterEvaluations(
        items,
        "",
        {
          ...NO_EVALUATION_LIST_FILTERS,
          evaluationTypeId: "type-2",
        },
        20,
      ),
    ).toEqual([EVAL_B]);
  });

  it("filtre par sequence", () => {
    expect(
      filterEvaluations(
        items,
        "",
        {
          ...NO_EVALUATION_LIST_FILTERS,
          sequence: "SEQ_1",
        },
        20,
      ),
    ).toEqual([EVAL_A]);
  });

  it("filtre par completion des notes", () => {
    expect(
      filterEvaluations(
        items,
        "",
        {
          ...NO_EVALUATION_LIST_FILTERS,
          completion: "complete",
        },
        10,
      ),
    ).toEqual([EVAL_A]);
    expect(
      filterEvaluations(
        items,
        "",
        {
          ...NO_EVALUATION_LIST_FILTERS,
          completion: "incomplete",
        },
        10,
      ),
    ).toEqual([EVAL_B]);
  });

  it("combine recherche et filtres", () => {
    expect(
      filterEvaluations(
        items,
        "compo",
        {
          ...NO_EVALUATION_LIST_FILTERS,
          evaluationTypeId: "type-2",
        },
        20,
      ),
    ).toEqual([]);
  });
});
