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
  subjectBranch: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  curriculum: {
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  curriculumSubject: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  academicLevel: {
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mailService = {};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — listSubjects", () => {
  it("inclut les niveaux (curriculum + academicLevel + track) et les spécialités par matière", async () => {
    prisma.subject.findMany.mockResolvedValue([
      {
        id: "subject-1",
        schoolId: "school-1",
        name: "Mathématiques",
        branches: [{ id: "branch-1", name: "Algèbre", code: null }],
        curriculumSubjects: [
          {
            id: "cs-1",
            curriculumId: "curriculum-6e",
            isMandatory: true,
            coefficient: null,
            weeklyHours: null,
            curriculum: {
              id: "curriculum-6e",
              name: "6ème",
              academicLevel: { id: "level-6e", code: "6e", label: "6ème" },
              track: null,
            },
          },
        ],
        _count: {
          assignments: 0,
          studentGrades: 0,
          curriculumSubjects: 1,
          classOverrides: 0,
        },
      },
    ]);

    const result = await service.listSubjects("school-1");

    expect(prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ schoolId: "school-1" }, { schoolId: null }] },
        include: expect.objectContaining({
          branches: expect.any(Object),
          curriculumSubjects: expect.objectContaining({
            include: expect.objectContaining({
              curriculum: expect.objectContaining({
                select: expect.objectContaining({
                  academicLevel: expect.any(Object),
                  track: expect.any(Object),
                }),
              }),
            }),
          }),
          _count: expect.any(Object),
        }),
      }),
    );
    expect(result[0].curriculumSubjects[0].curriculum.academicLevel.label).toBe(
      "6ème",
    );
    expect(result[0].branches[0].name).toBe("Algèbre");
  });

  it("expose isNational: true pour une matière du catalogue plateforme (schoolId null) et false pour une matière locale", async () => {
    prisma.subject.findMany.mockResolvedValue([
      {
        id: "subject-national",
        schoolId: null,
        name: "Mathématiques",
        branches: [],
        curriculumSubjects: [],
        _count: {
          assignments: 0,
          studentGrades: 0,
          curriculumSubjects: 0,
          classOverrides: 0,
        },
      },
      {
        id: "subject-local",
        schoolId: "school-1",
        name: "Théâtre (option école)",
        branches: [],
        curriculumSubjects: [],
        _count: {
          assignments: 0,
          studentGrades: 0,
          curriculumSubjects: 0,
          classOverrides: 0,
        },
      },
    ]);

    const result = await service.listSubjects("school-1");

    expect(prisma.subject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ schoolId: "school-1" }, { schoolId: null }] },
      }),
    );
    expect(result.find((s) => s.id === "subject-national")?.isNational).toBe(
      true,
    );
    expect(result.find((s) => s.id === "subject-local")?.isNational).toBe(
      false,
    );
  });
});

