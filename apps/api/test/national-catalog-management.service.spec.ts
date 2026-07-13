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
    update: jest.fn(),
    delete: jest.fn(),
  },
  curriculumSubject: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  track: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  nationalCycle: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  school: {
    findUnique: jest.fn(),
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
      data: {
        schoolId: null,
        code: "6EME",
        label: "6ème",
        cycleId: undefined,
        languageSystem: undefined,
      },
      include: { cycle: true },
    });
  });

  it("crée un niveau national avec cycleId et languageSystem renseignés", async () => {
    prisma.academicLevel.create.mockResolvedValue({
      id: "level-en-1",
      schoolId: null,
      code: "FORM1",
      label: "Form 1",
      cycleId: "cycle-secondary",
      languageSystem: "ANGLOPHONE",
    });

    await service.createNationalAcademicLevel({
      code: "FORM1",
      label: "Form 1",
      cycleId: "cycle-secondary",
      languageSystem: "ANGLOPHONE",
    });

    expect(prisma.academicLevel.create).toHaveBeenCalledWith({
      data: {
        schoolId: null,
        code: "FORM1",
        label: "Form 1",
        cycleId: "cycle-secondary",
        languageSystem: "ANGLOPHONE",
      },
      include: { cycle: true },
    });
  });

  it("rejette un languageSystem invalide a la creation d'un niveau national", async () => {
    await expect(
      service.createNationalAcademicLevel({
        code: "FORM1",
        label: "Form 1",
        // @ts-expect-error - valeur d'enum invalide volontaire pour le test
        languageSystem: "COLLEGE",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.academicLevel.create).not.toHaveBeenCalled();
  });

  it("met a jour cycleId et languageSystem d'un niveau national existant", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue({ id: "level-1" });
    prisma.academicLevel.update.mockResolvedValue({
      id: "level-1",
      schoolId: null,
      code: "6EME",
      label: "6ème",
      cycleId: "cycle-secondary",
      languageSystem: "FRANCOPHONE",
    });

    await service.updateNationalAcademicLevel("level-1", {
      cycleId: "cycle-secondary",
      languageSystem: "FRANCOPHONE",
    });

    expect(prisma.academicLevel.update).toHaveBeenCalledWith({
      where: { id: "level-1" },
      data: {
        code: undefined,
        label: undefined,
        cycleId: "cycle-secondary",
        languageSystem: "FRANCOPHONE",
      },
      include: { cycle: true },
    });
  });

  it("rejette une mise a jour de niveau national sans aucun champ fourni", async () => {
    await expect(
      service.updateNationalAcademicLevel("level-1", {}),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.academicLevel.update).not.toHaveBeenCalled();
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

describe("ManagementService — catalogue national : Track", () => {
  it("liste uniquement les filières nationales et les marque isNational", async () => {
    prisma.track.findMany.mockResolvedValue([
      { id: "track-1", schoolId: null, code: "D", label: "Série D" },
    ]);

    const result = await service.listNationalTracks();

    expect(prisma.track.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: null } }),
    );
    expect(result[0].isNational).toBe(true);
  });

  it("crée une filière nationale avec schoolId: null", async () => {
    prisma.track.create.mockResolvedValue({
      id: "track-1",
      schoolId: null,
      code: "D",
      label: "Série D",
    });

    await service.createNationalTrack({ code: "D", label: "Série D" });

    expect(prisma.track.create).toHaveBeenCalledWith({
      data: { schoolId: null, code: "D", label: "Série D" },
    });
  });

  it("rejette la création d'une filière nationale sans code", async () => {
    await expect(
      service.createNationalTrack({ code: "", label: "Série D" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.track.create).not.toHaveBeenCalled();
  });

  it("rejette la modification d'une filière qui n'est pas nationale", async () => {
    prisma.track.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNationalTrack("track-local", { label: "X" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.track.update).not.toHaveBeenCalled();
  });

  it("rejette la suppression d'une filière nationale encore utilisée", async () => {
    prisma.track.findFirst.mockResolvedValue({
      id: "track-1",
      _count: { classes: 0, curriculums: 2 },
    });

    await expect(service.deleteNationalTrack("track-1")).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.track.delete).not.toHaveBeenCalled();
  });

  it("supprime une filière nationale non utilisée", async () => {
    prisma.track.findFirst.mockResolvedValue({
      id: "track-1",
      _count: { classes: 0, curriculums: 0 },
    });
    prisma.track.delete.mockResolvedValue({ id: "track-1" });

    const result = await service.deleteNationalTrack("track-1");

    expect(prisma.track.delete).toHaveBeenCalledWith({
      where: { id: "track-1" },
    });
    expect(result).toEqual({ success: true });
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

  it("met à jour le niveau académique d'un curriculum national et régénère son nom", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-1" });
    prisma.academicLevel.findFirst.mockResolvedValue({
      id: "level-2",
      code: "5EME",
    });
    prisma.curriculum.update.mockResolvedValue({
      id: "curriculum-1",
      schoolId: null,
      name: "5EME - TRONC_COMMUN",
      academicLevelId: "level-2",
    });

    const result = await service.updateNationalCurriculum("curriculum-1", {
      academicLevelId: "level-2",
    });

    expect(prisma.curriculum.update).toHaveBeenCalledWith({
      where: { id: "curriculum-1" },
      data: {
        academicLevelId: "level-2",
        name: "5EME - TRONC_COMMUN",
      },
    });
    expect(result.name).toBe("5EME - TRONC_COMMUN");
  });

  it("rejette la mise à jour d'un curriculum national sans aucun champ fourni", async () => {
    await expect(
      service.updateNationalCurriculum("curriculum-1", {}),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette la mise à jour d'un curriculum qui n'est pas national", async () => {
    prisma.curriculum.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNationalCurriculum("curriculum-local", {
        academicLevelId: "level-2",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejette la mise à jour d'un curriculum national vers un niveau non national", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({ id: "curriculum-1" });
    prisma.academicLevel.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNationalCurriculum("curriculum-1", {
        academicLevelId: "level-local",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("crée un curriculum national avec une filière et régénère le nom en conséquence", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue({
      id: "level-1",
      code: "TLE",
    });
    prisma.track.findFirst.mockResolvedValue({ id: "track-1", code: "D" });
    prisma.curriculum.create.mockResolvedValue({
      id: "curriculum-1",
      schoolId: null,
      name: "TLE - D",
      academicLevelId: "level-1",
      trackId: "track-1",
    });

    const result = await service.createNationalCurriculum({
      academicLevelId: "level-1",
      trackId: "track-1",
    });

    expect(prisma.curriculum.create).toHaveBeenCalledWith({
      data: {
        schoolId: null,
        name: "TLE - D",
        academicLevelId: "level-1",
        trackId: "track-1",
      },
    });
    expect(result.name).toBe("TLE - D");
  });

  it("rejette la création d'un curriculum national avec une filière non nationale", async () => {
    prisma.academicLevel.findFirst.mockResolvedValue({
      id: "level-1",
      code: "TLE",
    });
    prisma.track.findFirst.mockResolvedValue(null);

    await expect(
      service.createNationalCurriculum({
        academicLevelId: "level-1",
        trackId: "track-local",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.curriculum.create).not.toHaveBeenCalled();
  });

  it("met à jour uniquement la filière d'un curriculum national et régénère son nom", async () => {
    prisma.curriculum.findFirst.mockResolvedValue({
      id: "curriculum-1",
      academicLevelId: "level-1",
      trackId: null,
    });
    prisma.academicLevel.findFirst.mockResolvedValue({
      id: "level-1",
      code: "TLE",
    });
    prisma.track.findFirst.mockResolvedValue({ id: "track-1", code: "D" });
    prisma.curriculum.update.mockResolvedValue({
      id: "curriculum-1",
      name: "TLE - D",
      academicLevelId: "level-1",
      trackId: "track-1",
    });

    const result = await service.updateNationalCurriculum("curriculum-1", {
      trackId: "track-1",
    });

    expect(prisma.curriculum.update).toHaveBeenCalledWith({
      where: { id: "curriculum-1" },
      data: {
        academicLevelId: "level-1",
        trackId: "track-1",
        name: "TLE - D",
      },
    });
    expect(result.name).toBe("TLE - D");
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

describe("ManagementService — catalogue national : NationalCycle", () => {
  it("liste les cycles nationaux avec le compte de niveaux rattachés", async () => {
    prisma.nationalCycle.findMany.mockResolvedValue([
      { id: "cycle-primary", code: "PRIMARY", label: "Primaire" },
    ]);

    const result = await service.listNationalCycles();

    expect(prisma.nationalCycle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { academicLevels: true } } },
      }),
    );
    expect(result[0].code).toBe("PRIMARY");
  });

  it("crée un cycle national", async () => {
    prisma.nationalCycle.create.mockResolvedValue({
      id: "cycle-1",
      code: "PRESCHOOL",
      label: "Préscolaire",
    });

    await service.createNationalCycle({
      code: "PRESCHOOL",
      label: "Préscolaire",
    });

    expect(prisma.nationalCycle.create).toHaveBeenCalledWith({
      data: { code: "PRESCHOOL", label: "Préscolaire" },
    });
  });

  it("rejette la création d'un cycle sans code", async () => {
    await expect(
      service.createNationalCycle({ code: "", label: "Préscolaire" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.nationalCycle.create).not.toHaveBeenCalled();
  });

  it("met à jour le libellé d'un cycle national existant", async () => {
    prisma.nationalCycle.findUnique.mockResolvedValue({ id: "cycle-1" });
    prisma.nationalCycle.update.mockResolvedValue({
      id: "cycle-1",
      code: "PRIMARY",
      label: "Primaire renommé",
    });

    await service.updateNationalCycle("cycle-1", {
      label: "Primaire renommé",
    });

    expect(prisma.nationalCycle.update).toHaveBeenCalledWith({
      where: { id: "cycle-1" },
      data: { code: undefined, label: "Primaire renommé" },
    });
  });

  it("rejette la mise à jour d'un cycle national sans aucun champ fourni", async () => {
    await expect(service.updateNationalCycle("cycle-1", {})).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.nationalCycle.update).not.toHaveBeenCalled();
  });

  it("rejette la mise à jour d'un cycle national inexistant", async () => {
    prisma.nationalCycle.findUnique.mockResolvedValue(null);

    await expect(
      service.updateNationalCycle("cycle-missing", { label: "X" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.nationalCycle.update).not.toHaveBeenCalled();
  });

  it("supprime un cycle national existant", async () => {
    prisma.nationalCycle.findUnique.mockResolvedValue({ id: "cycle-1" });
    prisma.nationalCycle.delete.mockResolvedValue({ id: "cycle-1" });

    const result = await service.deleteNationalCycle("cycle-1");

    expect(prisma.nationalCycle.delete).toHaveBeenCalledWith({
      where: { id: "cycle-1" },
    });
    expect(result).toEqual({ success: true });
  });

  it("rejette la suppression d'un cycle national inexistant", async () => {
    prisma.nationalCycle.findUnique.mockResolvedValue(null);

    await expect(service.deleteNationalCycle("cycle-missing")).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.nationalCycle.delete).not.toHaveBeenCalled();
  });
});

describe("ManagementService — filtrage du catalogue national par cycle de l'école", () => {
  it("filtre les niveaux nationaux par cycle via la relation NationalCycle", async () => {
    prisma.school.findUnique.mockResolvedValue({
      cycle: "PRIMARY",
      languageSystem: null,
    });
    prisma.curriculum.findMany.mockResolvedValue([]);

    await service.listCurriculums("school-1");

    expect(prisma.curriculum.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { schoolId: "school-1" },
            {
              schoolId: null,
              academicLevel: {
                is: {
                  AND: [
                    {
                      OR: [
                        { cycleId: null },
                        { cycle: { is: { code: "PRIMARY" } } },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      }),
    );
  });
});
