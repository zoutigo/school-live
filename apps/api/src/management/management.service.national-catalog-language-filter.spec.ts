import { ManagementService } from "./management.service.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

const SCHOOL_ID = "school-1";

function makePrisma(
  schoolRow: {
    cycle: string | null;
    languageSystem: string | null;
  } = { cycle: null, languageSystem: null },
) {
  return {
    school: {
      findUnique: jest.fn().mockResolvedValue(schoolRow),
    },
    track: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "track-1", ...data }),
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "track-1", ...data }),
      ),
      findFirst: jest.fn().mockResolvedValue({ id: "track-1" }),
    },
    subject: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "subject-1", ...data }),
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "subject-1", ...data }),
      ),
      findFirst: jest.fn().mockResolvedValue({ id: "subject-1" }),
    },
    curriculum: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new ManagementService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
  );
}

describe("ManagementService — filtrage du catalogue national par languageSystem", () => {
  describe("listTracks", () => {
    it("ne restreint que sur les filieres nationales sans langue si l'ecole n'a pas de languageSystem defini", async () => {
      const prisma = makePrisma({ cycle: null, languageSystem: null });
      const service = makeService(prisma);

      await service.listTracks(SCHOOL_ID);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ schoolId: SCHOOL_ID }, { schoolId: null }],
          },
        }),
      );
    });

    it("filtre les filieres nationales par languageSystem pour une ecole francophone", async () => {
      const prisma = makePrisma({
        cycle: null,
        languageSystem: "FRANCOPHONE",
      });
      const service = makeService(prisma);

      await service.listTracks(SCHOOL_ID);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { schoolId: SCHOOL_ID },
              {
                schoolId: null,
                OR: [
                  { languageSystem: null },
                  { languageSystem: { in: ["FRANCOPHONE"] } },
                ],
              },
            ],
          },
        }),
      );
    });

    it("accepte francophone et anglophone pour une ecole bilingue", async () => {
      const prisma = makePrisma({ cycle: null, languageSystem: "BILINGUAL" });
      const service = makeService(prisma);

      await service.listTracks(SCHOOL_ID);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { schoolId: SCHOOL_ID },
              {
                schoolId: null,
                OR: [
                  { languageSystem: null },
                  {
                    languageSystem: { in: ["FRANCOPHONE", "ANGLOPHONE"] },
                  },
                ],
              },
            ],
          },
        }),
      );
    });
  });

  describe("listSubjects", () => {
    it("filtre les matieres nationales par languageSystem pour une ecole anglophone", async () => {
      const prisma = makePrisma({ cycle: null, languageSystem: "ANGLOPHONE" });
      const service = makeService(prisma);

      await service.listSubjects(SCHOOL_ID);

      expect(prisma.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { schoolId: SCHOOL_ID },
              {
                schoolId: null,
                OR: [
                  { languageSystem: null },
                  { languageSystem: { in: ["ANGLOPHONE"] } },
                ],
              },
            ],
          },
        }),
      );
    });

    it("ne restreint que sur les matieres nationales sans langue si l'ecole n'a pas de languageSystem defini", async () => {
      const prisma = makePrisma({ cycle: null, languageSystem: null });
      const service = makeService(prisma);

      await service.listSubjects(SCHOOL_ID);

      expect(prisma.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ schoolId: SCHOOL_ID }, { schoolId: null }],
          },
        }),
      );
    });
  });

  describe("listCurriculums", () => {
    it("inclut le languageSystem du niveau et de la filiere pour permettre l'affichage/filtrage cote client", async () => {
      const prisma = makePrisma({ cycle: null, languageSystem: null });
      const service = makeService(prisma);

      await service.listCurriculums(SCHOOL_ID);

      expect(prisma.curriculum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            academicLevel: expect.objectContaining({
              select: expect.objectContaining({ languageSystem: true }),
            }),
            track: expect.objectContaining({
              select: expect.objectContaining({ languageSystem: true }),
            }),
          }),
        }),
      );
    });
  });

  describe("createNationalTrack / updateNationalTrack", () => {
    it("enregistre le languageSystem a la creation", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await service.createNationalTrack({
        code: "A1",
        label: "A1",
        languageSystem: "FRANCOPHONE",
      });

      expect(prisma.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: null,
            languageSystem: "FRANCOPHONE",
          }),
        }),
      );
    });

    it("met a jour le languageSystem d'une filiere nationale existante", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await service.updateNationalTrack("track-1", {
        languageSystem: "ANGLOPHONE",
      });

      expect(prisma.track.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ languageSystem: "ANGLOPHONE" }),
        }),
      );
    });
  });

  describe("createNationalSubject / updateNationalSubject", () => {
    it("enregistre le languageSystem a la creation", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await service.createNationalSubject({
        code: "FR",
        name: "Francais",
        languageSystem: "FRANCOPHONE",
      });

      expect(prisma.subject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: null,
            languageSystem: "FRANCOPHONE",
          }),
        }),
      );
    });

    it("met a jour le languageSystem d'une matiere nationale existante", async () => {
      const prisma = makePrisma();
      const service = makeService(prisma);

      await service.updateNationalSubject("subject-1", {
        languageSystem: "ANGLOPHONE",
      });

      expect(prisma.subject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ languageSystem: "ANGLOPHONE" }),
        }),
      );
    });
  });
});
