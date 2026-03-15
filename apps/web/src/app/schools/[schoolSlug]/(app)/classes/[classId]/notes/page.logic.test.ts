import { describe, expect, it } from "vitest";
import {
  getCreateEvaluationDefaults,
  getEvaluationListMeta,
  hasMeaningfulRichTextContent,
  normalizeOptionalRichTextHtml,
  paginateEvaluations,
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
      term: "TERM_1",
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
