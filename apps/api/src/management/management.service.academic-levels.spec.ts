import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const SCHOOL_ID = "school-1";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    school: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ cycle: null, languageSystem: null }),
    },
    academicLevel: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    schoolAcademicLevel: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    ...overrides,
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new ManagementService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
  );
}

describe("ManagementService — niveaux academiques et activation par ecole", () => {
  describe("listAcademicLevels", () => {
    it("marque les niveaux propres a l'ecole comme toujours actives", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "own-1",
              schoolId: SCHOOL_ID,
              code: "GEN",
              order: null,
              _count: {},
            },
          ]),
        },
      });
      const service = makeService(prisma);

      const result = await service.listAcademicLevels(SCHOOL_ID);

      expect(result[0]).toMatchObject({
        isNational: false,
        isActivated: true,
      });
    });

    it("marque un niveau national comme active seulement s'il a une ligne SchoolAcademicLevel", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "nat-6eme",
              schoolId: null,
              code: "6EME",
              order: 8,
              _count: {},
            },
            {
              id: "nat-5eme",
              schoolId: null,
              code: "5EME",
              order: 9,
              _count: {},
            },
          ]),
        },
        schoolAcademicLevel: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ academicLevelId: "nat-6eme" }]),
          upsert: jest.fn(),
          deleteMany: jest.fn(),
        },
      });
      const service = makeService(prisma);

      const result = await service.listAcademicLevels(SCHOOL_ID);

      expect(result.find((l) => l.id === "nat-6eme")).toMatchObject({
        isActivated: true,
      });
      expect(result.find((l) => l.id === "nat-5eme")).toMatchObject({
        isActivated: false,
      });
    });
  });

  describe("listActivatedAcademicLevels", () => {
    it("ne renvoie que les niveaux actives, tries par order croissant, niveaux sans order en dernier", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "own-gen",
              schoolId: SCHOOL_ID,
              code: "GEN",
              order: null,
              _count: {},
            },
            {
              id: "nat-5eme",
              schoolId: null,
              code: "5EME",
              order: 9,
              _count: {},
            },
            {
              id: "nat-6eme",
              schoolId: null,
              code: "6EME",
              order: 8,
              _count: {},
            },
            {
              id: "nat-4eme",
              schoolId: null,
              code: "4EME",
              order: 10,
              _count: {},
            },
          ]),
        },
        schoolAcademicLevel: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { academicLevelId: "nat-5eme" },
              { academicLevelId: "nat-6eme" },
            ]),
          upsert: jest.fn(),
          deleteMany: jest.fn(),
        },
      });
      const service = makeService(prisma);

      const result = await service.listActivatedAcademicLevels(SCHOOL_ID);

      expect(result.map((l) => l.id)).toEqual([
        "nat-6eme",
        "nat-5eme",
        "own-gen",
      ]);
    });
  });

  describe("setAcademicLevelActivation", () => {
    it("cree une ligne SchoolAcademicLevel quand on active un niveau national", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "nat-1", schoolId: null }),
        },
      });
      const service = makeService(prisma);

      const result = await service.setAcademicLevelActivation(
        SCHOOL_ID,
        "nat-1",
        true,
      );

      expect(prisma.schoolAcademicLevel.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId_academicLevelId: {
              schoolId: SCHOOL_ID,
              academicLevelId: "nat-1",
            },
          },
        }),
      );
      expect(result).toEqual({ success: true, activated: true });
    });

    it("supprime la ligne SchoolAcademicLevel quand on desactive un niveau national", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "nat-1", schoolId: null }),
        },
      });
      const service = makeService(prisma);

      await service.setAcademicLevelActivation(SCHOOL_ID, "nat-1", false);

      expect(prisma.schoolAcademicLevel.deleteMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_ID, academicLevelId: "nat-1" },
      });
    });

    it("refuse de desactiver un niveau propre a l'ecole (toujours actif)", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "own-1", schoolId: SCHOOL_ID }),
        },
      });
      const service = makeService(prisma);

      await expect(
        service.setAcademicLevelActivation(SCHOOL_ID, "own-1", false),
      ).rejects.toThrow(BadRequestException);
    });

    it("leve NotFoundException si le niveau n'existe pas", async () => {
      const prisma = makePrisma({
        academicLevel: { findFirst: jest.fn().mockResolvedValue(null) },
      });
      const service = makeService(prisma);

      await expect(
        service.setAcademicLevelActivation(SCHOOL_ID, "missing", true),
      ).rejects.toThrow(NotFoundException);
    });

    it("leve NotFoundException si le niveau appartient a une autre ecole", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "other-1", schoolId: "other-school" }),
        },
      });
      const service = makeService(prisma);

      await expect(
        service.setAcademicLevelActivation(SCHOOL_ID, "other-1", true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateAcademicLevel — order", () => {
    it("met a jour le champ order d'un niveau propre a l'ecole", async () => {
      const prisma = makePrisma({
        academicLevel: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "own-1", schoolId: SCHOOL_ID }),
          update: jest
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: "own-1", ...data }),
            ),
        },
      });
      const service = makeService(prisma);

      const result = await service.updateAcademicLevel(SCHOOL_ID, "own-1", {
        order: 3,
      });

      expect(prisma.academicLevel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 3 }),
        }),
      );
      expect(result).toMatchObject({ order: 3 });
    });
  });
});
