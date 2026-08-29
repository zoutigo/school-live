import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ManagementService } from "./management.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { MailService } from "../mail/mail.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";

/**
 * Régression : `createUser` n'affichait aucun message d'erreur clair quand
 * l'email ou le téléphone fourni existait déjà — la contrainte unique
 * Prisma sur `email` remontait une erreur brute non catchée (P2002), et
 * `phone` n'a même pas de contrainte unique en base, donc un doublon de
 * téléphone était accepté silencieusement. Ce test verrouille le pré-check
 * explicite ajouté dans `createUser` (message clair + statut 409) et le
 * filet de sécurité `catch` sur une éventuelle course.
 */

const superAdmin: AuthenticatedUser = {
  id: "admin-1",
  platformRoles: ["SUPER_ADMIN"],
  memberships: [],
  profileCompleted: true,
  firstName: "Super",
  lastName: "Admin",
  activeRole: "SUPER_ADMIN",
};

function makeService(prisma: Record<string, unknown>) {
  return new ManagementService(
    prisma as unknown as PrismaService,
    { sendTemporaryPasswordEmail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService,
  );
}

const basePayload = {
  firstName: "Jean",
  lastName: "Mbarga",
  email: "jean.mbarga@example.com",
  temporaryPassword: "Passw0rd!",
  role: "SUPPORT" as const,
  platformRoles: ["SUPPORT" as const],
};

describe("ManagementService.createUser — doublons email/téléphone", () => {
  it("rejette avec un message clair quand l'email existe déjà", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: "existing-1",
          email: "jean.mbarga@example.com",
          phone: null,
        }),
        create: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.createUser(superAdmin, { ...basePayload }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.createUser(superAdmin, { ...basePayload }),
    ).rejects.toThrow(/jean\.mbarga@example\.com/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejette avec un message clair quand le téléphone existe déjà (pas de contrainte unique en base)", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: "existing-1",
          email: "someone.else@example.com",
          phone: "699000000",
        }),
        create: jest.fn(),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.createUser(superAdmin, {
        ...basePayload,
        phone: "699000000",
      }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.createUser(superAdmin, {
        ...basePayload,
        phone: "699000000",
      }),
    ).rejects.toThrow(/699000000/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("recherche par email OU téléphone en une seule requête", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "new-1",
          firstName: "Jean",
          lastName: "Mbarga",
          email: "jean.mbarga@example.com",
          phone: "699000000",
          avatarUrl: null,
          isTester: false,
          activationStatus: "ACTIVE",
          platformRoles: [{ role: "SUPPORT" }],
          memberships: [],
        }),
      },
    };
    const service = makeService(prisma);

    await service.createUser(superAdmin, {
      ...basePayload,
      phone: "699000000",
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: "jean.mbarga@example.com" },
            { phone: "699000000" },
          ],
        },
      }),
    );
  });

  it("filet de sécurité : traduit une erreur P2002 de course en ConflictException lisible", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
      code: "P2002",
      clientVersion: "test",
    });
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(p2002),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.createUser(superAdmin, { ...basePayload }),
    ).rejects.toThrow(ConflictException);
  });

  it("n'affecte pas la création quand ni l'email ni le téléphone ne sont déjà utilisés", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "new-1",
          firstName: "Jean",
          lastName: "Mbarga",
          email: "jean.mbarga@example.com",
          phone: null,
          avatarUrl: null,
          isTester: false,
          activationStatus: "ACTIVE",
          platformRoles: [{ role: "SUPPORT" }],
          memberships: [],
        }),
      },
    };
    const service = makeService(prisma);

    const result = await service.createUser(superAdmin, { ...basePayload });

    expect(result.id).toBe("new-1");
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
