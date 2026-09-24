import { NotFoundException } from "@nestjs/common";
import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const SCHOOL_ID = "school-1";
const NATIONAL_CURRICULUM_ID = "curriculum-national-1";
const OWN_CURRICULUM_ID = "curriculum-own-1";

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    curriculum: {
      findFirst: jest.fn().mockResolvedValue({ id: NATIONAL_CURRICULUM_ID }),
      findUnique: jest.fn().mockResolvedValue({ schoolId: null }),
    },
    subject: {
      findFirst: jest.fn().mockResolvedValue({ id: "subject-1" }),
    },
    curriculumSubject: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    curriculumSubjectOverride: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      delete: jest.fn(),
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

describe("ManagementService — personnalisation des matieres d'un curriculum national par ecole", () => {
  describe("listCurriculumSubjects", () => {
    it("renvoie directement les lignes pour un curriculum propre a l'ecole, sans fusion", async () => {
      const prisma = makePrisma({
        curriculum: {
          findFirst: jest.fn().mockResolvedValue({ id: OWN_CURRICULUM_ID }),
          findUnique: jest.fn().mockResolvedValue({ schoolId: SCHOOL_ID }),
        },
        curriculumSubject: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "cs-1",
              schoolId: SCHOOL_ID,
              curriculumId: OWN_CURRICULUM_ID,
              subjectId: "subject-1",
              isMandatory: true,
              coefficient: 3,
              weeklyHours: 2,
              subject: { id: "subject-1", name: "Maths" },
            },
          ]),
        },
      });
      const service = makeService(prisma);

      const result = await service.listCurriculumSubjects(
        SCHOOL_ID,
        OWN_CURRICULUM_ID,
      );

      expect(result).toEqual([
        expect.objectContaining({
          subjectId: "subject-1",
          isNational: false,
          isCustomized: false,
        }),
      ]);
      expect(prisma.curriculumSubjectOverride.findMany).not.toHaveBeenCalled();
    });

    it("fusionne la base nationale et les overrides pour un curriculum national", async () => {
      const prisma = makePrisma({
        curriculumSubject: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "cs-math",
              schoolId: null,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-math",
              isMandatory: true,
              coefficient: 4,
              weeklyHours: 5,
              subject: { id: "subject-math", name: "Mathematiques" },
            },
            {
              id: "cs-grec",
              schoolId: null,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-grec",
              isMandatory: true,
              coefficient: 2,
              weeklyHours: 3,
              subject: { id: "subject-grec", name: "Grec" },
            },
          ]),
        },
        curriculumSubjectOverride: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "ov-remove-grec",
              schoolId: SCHOOL_ID,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-grec",
              action: "REMOVE",
              isMandatory: true,
              coefficientOverride: null,
              weeklyHoursOverride: null,
              subject: { id: "subject-grec", name: "Grec" },
            },
            {
              id: "ov-add-chinois",
              schoolId: SCHOOL_ID,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-chinois",
              action: "ADD",
              isMandatory: false,
              coefficientOverride: 1,
              weeklyHoursOverride: 2,
              subject: { id: "subject-chinois", name: "Chinois" },
            },
          ]),
        },
      });
      const service = makeService(prisma);

      const result = await service.listCurriculumSubjects(
        SCHOOL_ID,
        NATIONAL_CURRICULUM_ID,
      );

      const subjectIds = result.map((row) => row.subjectId);
      expect(subjectIds).toContain("subject-math");
      expect(subjectIds).toContain("subject-chinois");
      expect(subjectIds).not.toContain("subject-grec");

      const math = result.find((row) => row.subjectId === "subject-math");
      expect(math).toMatchObject({ isNational: true, isCustomized: false });

      const chinois = result.find((row) => row.subjectId === "subject-chinois");
      expect(chinois).toMatchObject({
        isNational: false,
        isCustomized: false,
        coefficient: 1,
        weeklyHours: 2,
      });
    });

    it("applique la surcharge de coefficient d'un ADD sur une matiere deja nationale", async () => {
      const prisma = makePrisma({
        curriculumSubject: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "cs-math",
              schoolId: null,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-math",
              isMandatory: true,
              coefficient: 4,
              weeklyHours: 5,
              subject: { id: "subject-math", name: "Mathematiques" },
            },
          ]),
        },
        curriculumSubjectOverride: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "ov-add-math",
              schoolId: SCHOOL_ID,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-math",
              action: "ADD",
              isMandatory: true,
              coefficientOverride: 6,
              weeklyHoursOverride: 7,
              subject: { id: "subject-math", name: "Mathematiques" },
            },
          ]),
        },
      });
      const service = makeService(prisma);

      const result = await service.listCurriculumSubjects(
        SCHOOL_ID,
        NATIONAL_CURRICULUM_ID,
      );

      expect(result).toEqual([
        expect.objectContaining({
          subjectId: "subject-math",
          coefficient: 6,
          weeklyHours: 7,
          isNational: true,
          isCustomized: true,
        }),
      ]);
    });
  });

  describe("upsertCurriculumSubject", () => {
    it("upsert directement CurriculumSubject pour un curriculum propre a l'ecole", async () => {
      const prisma = makePrisma({
        curriculum: {
          findFirst: jest.fn().mockResolvedValue({ id: OWN_CURRICULUM_ID }),
          findUnique: jest.fn().mockResolvedValue({ schoolId: SCHOOL_ID }),
        },
      });
      const service = makeService(prisma);

      await service.upsertCurriculumSubject(SCHOOL_ID, OWN_CURRICULUM_ID, {
        subjectId: "subject-1",
        coefficient: 3,
      });

      expect(prisma.curriculumSubject.upsert).toHaveBeenCalled();
      expect(prisma.curriculumSubjectOverride.upsert).not.toHaveBeenCalled();
    });

    it("cree un override ADD pour un curriculum national, sans toucher la ligne partagee", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await service.upsertCurriculumSubject(
        SCHOOL_ID,
        NATIONAL_CURRICULUM_ID,
        { subjectId: "subject-chinois", coefficient: 1, weeklyHours: 2 },
      );

      expect(prisma.curriculumSubject.upsert).not.toHaveBeenCalled();
      expect(prisma.curriculumSubjectOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            schoolId_curriculumId_subjectId: {
              schoolId: SCHOOL_ID,
              curriculumId: NATIONAL_CURRICULUM_ID,
              subjectId: "subject-chinois",
            },
          },
          create: expect.objectContaining({
            schoolId: SCHOOL_ID,
            curriculumId: NATIONAL_CURRICULUM_ID,
            subjectId: "subject-chinois",
            action: "ADD",
            coefficientOverride: 1,
            weeklyHoursOverride: 2,
          }),
        }),
      );
    });
  });

  describe("deleteCurriculumSubject", () => {
    it("supprime directement CurriculumSubject pour un curriculum propre a l'ecole", async () => {
      const prisma = makePrisma({
        curriculum: {
          findFirst: jest.fn().mockResolvedValue({ id: OWN_CURRICULUM_ID }),
          findUnique: jest.fn().mockResolvedValue({ schoolId: SCHOOL_ID }),
        },
        curriculumSubject: {
          findFirst: jest.fn().mockResolvedValue({ id: "cs-1" }),
          delete: jest.fn(),
        },
      });
      const service = makeService(prisma);

      const result = await service.deleteCurriculumSubject(
        SCHOOL_ID,
        OWN_CURRICULUM_ID,
        "subject-1",
      );

      expect(prisma.curriculumSubject.delete).toHaveBeenCalledWith({
        where: { id: "cs-1" },
      });
      expect(prisma.curriculumSubjectOverride.upsert).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("annule un ajout d'ecole (override ADD) sans creer de REMOVE", async () => {
      const prisma = makePrisma({
        curriculumSubjectOverride: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: "ov-add-1", action: "ADD" }),
          delete: jest.fn(),
          upsert: jest.fn(),
        },
      });
      const service = makeService(prisma);

      const result = await service.deleteCurriculumSubject(
        SCHOOL_ID,
        NATIONAL_CURRICULUM_ID,
        "subject-chinois",
      );

      expect(prisma.curriculumSubjectOverride.delete).toHaveBeenCalledWith({
        where: { id: "ov-add-1" },
      });
      expect(prisma.curriculumSubjectOverride.upsert).not.toHaveBeenCalled();
      expect(prisma.curriculumSubject.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("exclut une matiere nationale pour cette ecole via un override REMOVE, sans supprimer la ligne partagee", async () => {
      const prisma = makePrisma({
        curriculumSubject: {
          findFirst: jest.fn().mockResolvedValue({ id: "cs-grec" }),
          delete: jest.fn(),
        },
      });
      const service = makeService(prisma);

      const result = await service.deleteCurriculumSubject(
        SCHOOL_ID,
        NATIONAL_CURRICULUM_ID,
        "subject-grec",
      );

      expect(prisma.curriculumSubject.delete).not.toHaveBeenCalled();
      expect(prisma.curriculumSubjectOverride.upsert).toHaveBeenCalledWith({
        where: {
          schoolId_curriculumId_subjectId: {
            schoolId: SCHOOL_ID,
            curriculumId: NATIONAL_CURRICULUM_ID,
            subjectId: "subject-grec",
          },
        },
        update: { action: "REMOVE" },
        create: {
          schoolId: SCHOOL_ID,
          curriculumId: NATIONAL_CURRICULUM_ID,
          subjectId: "subject-grec",
          action: "REMOVE",
        },
      });
      expect(result).toEqual({ success: true });
    });

    it("leve NotFoundException si la matiere n'existe ni en base nationale ni en override", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await expect(
        service.deleteCurriculumSubject(
          SCHOOL_ID,
          NATIONAL_CURRICULUM_ID,
          "subject-inconnue",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
