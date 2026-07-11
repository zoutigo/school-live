import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  school: {
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    $transaction: undefined,
  },
  schoolYear: {
    create: jest.fn(),
  },
  schoolMembership: {
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  academicLevel: {
    findMany: jest.fn(),
  },
  curriculum: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mailService = {
  sendTemporaryPasswordEmail: jest.fn(),
};

const service = new ManagementService(prisma as never, mailService as never);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ManagementService — filtrage strict du catalogue national par cycle + languageSystem", () => {
  describe("listAcademicLevels", () => {
    it("exclut les niveaux nationaux d'un autre cycle et d'un autre systeme linguistique (ecole mono-langue)", async () => {
      prisma.school.findUnique.mockResolvedValue({
        cycle: "SECONDARY",
        languageSystem: "ANGLOPHONE",
      });
      prisma.academicLevel.findMany.mockResolvedValue([]);

      await service.listAcademicLevels("school-en-secondary");

      expect(prisma.school.findUnique).toHaveBeenCalledWith({
        where: { id: "school-en-secondary" },
        select: { cycle: true, languageSystem: true },
      });
      expect(prisma.academicLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { schoolId: "school-en-secondary" },
              {
                schoolId: null,
                AND: [
                  {
                    OR: [
                      { cycleId: null },
                      { cycle: { is: { code: "SECONDARY" } } },
                    ],
                  },
                  {
                    OR: [
                      { languageSystem: null },
                      { languageSystem: { in: ["ANGLOPHONE"] } },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      );
    });

    it("une ecole BILINGUAL voit les niveaux nationaux FRANCOPHONE et ANGLOPHONE", async () => {
      prisma.school.findUnique.mockResolvedValue({
        cycle: "SECONDARY",
        languageSystem: "BILINGUAL",
      });
      prisma.academicLevel.findMany.mockResolvedValue([]);

      await service.listAcademicLevels("school-bilingual");

      expect(prisma.academicLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { schoolId: "school-bilingual" },
              expect.objectContaining({
                schoolId: null,
                AND: expect.arrayContaining([
                  {
                    OR: [
                      { languageSystem: null },
                      {
                        languageSystem: {
                          in: ["FRANCOPHONE", "ANGLOPHONE"],
                        },
                      },
                    ],
                  },
                ]),
              }),
            ],
          }),
        }),
      );
    });

    it("une ecole sans cycle/languageSystem renseigne ne filtre rien (retro-compatibilite)", async () => {
      prisma.school.findUnique.mockResolvedValue({
        cycle: null,
        languageSystem: null,
      });
      prisma.academicLevel.findMany.mockResolvedValue([]);

      await service.listAcademicLevels("school-legacy");

      expect(prisma.academicLevel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ schoolId: "school-legacy" }, { schoolId: null, AND: [] }],
          },
        }),
      );
    });

    it("marque isNational en fonction de schoolId sur le resultat retourne", async () => {
      prisma.school.findUnique.mockResolvedValue({
        cycle: null,
        languageSystem: null,
      });
      prisma.academicLevel.findMany.mockResolvedValue([
        { id: "level-local", schoolId: "school-1", code: "X", label: "X" },
        { id: "level-national", schoolId: null, code: "6EME", label: "6ème" },
      ]);

      const result = await service.listAcademicLevels("school-1");

      expect(result).toEqual([
        expect.objectContaining({ id: "level-local", isNational: false }),
        expect.objectContaining({ id: "level-national", isNational: true }),
      ]);
    });
  });

  describe("listCurriculums", () => {
    it("filtre les curriculums nationaux via le cycle/languageSystem de leur niveau academique", async () => {
      prisma.school.findUnique.mockResolvedValue({
        cycle: "PRIMARY",
        languageSystem: "FRANCOPHONE",
      });
      prisma.curriculum.findMany.mockResolvedValue([]);

      await service.listCurriculums("school-fr-primary");

      expect(prisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { schoolId: "school-fr-primary" },
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
                      {
                        OR: [
                          { languageSystem: null },
                          { languageSystem: { in: ["FRANCOPHONE"] } },
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
});

describe("ManagementService — persistance cycle/languageSystem sur School", () => {
  it("createSchoolWithSchoolAdmin persiste cycle et languageSystem pour une ecole existante (admin deja present)", async () => {
    prisma.school.count.mockResolvedValue(0);
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-1",
      firstName: "Jane",
      mustChangePassword: false,
    });

    const schoolCreateData: unknown[] = [];
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        schoolYear: {
          create: jest.fn(
            async (args: { data: { school: { create: unknown } } }) => {
              schoolCreateData.push(args.data.school.create);
              return {
                id: "school-year-1",
                school: {
                  id: "school-1",
                  slug: "greenwich-college",
                  name: "Greenwich College",
                  country: "Cameroun",
                  region: "Nord-Ouest",
                  city: "Bamenda",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              };
            },
          ),
        },
        school: { update: jest.fn() },
        schoolMembership: { create: jest.fn() },
      };
      return callback(tx);
    });

    await service.createSchoolWithSchoolAdmin({
      name: "Greenwich College",
      country: "Cameroun",
      region: "Nord-Ouest",
      city: "Bamenda",
      cycle: "SECONDARY",
      languageSystem: "ANGLOPHONE",
      schoolAdminEmail: "admin@greenwich.cm",
    });

    expect(schoolCreateData[0]).toEqual(
      expect.objectContaining({
        cycle: "SECONDARY",
        languageSystem: "ANGLOPHONE",
      }),
    );
  });

  it("updateSchool persiste un changement de cycle et de languageSystem", async () => {
    prisma.school.findUnique.mockResolvedValue({ id: "school-1" });
    prisma.school.update.mockResolvedValue({
      id: "school-1",
      slug: "greenwich-college",
      name: "Greenwich College",
      cycle: "SECONDARY",
      languageSystem: "ANGLOPHONE",
    });

    await service.updateSchool("school-1", {
      cycle: "SECONDARY",
      languageSystem: "ANGLOPHONE",
    });

    expect(prisma.school.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "school-1" },
        data: expect.objectContaining({
          cycle: "SECONDARY",
          languageSystem: "ANGLOPHONE",
        }),
      }),
    );
  });

  it("rejette une mise a jour d'ecole sans aucun champ (cycle/languageSystem seuls ne suffisent pas a etre absents)", async () => {
    await expect(service.updateSchool("school-1", {})).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.school.update).not.toHaveBeenCalled();
  });

  it("accepte une mise a jour ne portant que sur le cycle", async () => {
    prisma.school.findUnique.mockResolvedValue({ id: "school-1" });
    prisma.school.update.mockResolvedValue({
      id: "school-1",
      cycle: "PRIMARY",
    });

    await service.updateSchool("school-1", { cycle: "PRIMARY" });

    expect(prisma.school.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cycle: "PRIMARY" }),
      }),
    );
  });

  it("rejette la mise a jour si l'ecole n'existe pas", async () => {
    prisma.school.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSchool("missing-school", { cycle: "PRIMARY" }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.school.update).not.toHaveBeenCalled();
  });
});
