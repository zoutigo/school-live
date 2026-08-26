/**
 * Tests unitaires : ManagementService.rolloverSchoolYear — reconduction des
 * classes (dont l'enseignant référent) et, sur option, des affectations
 * enseignant/classe/matière d'une année scolaire vers une autre.
 */
import { ManagementService } from "./management.service.js";
import type { EnrollmentsService } from "../enrollments/enrollments.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const SCHOOL_ID = "school-1";
const SOURCE_YEAR_ID = "year-source";

const SOURCE_CLASS = {
  id: "class-source-1",
  name: "6e A",
  academicLevelId: "level-1",
  trackId: null,
  curriculumId: "curriculum-1",
  referentTeacherUserId: "teacher-1" as string | null,
};

function makeService(
  overrides: {
    sourceClasses?: (typeof SOURCE_CLASS)[];
    sourceAssignments?: Array<{
      teacherUserId: string;
      classId: string;
      subjectId: string;
    }>;
  } = {},
) {
  const createdClasses: any[] = [];
  const prisma: any = {
    school: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ activeSchoolYearId: SOURCE_YEAR_ID }),
    },
    schoolYear: {
      findFirst: jest.fn().mockResolvedValue({ id: SOURCE_YEAR_ID }),
      upsert: jest
        .fn()
        .mockImplementation(({ create }) =>
          Promise.resolve({ id: "target-year", ...create }),
        ),
    },
    class: {
      findMany: jest
        .fn()
        .mockResolvedValue(overrides.sourceClasses ?? [SOURCE_CLASS]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => {
        const created = { id: `target-${createdClasses.length}`, ...data };
        createdClasses.push(created);
        return Promise.resolve({ id: created.id });
      }),
    },
    teacherClassSubject: {
      findMany: jest.fn().mockResolvedValue(overrides.sourceAssignments ?? []),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg),
    ),
  };
  const enrollmentsService = {
    provisionFeeSchedulesForNewYear: jest.fn().mockResolvedValue(undefined),
    provisionSupplyListsForNewYear: jest.fn().mockResolvedValue(undefined),
    provisionReinscriptionDeadlinesForNewYear: jest
      .fn()
      .mockResolvedValue(undefined),
  };
  const service = new ManagementService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
    undefined,
    undefined,
    enrollmentsService as unknown as EnrollmentsService,
  );
  return { service, prisma, enrollmentsService, createdClasses };
}

describe("ManagementService.rolloverSchoolYear — classes et affectations", () => {
  it("reconduit l'enseignant référent de chaque classe copiée", async () => {
    const { service, prisma } = makeService();

    await service.rolloverSchoolYear(SCHOOL_ID, {
      sourceSchoolYearId: SOURCE_YEAR_ID,
      targetLabel: "2027-2028",
    });

    expect(prisma.class.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referentTeacherUserId: "teacher-1",
        }),
      }),
    );
  });

  it("ne perd pas l'absence de référent (classe sans enseignant référent)", async () => {
    const { service, prisma } = makeService({
      sourceClasses: [{ ...SOURCE_CLASS, referentTeacherUserId: null }],
    });

    await service.rolloverSchoolYear(SCHOOL_ID, {
      sourceSchoolYearId: SOURCE_YEAR_ID,
      targetLabel: "2027-2028",
    });

    expect(prisma.class.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referentTeacherUserId: null,
        }),
      }),
    );
  });

  it("copie les affectations enseignant/matière quand copyAssignments est vrai (défaut)", async () => {
    const { service, prisma } = makeService({
      sourceAssignments: [
        {
          teacherUserId: "teacher-1",
          classId: SOURCE_CLASS.id,
          subjectId: "subject-1",
        },
      ],
    });

    await service.rolloverSchoolYear(SCHOOL_ID, {
      sourceSchoolYearId: SOURCE_YEAR_ID,
      targetLabel: "2027-2028",
    });

    expect(prisma.teacherClassSubject.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            teacherUserId: "teacher-1",
            subjectId: "subject-1",
          }),
        ],
      }),
    );
  });

  it("ne copie pas les affectations quand copyAssignments est explicitement faux", async () => {
    const { service, prisma } = makeService({
      sourceAssignments: [
        {
          teacherUserId: "teacher-1",
          classId: SOURCE_CLASS.id,
          subjectId: "subject-1",
        },
      ],
    });

    await service.rolloverSchoolYear(SCHOOL_ID, {
      sourceSchoolYearId: SOURCE_YEAR_ID,
      targetLabel: "2027-2028",
      copyAssignments: false,
    });

    expect(prisma.teacherClassSubject.createMany).not.toHaveBeenCalled();
  });
});
