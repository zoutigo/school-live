import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ManagementService } from "../src/management/management.service.js";

const prisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  school: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mailService = {
  sendTemporaryPasswordEmail: jest.fn(),
};

const service = new ManagementService(prisma as never, mailService as never);

const PLATFORM_USER = {
  id: "platform-1",
  firstName: "Paul",
  lastName: "Nkomo",
  email: "paul.nkomo@scolive.cm",
  platformRoles: [{ role: "SUPPORT" }],
};

function makeTx() {
  return {
    schoolYear: {
      create: jest.fn(
        async (args: {
          data: { school: { create: Record<string, unknown> } };
        }) => ({
          id: "school-year-1",
          school: {
            id: "school-1",
            slug: "greenwich-college",
            ...args.data.school.create,
          },
        }),
      ),
    },
    school: { update: jest.fn() },
    schoolMembership: {
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

let tx: ReturnType<typeof makeTx>;

beforeEach(() => {
  jest.resetAllMocks();
  tx = makeTx();
  prisma.school.count.mockResolvedValue(0);
  prisma.$transaction.mockImplementation(
    async (callback: (t: unknown) => unknown) => callback(tx),
  );
});

describe("ManagementService — createSchoolWithSchoolAdmin (admin principal = platform user)", () => {
  it("rejette une creation sans admin principal", async () => {
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejette l'ancien contrat email/telephone/PIN (champ requis manquant)", async () => {
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
        schoolAdminEmail: "x@y.cm",
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette un utilisateur inexistant (404)", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
        primaryAdminUserId: "ghost",
      } as never),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejette un utilisateur sans role plateforme (400)", async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...PLATFORM_USER,
      platformRoles: [],
    });
    await expect(
      service.createSchoolWithSchoolAdmin({
        name: "Greenwich College",
        primaryAdminUserId: "platform-1",
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("cree ecole + annee active + membership SCHOOL_ADMIN et renseigne primaryAdminUserId", async () => {
    prisma.user.findUnique.mockResolvedValue(PLATFORM_USER);

    const result = await service.createSchoolWithSchoolAdmin({
      name: "Greenwich College",
      primaryAdminUserId: "platform-1",
    } as never);

    const createArgs = tx.schoolYear.create.mock.calls[0][0];
    expect(createArgs.data.school.create.primaryAdminUserId).toBe("platform-1");
    expect(tx.school.update).toHaveBeenCalledWith({
      where: { id: "school-1" },
      data: { activeSchoolYearId: "school-year-1" },
    });
    expect(tx.schoolMembership.create).toHaveBeenCalledWith({
      data: {
        userId: "platform-1",
        schoolId: "school-1",
        role: "SCHOOL_ADMIN",
      },
    });
    expect(result.schoolAdmin).toEqual(
      expect.objectContaining({ id: "platform-1", email: PLATFORM_USER.email }),
    );
    // Aucun compte cree, aucun mail d'invitation : l'admin est un compte existant.
    expect(mailService.sendTemporaryPasswordEmail).not.toHaveBeenCalled();
  });
});

describe("ManagementService — replacePrimaryAdmin", () => {
  const NEW_ADMIN = {
    ...PLATFORM_USER,
    id: "platform-2",
    email: "b@scolive.cm",
  };

  it("rejette un payload sans userId", async () => {
    await expect(
      service.replacePrimaryAdmin("school-1", {} as never),
    ).rejects.toThrow(BadRequestException);
  });

  it("404 si l'ecole n'existe pas", async () => {
    prisma.school.findUnique.mockResolvedValue(null);
    await expect(
      service.replacePrimaryAdmin("nope", { userId: "platform-2" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("400 si c'est deja l'admin principal", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      primaryAdminUserId: "platform-2",
    });
    await expect(
      service.replacePrimaryAdmin("school-1", { userId: "platform-2" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("400 si le nouvel admin n'est pas un platform user", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      primaryAdminUserId: "platform-1",
    });
    prisma.user.findUnique.mockResolvedValue({
      ...NEW_ADMIN,
      platformRoles: [],
    });
    await expect(
      service.replacePrimaryAdmin("school-1", { userId: "platform-2" }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("remplace : ajoute le nouveau SCHOOL_ADMIN, retire SEULEMENT le SCHOOL_ADMIN de l'ancien, met a jour le champ", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      primaryAdminUserId: "platform-1",
    });
    prisma.user.findUnique.mockResolvedValue(NEW_ADMIN);

    const result = await service.replacePrimaryAdmin("school-1", {
      userId: "platform-2",
    });

    expect(tx.schoolMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          userId: "platform-2",
          schoolId: "school-1",
          role: "SCHOOL_ADMIN",
        },
      }),
    );
    // Les autres roles de l'ancien admin dans l'ecole sont conserves.
    expect(tx.schoolMembership.deleteMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-1",
        userId: "platform-1",
        role: "SCHOOL_ADMIN",
      },
    });
    expect(tx.school.update).toHaveBeenCalledWith({
      where: { id: "school-1" },
      data: { primaryAdminUserId: "platform-2" },
    });
    expect(result.success).toBe(true);
    expect(result.primaryAdmin.id).toBe("platform-2");
  });

  it("designation initiale (ecole legacy sans admin principal) : ne retire personne", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      primaryAdminUserId: null,
    });
    prisma.user.findUnique.mockResolvedValue(NEW_ADMIN);

    await service.replacePrimaryAdmin("school-1", { userId: "platform-2" });

    expect(tx.schoolMembership.deleteMany).not.toHaveBeenCalled();
    expect(tx.school.update).toHaveBeenCalledWith({
      where: { id: "school-1" },
      data: { primaryAdminUserId: "platform-2" },
    });
  });

  it("propage l'echec transactionnel", async () => {
    prisma.school.findUnique.mockResolvedValue({
      id: "school-1",
      primaryAdminUserId: "platform-1",
    });
    prisma.user.findUnique.mockResolvedValue(NEW_ADMIN);
    prisma.$transaction.mockRejectedValue(new Error("db down"));
    await expect(
      service.replacePrimaryAdmin("school-1", { userId: "platform-2" }),
    ).rejects.toThrow("db down");
  });
});

describe("ManagementService — listPlatformUsers", () => {
  it("ne liste que les utilisateurs ayant un role plateforme et applique la recherche", async () => {
    prisma.user.findMany.mockResolvedValue([PLATFORM_USER]);
    const result = await service.listPlatformUsers("  paul ");
    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.where.platformRoles).toEqual({ some: {} });
    expect(args.where.OR).toHaveLength(3);
    expect(args.where.OR[0].firstName.contains).toBe("paul");
    expect(result).toEqual([
      expect.objectContaining({ id: "platform-1", platformRoles: ["SUPPORT"] }),
    ]);
  });

  it("sans recherche, pas de filtre OR", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.listPlatformUsers();
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });
});

