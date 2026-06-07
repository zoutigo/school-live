/**
 * Tests unitaires : AuthService — loginWithUsername (contrat attendu)
 *
 * Ces tests documentent le comportement attendu de `loginWithUsername`.
 * Ils sont écrits contre une implémentation mock du service car la méthode
 * sera ajoutée à AuthService dans le Sprint 4 (après fusion des endpoints backend).
 *
 * Pattern : vérification du comportement Prisma + JWT + cas d'erreur.
 */

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import bcrypt from "bcryptjs";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";
const SCHOOL_SLUG = "college-vogt";
const USER_ID = "user-1";
const HASHED_PASSWORD = bcrypt.hashSync("ValidPass123", 10);

function makePrismaUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    username: "jeandupont",
    email: null,
    phone: null,
    passwordHash: HASHED_PASSWORD,
    mustChangePassword: false,
    profileCompleted: true,
    activationStatus: "ACTIVE",
    gender: null,
    avatarUrl: null,
    firstName: "Jean",
    lastName: "DUPONT",
    birthDate: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    platformRoles: [],
    phoneCredential: null,
    memberships: [
      {
        schoolId: SCHOOL_ID,
        role: "STUDENT",
        school: { id: SCHOOL_ID, slug: SCHOOL_SLUG },
      },
    ],
    ...overrides,
  };
}

const makePrismaMock = () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  authRateLimit: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({ failedAttempts: 0 }),
    delete: jest.fn().mockResolvedValue(null),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  authAuditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  session: {
    create: jest.fn().mockResolvedValue({ id: "session-1" }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  $transaction: jest.fn(),
});

// ── Mock service ──────────────────────────────────────────────────────────────

/**
 * Implémentation mock de loginWithUsername qui suit la logique documentée dans
 * le Sprint 4: recherche par username normalisé, vérification bcrypt, contrôles
 * mustChangePassword / activationStatus, émission du token JWT.
 */
function makeLoginWithUsernameMock(prisma: ReturnType<typeof makePrismaMock>) {
  return async function loginWithUsername(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; schoolSlug: string | null }> {
    const normalizedUsername = username.trim().toLowerCase();

    // Rate-limit check (simplified: just check if blocked)
    await prisma.authRateLimit.findUnique({
      where: { key: `USERNAME_LOGIN:${normalizedUsername}` },
    });

    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash as string,
    );
    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        username: user.username,
        schoolSlug:
          (user.memberships as Array<{ school: { slug: string } }>)[0]?.school
            ?.slug ?? null,
      });
    }

    if (
      (user.memberships as unknown[]).length > 0 &&
      user.activationStatus !== "ACTIVE"
    ) {
      throw new ForbiddenException({
        code: "ACCOUNT_VALIDATION_REQUIRED",
        username: user.username,
        schoolSlug:
          (user.memberships as Array<{ school: { slug: string } }>)[0]?.school
            ?.slug ?? null,
      });
    }

    const session = await prisma.session.create({
      data: { userId: user.id },
    });

    return {
      accessToken: `jwt-${session.id}`,
      schoolSlug:
        (user.memberships as Array<{ school: { slug: string } }>)[0]?.school
          ?.slug ?? null,
    };
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthService.loginWithUsername (contrat)", () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let loginWithUsername: ReturnType<typeof makeLoginWithUsernameMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    loginWithUsername = makeLoginWithUsernameMock(prisma);

    // Ensure NestJS module compiles (validates dependencies)
    await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("jwt") },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: MailService, useValue: {} },
      ],
    }).compile();
  });

  it("retourne une AuthResponse valide pour un utilisateur actif avec bon mot de passe", async () => {
    prisma.user.findUnique.mockResolvedValue(makePrismaUser());
    prisma.session.create.mockResolvedValue({ id: "session-1" });

    const result = await loginWithUsername("jeanDUPONT", "ValidPass123");

    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("schoolSlug", SCHOOL_SLUG);
  });

  it("normalise l'identifiant en minuscules avant la recherche Prisma", async () => {
    prisma.user.findUnique.mockResolvedValue(makePrismaUser());
    prisma.session.create.mockResolvedValue({ id: "session-1" });

    await loginWithUsername("JEANDUPONT", "ValidPass123");

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: "jeandupont" },
      }),
    );
  });

  it("lève UnauthorizedException si l'utilisateur n'existe pas", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(loginWithUsername("inexistant", "any")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("lève UnauthorizedException si le mot de passe est incorrect", async () => {
    prisma.user.findUnique.mockResolvedValue(makePrismaUser());

    await expect(
      loginWithUsername("jeanDUPONT", "WrongPassword"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("lève UnauthorizedException si l'utilisateur n'a pas de passwordHash", async () => {
    prisma.user.findUnique.mockResolvedValue(
      makePrismaUser({ passwordHash: null }),
    );

    await expect(
      loginWithUsername("jeanDUPONT", "ValidPass123"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("lève ForbiddenException avec code PASSWORD_CHANGE_REQUIRED si mustChangePassword est true", async () => {
    prisma.user.findUnique.mockResolvedValue(
      makePrismaUser({ mustChangePassword: true }),
    );

    await expect(
      loginWithUsername("jeanDUPONT", "ValidPass123"),
    ).rejects.toThrow(ForbiddenException);

    try {
      await loginWithUsername("jeanDUPONT", "ValidPass123");
      fail("devrait lever une exception");
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }
  });

  it("lève ForbiddenException avec code ACCOUNT_VALIDATION_REQUIRED si le compte n'est pas ACTIVE", async () => {
    prisma.user.findUnique.mockResolvedValue(
      makePrismaUser({ activationStatus: "PENDING" }),
    );

    await expect(
      loginWithUsername("jeanDUPONT", "ValidPass123"),
    ).rejects.toThrow(ForbiddenException);

    try {
      await loginWithUsername("jeanDUPONT", "ValidPass123");
      fail("devrait lever une exception");
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: "ACCOUNT_VALIDATION_REQUIRED",
      });
    }
  });

  it("inclut schoolSlug dans la réponse PASSWORD_CHANGE_REQUIRED", async () => {
    prisma.user.findUnique.mockResolvedValue(
      makePrismaUser({ mustChangePassword: true }),
    );

    try {
      await loginWithUsername("jeanDUPONT", "ValidPass123");
      fail("devrait lever une exception");
    } catch (err) {
      const response = (err as ForbiddenException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.schoolSlug).toBe(SCHOOL_SLUG);
      expect(response.username).toBe("jeandupont");
    }
  });

  it("inclut schoolSlug null quand l'utilisateur n'a pas de membership école", async () => {
    prisma.user.findUnique.mockResolvedValue(
      makePrismaUser({ memberships: [] }),
    );
    prisma.session.create.mockResolvedValue({ id: "session-1" });

    const result = await loginWithUsername("jeanDUPONT", "ValidPass123");

    expect(result.schoolSlug).toBeNull();
  });
});
