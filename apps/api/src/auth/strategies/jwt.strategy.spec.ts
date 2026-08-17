/**
 * Tests unitaires : JwtStrategy.validate — rôle actif effectif par requête.
 *
 * Régression couverte : un compte mono-rôle (User.activeRole = NULL en base,
 * car le sélecteur de rôle ne s'affiche jamais pour un rôle unique) doit
 * quand même obtenir un AuthenticatedUser.activeRole résolu, faute de quoi
 * tout endpoint qui teste activeRole directement (ex: timetable) rejette la
 * requête avec "Rôle insuffisant" alors que /me affiche déjà le bon rôle.
 */

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service.js";
import { JwtStrategy } from "./jwt.strategy.js";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    activeRole: null,
    activationStatus: "ACTIVE",
    profileCompleted: true,
    isTester: false,
    email: "parent@ecole.com",
    phone: null,
    avatarUrl: null,
    firstName: "Serge",
    lastName: "Belibi",
    preferredLocale: "FR",
    platformRoles: [],
    memberships: [],
    ...overrides,
  };
}

describe("JwtStrategy.validate", () => {
  function build(userFindUnique: jest.Mock) {
    const prisma = {
      user: { findUnique: userFindUnique },
    } as unknown as PrismaService;
    const configService = {
      get: jest.fn().mockReturnValue("test-secret"),
    } as unknown as ConfigService;
    return new JwtStrategy(configService, prisma);
  }

  it("resolves the only available role when activeRole is null in DB (mono-role account)", async () => {
    const findUnique = jest.fn().mockResolvedValue(
      makeUser({
        memberships: [{ schoolId: "school-1", role: "PARENT" }],
      }),
    );
    const strategy = build(findUnique);

    const result = await strategy.validate({ sub: "user-1" });

    expect(result.activeRole).toBe("PARENT");
  });

  it("keeps the persisted activeRole when it is still assigned", async () => {
    const findUnique = jest.fn().mockResolvedValue(
      makeUser({
        activeRole: "TEACHER",
        memberships: [
          { schoolId: "school-1", role: "TEACHER" },
          { schoolId: "school-1", role: "PARENT" },
        ],
      }),
    );
    const strategy = build(findUnique);

    const result = await strategy.validate({ sub: "user-1" });

    expect(result.activeRole).toBe("TEACHER");
  });

  it("returns null when the user genuinely has no role", async () => {
    const findUnique = jest.fn().mockResolvedValue(makeUser());
    const strategy = build(findUnique);

    const result = await strategy.validate({ sub: "user-1" });

    expect(result.activeRole).toBeNull();
  });

  it("throws UnauthorizedException when the user no longer exists", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const strategy = build(findUnique);

    await expect(strategy.validate({ sub: "ghost" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
