import { ManagementService } from "../src/management/management.service.js";

/**
 * Régression : une école utilisant un curriculum NATIONAL (schoolId: null) directement
 * sur ses classes doit voir les matières de ce curriculum, et pouvoir affecter des
 * enseignants dessus. Les lignes CurriculumSubject d'un curriculum national ont elles
 * aussi schoolId: null (cf. management.service.ts listNationalCurriculumSubjects),
 * donc tout filtre `where: { schoolId: <écoleId> }` sur CurriculumSubject casse ce cas.
 */

const prisma = {
  curriculum: { findFirst: jest.fn() },
  curriculumSubject: { findMany: jest.fn(), findFirst: jest.fn() },
  schoolYear: { findFirst: jest.fn() },
  class: { findFirst: jest.fn() },
  schoolMembership: { findFirst: jest.fn() },
  subject: { findFirst: jest.fn() },
  teacherClassSubject: { upsert: jest.fn() },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

const SCHOOL_ID = "school-vogt";
const NATIONAL_CURRICULUM_ID = "curriculum-national-6eme";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — matières d'un curriculum national utilisé par une école", () => {
  it("listCurriculumSubjects renvoie les matières d'un curriculum national (CurriculumSubject.schoolId = null)", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({
      id: NATIONAL_CURRICULUM_ID,
    });
    prisma.curriculumSubject.findMany.mockResolvedValue([
      {
        id: "cs-1",
        schoolId: null,
        curriculumId: NATIONAL_CURRICULUM_ID,
        subjectId: "sub-ang",
      },
    ]);

    const result = await service.listCurriculumSubjects(
      SCHOOL_ID,
      NATIONAL_CURRICULUM_ID,
    );

    expect(prisma.curriculumSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { curriculumId: NATIONAL_CURRICULUM_ID },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it("createTeacherAssignment autorise une matière prévue par le curriculum national de la classe", async () => {
    prisma.schoolYear.findFirst.mockResolvedValue({ id: "sy-1" });
    prisma.class.findFirst
      // ensureClassInSchoolAndGet
      .mockResolvedValueOnce({ id: "class-1", schoolYearId: "sy-1" })
      // ensureSubjectAssignableToClass
      .mockResolvedValueOnce({
        id: "class-1",
        curriculumId: NATIONAL_CURRICULUM_ID,
      });
    prisma.schoolMembership.findFirst.mockResolvedValue({ id: "membership-1" });
    prisma.subject.findFirst.mockResolvedValue({ id: "sub-ang" });
    // ClassSubjectOverride check happens via a different prisma delegate not mocked here;
    // ensureSubjectAssignableToClass only reaches classSubjectOverride when curriculumId is set,
    // so we also stub it to "no override" (undefined => falls through to curriculumSubject check).
    (
      prisma as unknown as { classSubjectOverride: { findFirst: jest.Mock } }
    ).classSubjectOverride = {
      findFirst: jest.fn().mockResolvedValue(null),
    };
    prisma.curriculumSubject.findFirst.mockResolvedValue({ id: "cs-1" });
    prisma.teacherClassSubject.upsert.mockResolvedValue({ id: "tcs-1" });

    await service.createTeacherAssignment(SCHOOL_ID, {
      schoolYearId: "sy-1",
      teacherUserId: "teacher-1",
      classId: "class-1",
      subjectId: "sub-ang",
    });

    expect(prisma.curriculumSubject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { curriculumId: NATIONAL_CURRICULUM_ID, subjectId: "sub-ang" },
      }),
    );
    expect(prisma.teacherClassSubject.upsert).toHaveBeenCalled();
  });
});
