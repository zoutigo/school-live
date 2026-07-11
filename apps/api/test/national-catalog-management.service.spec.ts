import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  subject: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  academicLevel: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  curriculum: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  curriculumSubject: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — catalogue national : AcademicLevel", () => {
  it("liste uniquement les niveaux nationaux (schoolId null) et les marque isNational", async () => {
    prisma.academicLevel.findMany.mockResolvedValue([
      { id: "level-1", schoolId: null, code: "6EME", label: "6ème" },
    ]);

    const result = await service.listNationalAcademicLevels();

    expect(prisma.academicLevel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: null } }),
    );
    expect(result[0].isNational).toBe(true);
  });

  it("crée un niveau national avec schoolId: null", async () => {
    prisma.academicLevel.create.mockResolvedValue({
      id: "level-1",
      schoolId: null,
      code: "6EME",
      label: "6ème",
    });

    await service.createNationalAcademicLevel({
      code: "6EME",
      label: "6ème",
    });

    expect(prisma.academicLevel.create).toHaveBeenCalledWith({
      data: { schoolId: null, code: "6EME", label: "6ème" },
    });
  });

  it("rejette la modification d'un niveau qui n'est pas national (schoolId non null)", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNationalAcademicLevel("level-local", { label: "X" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.academicLevel.update).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'un niveau qui n'est pas national", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteNationalAcademicLevel("level-local"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.academicLevel.delete).not.toHaveBeenCalled();
  });
});

describe("ManagementService — catalogue national : Subject", () => {
  it("liste uniquement les matières nationales", async () => {
    prisma.subject.findMany.mockResolvedValue([
      { id: "subject-1", schoolId: null, code: "MATH", name: "Mathématiques" },
    ]);

    const result = await service.listNationalSubjects();

    expect(prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: null } }),
    );
    expect(result[0].isNational).toBe(true);
  });

  it("crée une matière nationale avec un code stable", async () => {
    prisma.subject.create.mockResolvedValue({
      id: "subject-1",
      schoolId: null,
      code: "MATH",
      name: "Mathématiques",
    });

    await service.createNationalSubject({
      code: "MATH",
      name: "Mathématiques",
    });

    expect(prisma.subject.create).toHaveBeenCalledWith({
      data: { schoolId: null, code: "MATH", name: "Mathématiques" },
    });
  });

  it("rejette la création sans code", async () => {
    await expect(
      service.createNationalSubject({ code: "", name: "Mathématiques" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.subject.create).not.toHaveBeenCalled();
  });

  it("rejette la modification d'une matière qui n'est pas nationale", async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNationalSubject("subject-local", { name: "X" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.subject.update).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'une matière nationale encore utilisée", async () => {
    prisma.subject.findFirst.mockResolvedValue({
      id: "subject-1",
      _count: {
        assignments: 0,
        studentGrades: 0,
        curriculumSubjects: 3,
        classOverrides: 0,
      },
    });

    await expect(service.deleteNationalSubject("subject-1")).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.subject.delete).not.toHaveBeenCalled();
  });
});

describe("ManagementService — catalogue national : Curriculum", () => {
  it("crée un curriculum national à partir d'un niveau national", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue({
      id: "level-1",
      code: "6EME",
    });
    prisma.curriculum.create.mockResolvedValue({
      id: "curriculum-1",
      schoolId: null,
      name: "6EME - TRONC_COMMUN",
      academicLevelId: "level-1",
    });

    const result = await service.createNationalCurriculum({
      academicLevelId: "level-1",
    });

    expect(prisma.academicLevel.findFirst).toHaveBeenCalledWith({
      where: { id: "level-1", schoolId: null },
      select: { id: true, code: true },
    });
    expect(prisma.curriculum.create).toHaveBeenCalledWith({
      data: {
        schoolId: null,
        name: "6EME - TRONC_COMMUN",
        academicLevelId: "level-1",
      },
    });
    expect(result.name).toBe("6EME - TRONC_COMMUN");
  });

  it("rejette la création d'un curriculum national sur un niveau local (non national)", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.createNationalCurriculum({ academicLevelId: "level-local" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.curriculum.create).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'un curriculum qui n'est pas national", async () => {
    prisma.curriculum.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteNationalCurriculum("curriculum-local"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.curriculum.delete).not.toHaveBeenCalled();
  });

  it("affecte une matière nationale à un curriculum national", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-1" });
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
    prisma.curriculumSubject.upsert.mockResolvedValue({
      id: "cs-1",
      curriculumId: "curriculum-1",
      subjectId: "subject-1",
      isMandatory: true,
    });

    await service.upsertNationalCurriculumSubject("curriculum-1", {
      subjectId: "subject-1",
    });

    expect(prisma.curriculumSubject.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          schoolId: null,
          curriculumId: "curriculum-1",
          subjectId: "subject-1",
        }),
      }),
    );
  });

  it("rejette l'affectation d'une matière locale (non nationale) à un curriculum national", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-1" });
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.upsertNationalCurriculumSubject("curriculum-1", {
        subjectId: "subject-local",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.curriculumSubject.upsert).not.toHaveBeenCalled();
  });
});
