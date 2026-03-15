import { EvaluationsService } from "../src/evaluations/evaluations.service";

describe("EvaluationsService", () => {
  const prisma = {
    evaluationType: {
      upsert: jest.fn(),
    },
    evaluation: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new EvaluationsService(prisma as never);

  const baseUser = {
    id: "teacher-1",
    platformRoles: [] as Array<"SUPER_ADMIN" | "ADMIN" | "SALES" | "SUPPORT">,
    memberships: [{ schoolId: "school-1", role: "TEACHER" as const }],
    profileCompleted: true,
    firstName: "Albert",
    lastName: "Mvondo",
  };

  beforeEach(() => {
    prisma.evaluationType.upsert.mockReset();
    prisma.evaluation.create.mockReset();
    prisma.evaluation.update.mockReset();
    (service as any).ensureDefaultEvaluationTypes = jest.fn();
    (service as any).ensureClassAccessible = jest.fn().mockResolvedValue({
      id: "class-1",
      schoolYearId: "sy-1",
    });
    (service as any).ensureSubjectAccessible = jest.fn();
    (service as any).ensureEvaluationTypeInSchool = jest.fn();
    (service as any).ensureSubjectBranchBelongsToSubject = jest.fn();
    (service as any).logAudit = jest.fn();
    (service as any).findAccessibleEvaluation = jest.fn().mockResolvedValue({
      id: "eval-1",
      schoolId: "school-1",
      schoolYearId: "sy-1",
      classId: "class-1",
      subjectId: "sub-1",
      status: "DRAFT",
    });
  });

  it("sanitizes evaluation description on creation", async () => {
    prisma.evaluation.create.mockResolvedValue({
      id: "eval-1",
      subject: { id: "sub-1", name: "Mathematiques" },
      subjectBranch: null,
      evaluationType: { id: "type-1", code: "COMP", label: "Composition" },
      attachments: [],
    });

    await service.createEvaluation(baseUser, "school-1", "class-1", {
      subjectId: "sub-1",
      subjectBranchId: "branch-1",
      evaluationTypeId: "type-1",
      title: "Composition",
      description:
        '<p onclick="alert(1)">Consigne</p><script>alert(1)</script><img src="https://cdn/image.png" />',
      coefficient: 2,
      maxScore: 20,
      term: "TERM_1",
      status: "DRAFT",
    });

    expect(prisma.evaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "<p>Consigne</p>",
        }),
      }),
    );
  });

  it("stores null when sanitized evaluation description is empty on update", async () => {
    prisma.evaluation.update.mockResolvedValue({
      id: "eval-1",
      subject: { id: "sub-1", name: "Mathematiques" },
      subjectBranch: null,
      evaluationType: { id: "type-1", code: "COMP", label: "Composition" },
      attachments: [],
    });

    await service.updateEvaluation(baseUser, "school-1", "class-1", "eval-1", {
      description: "<p><br></p><script>alert(1)</script>",
    });

    expect(prisma.evaluation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
        }),
      }),
    );
  });
});
