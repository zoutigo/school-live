import {
  DUPLICATE_BLOCK_THRESHOLD,
  DUPLICATE_WARNING_THRESHOLD,
  findPotentialDuplicates,
  titleSimilarity,
} from "./resources-duplicate.util.js";

describe("titleSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(titleSimilarity("Devoir surveille n1", "Devoir surveille n1")).toBe(
      1,
    );
  });

  it("returns 1 for two empty strings", () => {
    expect(titleSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one string is empty and the other is not", () => {
    expect(titleSimilarity("", "Devoir surveille")).toBe(0);
  });

  it("ignores case, accents and punctuation", () => {
    const score = titleSimilarity(
      "Évaluation - Séquence 2 !",
      "evaluation sequence 2",
    );
    expect(score).toBe(1);
  });

  it("scores near-duplicates highly (above the block threshold)", () => {
    const score = titleSimilarity(
      "Devoir surveille de mathematiques sequence 2",
      "Devoir surveille de maths sequence 2",
    );
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_BLOCK_THRESHOLD);
  });

  it("scores unrelated titles low (below the warning threshold)", () => {
    const score = titleSimilarity(
      "Devoir surveille de mathematiques",
      "Interrogation ecrite de physique-chimie",
    );
    expect(score).toBeLessThan(DUPLICATE_WARNING_THRESHOLD);
  });

  it("is symmetric", () => {
    const a = "Controle continu histoire geographie";
    const b = "Evaluation histoire-geo";
    expect(titleSimilarity(a, b)).toBe(titleSimilarity(b, a));
  });

  it("handles single-character titles without throwing", () => {
    expect(() => titleSimilarity("A", "B")).not.toThrow();
    expect(titleSimilarity("A", "A")).toBe(1);
    expect(titleSimilarity("A", "B")).toBe(0);
  });
});

describe("findPotentialDuplicates", () => {
  function makePrismaStub(resources: Array<{ id: string; title: string }>) {
    return {
      resource: {
        findMany: jest.fn().mockResolvedValue(resources),
      },
    } as unknown as import("../prisma/prisma.service.js").PrismaService;
  }

  const baseCriteria = {
    kind: "ASSESSMENT" as const,
    schoolId: "school-1",
    academicLevelId: "level-1",
    subjectId: "subject-1",
    academicYearLabel: "2025-2026",
    examType: "SEQUENCE_TEST" as const,
    sequence: "SEQ_1" as const,
  };

  it("filters out candidates below the warning threshold", async () => {
    const prisma = makePrismaStub([
      { id: "r1", title: "Interrogation ecrite de physique-chimie" },
    ]);

    const candidates = await findPotentialDuplicates(prisma, {
      ...baseCriteria,
      title: "Devoir surveille de mathematiques",
    });

    expect(candidates).toEqual([]);
  });

  it("returns candidates sorted by descending score", async () => {
    const prisma = makePrismaStub([
      { id: "r1", title: "Devoir surveille maths" },
      { id: "r2", title: "Devoir surveille de mathematiques sequence 1" },
    ]);

    const candidates = await findPotentialDuplicates(prisma, {
      ...baseCriteria,
      title: "Devoir surveille de mathematiques sequence 1",
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].id).toBe("r2");
    expect(candidates[0].score).toBeGreaterThanOrEqual(
      DUPLICATE_BLOCK_THRESHOLD,
    );
    for (let i = 1; i < candidates.length; i += 1) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(
        candidates[i].score,
      );
    }
  });

  it("scopes the search with the exact structural fields (school, level, subject, year, sequence/examType)", async () => {
    const prisma = makePrismaStub([]);

    await findPotentialDuplicates(prisma, {
      ...baseCriteria,
      title: "Devoir surveille",
    });

    expect(prisma.resource.findMany).toHaveBeenCalledWith({
      where: {
        kind: "ASSESSMENT",
        schoolId: "school-1",
        academicLevelId: "level-1",
        subjectId: "subject-1",
        academicYearLabel: "2025-2026",
        examType: "SEQUENCE_TEST",
        sequence: "SEQ_1",
      },
      select: { id: true, title: true },
    });
  });

  it("ignores schoolId and sequence for EXAM resources (national scope)", async () => {
    const prisma = makePrismaStub([]);

    await findPotentialDuplicates(prisma, {
      ...baseCriteria,
      kind: "EXAM",
      schoolId: null,
      sequence: null,
      title: "Examen national",
    });

    expect(prisma.resource.findMany).toHaveBeenCalledWith({
      where: {
        kind: "EXAM",
        schoolId: null,
        academicLevelId: "level-1",
        subjectId: "subject-1",
        academicYearLabel: "2025-2026",
        examType: "SEQUENCE_TEST",
        sequence: null,
      },
      select: { id: true, title: true },
    });
  });

  it("excludes the given resourceId when provided", async () => {
    const prisma = makePrismaStub([]);

    await findPotentialDuplicates(prisma, {
      ...baseCriteria,
      title: "Devoir surveille",
      excludeResourceId: "resource-self",
    });

    expect(prisma.resource.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "resource-self" } }),
      }),
    );
  });
});
