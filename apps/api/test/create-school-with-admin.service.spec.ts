import { BadRequestException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  activationCode: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  school: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mailService = {
  sendTemporaryPasswordEmail: jest.fn(),
};

const service = new ManagementService(prisma as never, mailService as never);

function makeTx(
  overrides: {
    userCreate?: jest.Mock;
  } = {},
) {
  return {
    schoolYear: {
      create: jest.fn(async () => ({
        id: "school-year-1",
        school: {
          id: "school-1",
          slug: "greenwich-college",
          name: "Greenwich College",
          country: "Cameroun",
          region: "Nord-Ouest",
          city: "Bamenda",
          cycle: null,
          languageSystem: null,
          logoUrl: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      })),
    },
    school: { update: jest.fn() },
    schoolMembership: { create: jest.fn() },
    activationCode: prisma.activationCode,
    user: {
      create:
        overrides.userCreate ??
        jest.fn(async () => ({
          id: "admin-new",
          firstName: "Paul",
          lastName: "Nkomo",
          email: "paul.nkomo@greenwich.cm",
        })),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.school.count.mockResolvedValue(0);
  prisma.$transaction.mockImplementation(
    async (callback: (tx: unknown) => unknown) => callback(makeTx()),
  );
});

describe("ManagementService — createSchoolWithSchoolAdmin (contrat email ou telephone)", () => {
  it("rejette une creation sans email ni telephone pour l'admin fondateur", async () => {
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette une creation par telephone seul sans PIN", async () => {
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
        schoolAdminPhone: "699001122",
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("cree l'ecole et un admin par email (comportement historique inchange)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.createSchoolWithSchoolAdmin({
      name: "Greenwich College",
      schoolAdminEmail: "paul.nkomo@greenwich.cm",
    } as never);

    expect(mailService.sendTemporaryPasswordEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "paul.nkomo@greenwich.cm" }),
    );
    expect(result.userExisted).toBe(false);
    expect(result.activationRequired).toBeUndefined();
    expect(result.school.id).toBe("school-1");
  });

  it("cree l'ecole et un admin fondateur par telephone en PENDING avec un code d'activation", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const userCreate = jest.fn(async () => ({
      id: "admin-phone-1",
      firstName: "Administrateur",
      lastName: "1122",
    }));
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback(makeTx({ userCreate })),
    );

    const result = await service.createSchoolWithSchoolAdmin({
      name: "Greenwich College",
      schoolAdminPhone: "699001122",
      schoolAdminPin: "123456",
    } as never);

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { phone: "+237699001122" } }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: "+237699001122",
          activationStatus: "PENDING",
          mustChangePassword: false,
        }),
      }),
    );
    expect(mailService.sendTemporaryPasswordEmail).not.toHaveBeenCalled();
    expect(result.activationRequired).toBe(true);
    expect(typeof result.activationCode).toBe("string");
  });

  it("rattache le fondateur a un utilisateur telephone deja existant sans regenerer d'identifiants", async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: "user-existing",
      firstName: "Marc",
      mustChangePassword: false,
    });
    const userCreate = jest.fn();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback(makeTx({ userCreate })),
    );

    const result = await service.createSchoolWithSchoolAdmin({
      name: "Greenwich College",
      schoolAdminPhone: "699001122",
      schoolAdminPin: "123456",
    } as never);

    expect(userCreate).not.toHaveBeenCalled();
    expect(result.userExisted).toBe(true);
    expect(result.schoolAdmin.id).toBe("user-existing");
  });
});