describe("ManagementService — protection de l'admin principal", () => {
  it("removeSchoolAdmin refuse l'admin principal (409)", async () => {
    const membershipFindFirst = jest.fn().mockResolvedValue({ id: "m1" });
    const schoolFindUnique = jest
      .fn()
      .mockResolvedValue({ primaryAdminUserId: "platform-1" });
    const svc = new ManagementService(
      {
        schoolMembership: { findFirst: membershipFindFirst, count: jest.fn() },
        school: { findUnique: schoolFindUnique },
      } as never,
      mailService as never,
    );
    await expect(
      svc.removeSchoolAdmin("school-1", "platform-1"),
    ).rejects.toThrow(/administrateur principal/);
  });

  it("removeSchoolAdmin retire un admin secondaire", async () => {
    const del = jest.fn();
    const svc = new ManagementService(
      {
        schoolMembership: {
          findFirst: jest.fn().mockResolvedValue({ id: "m2" }),
          count: jest.fn().mockResolvedValue(2),
          delete: del,
        },
        school: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ primaryAdminUserId: "platform-1" }),
        },
      } as never,
      mailService as never,
    );
    await expect(svc.removeSchoolAdmin("school-1", "other")).resolves.toEqual({
      success: true,
    });
    expect(del).toHaveBeenCalledWith({ where: { id: "m2" } });
  });

  it("deleteUser refuse de supprimer un admin principal d'ecole", async () => {
    const svc = new ManagementService(
      {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({
              id: "platform-1",
              platformRoles: [{ role: "SUPPORT" }],
            }),
          delete: jest.fn(),
        },
        school: {
          findMany: jest.fn().mockResolvedValue([{ name: "Greenwich" }]),
        },
      } as never,
      mailService as never,
    );
    await expect(
      svc.deleteUser(
        { id: "me", platformRoles: ["SUPER_ADMIN"] } as never,
        "platform-1",
      ),
    ).rejects.toThrow(/Greenwich/);
  });

  it("updateUser refuse de modifier les roles d'un admin principal", async () => {
    const svc = new ManagementService(
      {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: "platform-1",
            platformRoles: [{ role: "SUPPORT" }],
            memberships: [],
          }),
        },
        school: {
          findMany: jest.fn().mockResolvedValue([{ name: "Greenwich" }]),
        },
      } as never,
      mailService as never,
    );
    await expect(
      svc.updateUser(
        { id: "me", platformRoles: ["SUPER_ADMIN"] } as never,
        "platform-1",
        { platformRoles: [] } as never,
      ),
    ).rejects.toThrow(/Greenwich/);
  });

  it("updateUser autorise un changement de nom pour un admin principal", async () => {
    const update = jest.fn();
    const findFirstOrThrow = jest.fn().mockResolvedValue({
      id: "platform-1",
      platformRoles: [],
      memberships: [],
    });
    const prismaStub = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "platform-1",
          platformRoles: [{ role: "SUPPORT" }],
          memberships: [],
        }),
      },
      school: { findMany: jest.fn() },
      $transaction: jest.fn(async (cb: (t: unknown) => unknown) =>
        cb({ user: { update, findUniqueOrThrow: findFirstOrThrow } }),
      ),
    };
    const svc = new ManagementService(
      prismaStub as never,
      mailService as never,
    );
    await svc.updateUser(
      { id: "me", platformRoles: ["SUPER_ADMIN"] } as never,
      "platform-1",
      { firstName: "Paulo" } as never,
    );
    expect(prismaStub.school.findMany).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