describe("ManagementService — Subject CRUD", () => {
  it("crée une matière", async () => {
    prisma.subject.create.mockResolvedValue({
      id: "subject-1",
      schoolId: "school-1",
      name: "Histoire",
    });

    const result = await service.createSubject("school-1", {
      name: "Histoire",
    });

    expect(prisma.subject.create).toHaveBeenCalledWith({
      data: { schoolId: "school-1", name: "Histoire" },
    });
    expect(result.name).toBe("Histoire");
  });

  it("modifie le nom d'une matière existante", async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
    prisma.subject.update.mockResolvedValue({
      id: "subject-1",
      name: "Mathématiques avancées",
    });

    const result = await service.updateSubject("school-1", "subject-1", {
      name: "Mathématiques avancées",
    });

    expect(prisma.subject.update).toHaveBeenCalledWith({
      where: { id: "subject-1" },
      data: { name: "Mathématiques avancées" },
    });
    expect(result.name).toBe("Mathématiques avancées");
  });

  it("rejette la modification si la matière n'appartient pas à l'école", async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSubject("school-1", "subject-x", { name: "X" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.subject.update).not.toHaveBeenCalled();
  });

  it("supprime une matière non utilisée", async () => {
    prisma.subject.findFirst.mockResolvedValue({
      id: "subject-1",
      _count: {
        assignments: 0,
        studentGrades: 0,
        curriculumSubjects: 0,
        classOverrides: 0,
      },
    });
    prisma.subject.delete.mockResolvedValue({ id: "subject-1" });

    const result = await service.deleteSubject("school-1", "subject-1");

    expect(prisma.subject.delete).toHaveBeenCalledWith({
      where: { id: "subject-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejette la suppression d'une matière affectée à un curriculum", async () => {
    prisma.subject.findFirst.mockResolvedValue({
      id: "subject-1",
      _count: {
        assignments: 0,
        studentGrades: 0,
        curriculumSubjects: 2,
        classOverrides: 0,
      },
    });

    await expect(
      service.deleteSubject("school-1", "subject-1"),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.subject.delete).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'une matière introuvable dans l'école", async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteSubject("school-1", "subject-x"),
    ).rejects.toThrow(NotFoundException);
  });
});

describe("ManagementService — SubjectBranch (spécialités) CRUD", () => {
  it("crée une spécialité pour une matière existante", async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
    prisma.subjectBranch.create.mockResolvedValue({
      id: "branch-1",
      subjectId: "subject-1",
      name: "Algèbre",
      code: null,
    });

    const result = await service.createSubjectBranch("school-1", "subject-1", {
      name: "Algèbre",
    });

    expect(prisma.subjectBranch.create).toHaveBeenCalledWith({
      data: {
        schoolId: "school-1",
        subjectId: "subject-1",
        name: "Algèbre",
        code: null,
      },
    });
    expect(result.name).toBe("Algèbre");
  });

  it("rejette la création si le nom de la spécialité est vide", async () => {
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });

    await expect(
      service.createSubjectBranch("school-1", "subject-1", { name: "  " }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.subjectBranch.create).not.toHaveBeenCalled();
  });

  it("autorise la création d'une spécialité sur une matière nationale (catalogue plateforme)", async () => {
    prisma.subject.findFirst.mockResolvedValue({
      id: "subject-national",
      schoolId: null,
    });
    prisma.subjectBranch.create.mockResolvedValue({
      id: "branch-1",
      subjectId: "subject-national",
      name: "Algèbre",
      code: null,
    });

    await service.createSubjectBranch("school-1", "subject-national", {
      name: "Algèbre",
    });

    expect(prisma.subject.findFirst).toHaveBeenCalledWith({
      where: {
        id: "subject-national",
        OR: [{ schoolId: "school-1" }, { schoolId: null }],
      },
      select: { id: true },
    });
    expect(prisma.subjectBranch.create).toHaveBeenCalled();
  });

  it("rejette la création si la matière n'appartient ni à l'école ni au catalogue national", async () => {
    prisma.subject.findFirst.mockResolvedValue(null);

    await expect(
      service.createSubjectBranch("school-1", "subject-other-school", {
        name: "Algèbre",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.subjectBranch.create).not.toHaveBeenCalled();
  });

  it("modifie une spécialité existante", async () => {
    prisma.subjectBranch.findFirst.mockResolvedValue({ id: "branch-1" });
    prisma.subjectBranch.update.mockResolvedValue({
      id: "branch-1",
      name: "Géométrie",
      code: "GEO",
    });

    const result = await service.updateSubjectBranch("school-1", "branch-1", {
      name: "Géométrie",
      code: "GEO",
    });

    expect(prisma.subjectBranch.update).toHaveBeenCalledWith({
      where: { id: "branch-1" },
      data: { name: "Géométrie", code: "GEO" },
    });
    expect(result.name).toBe("Géométrie");
  });

  it("supprime une spécialité non utilisée par une évaluation", async () => {
    prisma.subjectBranch.findFirst.mockResolvedValue({
      id: "branch-1",
      _count: { evaluations: 0 },
    });
    prisma.subjectBranch.delete.mockResolvedValue({ id: "branch-1" });

    const result = await service.deleteSubjectBranch("school-1", "branch-1");

    expect(prisma.subjectBranch.delete).toHaveBeenCalledWith({
      where: { id: "branch-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejette la suppression d'une spécialité déjà utilisée dans une évaluation", async () => {
    prisma.subjectBranch.findFirst.mockResolvedValue({
      id: "branch-1",
      _count: { evaluations: 3 },
    });

    await expect(
      service.deleteSubjectBranch("school-1", "branch-1"),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.subjectBranch.delete).not.toHaveBeenCalled();
  });
});

describe("ManagementService — affectation matière ↔ niveau (CurriculumSubject)", () => {
  it("affecte une matière à un curriculum (niveau)", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-6e" });
    prisma.subject.findFirst.mockResolvedValue({ id: "subject-1" });
    prisma.curriculumSubject.upsert.mockResolvedValue({
      id: "cs-1",
      subjectId: "subject-1",
      curriculumId: "curriculum-6e",
      isMandatory: true,
      subject: { id: "subject-1", name: "Mathématiques" },
    });

    const result = await service.upsertCurriculumSubject(
      "school-1",
      "curriculum-6e",
      { subjectId: "subject-1" },
    );

    expect(prisma.curriculumSubject.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          curriculumId_subjectId: {
            curriculumId: "curriculum-6e",
            subjectId: "subject-1",
          },
        },
        create: expect.objectContaining({
          schoolId: "school-1",
          curriculumId: "curriculum-6e",
          subjectId: "subject-1",
          isMandatory: true,
        }),
      }),
    );
    expect(result.subjectId).toBe("subject-1");
  });

  it("retire l'affectation d'une matière à un niveau", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-6e" });
    prisma.curriculumSubject.findFirst.mockResolvedValue({ id: "cs-1" });
    prisma.curriculumSubject.delete.mockResolvedValue({ id: "cs-1" });

    const result = await service.deleteCurriculumSubject(
      "school-1",
      "curriculum-6e",
      "subject-1",
    );

    expect(prisma.curriculumSubject.delete).toHaveBeenCalledWith({
      where: { id: "cs-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejette la suppression d'une affectation inexistante", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-6e" });
    prisma.curriculumSubject.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCurriculumSubject("school-1", "curriculum-6e", "subject-x"),
    ).rejects.toThrow(NotFoundException);
  });

  it("autorise l'affectation d'une matière nationale à un curriculum local (soupape)", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-6e" });
    prisma.subject.findFirst.mockResolvedValue({
      id: "subject-national",
      schoolId: null,
    });
    prisma.curriculumSubject.upsert.mockResolvedValue({
      id: "cs-1",
      subjectId: "subject-national",
      curriculumId: "curriculum-6e",
      isMandatory: true,
      subject: { id: "subject-national", name: "Mathématiques" },
    });

    await service.upsertCurriculumSubject("school-1", "curriculum-6e", {
      subjectId: "subject-national",
    });

    expect(prisma.curriculum.findFirst).toHaveBeenCalledWith({
      where: { id: "curriculum-6e", schoolId: "school-1" },
      select: { id: true },
    });
    expect(prisma.curriculumSubject.upsert).toHaveBeenCalled();
  });

  it("rejette l'affectation d'une matière sur un curriculum national (écriture réservée à la plateforme)", async () => {
    prisma.curriculum.findFirst.mockResolvedValue(null);

    await expect(
      service.upsertCurriculumSubject("school-1", "curriculum-national", {
        subjectId: "subject-1",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.curriculumSubject.upsert).not.toHaveBeenCalled();
  });
});

describe("ManagementService — écriture réservée à l'école propriétaire (AcademicLevel/Curriculum nationaux)", () => {
  it("rejette la modification d'un niveau académique national via la route école", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.updateAcademicLevel("school-1", "level-national", {
        label: "Terminale",
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.academicLevel.update).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'un niveau académique national via la route école", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteAcademicLevel("school-1", "level-national"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.academicLevel.delete).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'un curriculum national via la route école", async () => {
    prisma.curriculum.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteCurriculum("school-1", "curriculum-national"),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.curriculum.delete).not.toHaveBeenCalled();
  });
});
