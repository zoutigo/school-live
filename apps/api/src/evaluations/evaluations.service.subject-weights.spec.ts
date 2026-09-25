import { Test } from "@nestjs/testing";
import { GradePublishedNotificationsService } from "../notifications/grade-published-notifications.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { EvaluationsService } from "./evaluations.service.js";

const SCHOOL_ID = "school-1";
const NATIONAL_CURRICULUM_ID = "curriculum-national-1";

function makePrismaMock() {
  return {
    curriculumSubject: { findMany: jest.fn().mockResolvedValue([]) },
    curriculumSubjectOverride: { findMany: jest.fn().mockResolvedValue([]) },
    classSubjectOverride: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

type LoadSubjectWeights = (
  schoolId: string,
  curriculumId: string | null,
  classId: string | null,
) => Promise<Map<string, number>>;

describe("EvaluationsService — loadSubjectWeights (curriculum national)", () => {
  let loadSubjectWeights: LoadSubjectWeights;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: GradePublishedNotificationsService,
          useValue: { notifyGradePublished: jest.fn() },
        },
      ],
    }).compile();

    const service = module.get(EvaluationsService);
    loadSubjectWeights = (
      service as unknown as { loadSubjectWeights: LoadSubjectWeights }
    ).loadSubjectWeights.bind(service);
  });

  it("reprend le coefficient de la base nationale quand aucun override n'existe", async () => {
    prisma.curriculumSubject.findMany.mockImplementation(
      ({ where }: { where: { schoolId: string | null } }) =>
        Promise.resolve(
          where.schoolId === null
            ? [{ subjectId: "subject-math", coefficient: 4 }]
            : [],
        ),
    );

    const weights = await loadSubjectWeights(
      SCHOOL_ID,
      NATIONAL_CURRICULUM_ID,
      null,
    );

    expect(weights.get("subject-math")).toBe(4);
  });

  it("exclut une matiere nationale marquee REMOVE pour cette ecole", async () => {
    prisma.curriculumSubject.findMany.mockImplementation(
      ({ where }: { where: { schoolId: string | null } }) =>
        Promise.resolve(
          where.schoolId === null
            ? [{ subjectId: "subject-grec", coefficient: 2 }]
            : [],
        ),
    );
    prisma.curriculumSubjectOverride.findMany.mockResolvedValue([
      {
        subjectId: "subject-grec",
        action: "REMOVE",
        coefficientOverride: null,
      },
    ]);

    const weights = await loadSubjectWeights(
      SCHOOL_ID,
      NATIONAL_CURRICULUM_ID,
      null,
    );

    expect(weights.has("subject-grec")).toBe(false);
  });

  it("prend en compte le coefficient d'une matiere ajoutee par l'ecole (override ADD hors base nationale)", async () => {
    prisma.curriculumSubjectOverride.findMany.mockResolvedValue([
      {
        subjectId: "subject-chinois",
        action: "ADD",
        coefficientOverride: 1,
      },
    ]);

    const weights = await loadSubjectWeights(
      SCHOOL_ID,
      NATIONAL_CURRICULUM_ID,
      null,
    );

    expect(weights.get("subject-chinois")).toBe(1);
  });
});
