/**
 * Tests unitaires : AuthService — requestEmailChange, confirmEmailChange, linkSsoAccount
 */

import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AuthService } from "./auth.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const USER_EMAIL = "alice@example.com";
const NEW_EMAIL = "alice-new@example.com";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: USER_EMAIL,
    firstName: "Alice",
    lastName: "Test",
    passwordHash: null,
    mustChangePassword: false,
    profileCompleted: true,
    activationStatus: "ACTIVE",
    phone: null,
    username: null,
    avatarUrl: null,
    platformRoles: [],
    phoneCredential: null,
    memberships: [],
    ...overrides,
  };
}

function makeToken(
  overrides: Record<string, unknown> = {},
  purpose = "CHANGE_EMAIL",
) {
  return {
    id: "tok-1",
    userId: USER_ID,
    email: NEW_EMAIL,
    tokenHash: "hash-xyz",
    purpose,
    usedAt: null,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    user: { id: USER_ID, email: USER_EMAIL },
    ...overrides,
  };
}

function makePrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userAuthIdentity: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    authRateLimit: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    authAuditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: jest.fn() },
        userAuthIdentity: { updateMany: jest.fn() },
        emailVerificationToken: { update: jest.fn() },
        refreshToken: { updateMany: jest.fn() },
      }),
    ),
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe("AuthService — requestEmailChange", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("jwt-token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("http://localhost:3000") },
        },
        {
          provide: MailService,
          useValue: { sendEmailVerification: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("throws 401 when user not found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.requestEmailChange(USER_ID, NEW_EMAIL),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("throws 403 when user has no email (phone-only account)", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ email: null }));
    await expect(
      service.requestEmailChange(USER_ID, NEW_EMAIL),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws 403 when new email equals current email", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    await expect(
      service.requestEmailChange(USER_ID, USER_EMAIL),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws 403 when new email is already taken", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(makeUser())
      .mockResolvedValueOnce({ id: "other-user" });
    await expect(
      service.requestEmailChange(USER_ID, NEW_EMAIL),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates a CHANGE_EMAIL token and sends verification email", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(makeUser())
      .mockResolvedValueOnce(null);
    prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.emailVerificationToken.create.mockResolvedValue({});

    const result = await service.requestEmailChange(USER_ID, NEW_EMAIL);

    expect(result.success).toBe(true);
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          email: NEW_EMAIL,
          purpose: "CHANGE_EMAIL",
        }),
      }),
    );
  });
});

// ── confirmEmailChange ────────────────────────────────────────────────────────

describe("AuthService — confirmEmailChange", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("jwt-token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("http://localhost:3000") },
        },
        {
          provide: MailService,
          useValue: { sendEmailVerification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("throws 403 for unknown token", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(null);
    await expect(service.confirmEmailChange("bad-token")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws 403 for already-used token", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(
      makeToken({ usedAt: new Date() }),
    );
    await expect(service.confirmEmailChange("raw")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws 403 for expired token", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(
      makeToken({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(service.confirmEmailChange("raw")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws 403 for ADD_EMAIL purpose token used in change flow", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(
      makeToken({}, "ADD_EMAIL"),
    );
    await expect(service.confirmEmailChange("raw")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("throws 403 when new email taken by another user", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(makeToken());
    prisma.user.findUnique.mockResolvedValue({ id: "other-user" });
    await expect(service.confirmEmailChange("raw")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("runs transaction to update user email + identities + mark token + revoke tokens", async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(makeToken());
    prisma.user.findUnique.mockResolvedValue(null);

    const txUserUpdate = jest.fn();
    const txIdentityUpdateMany = jest.fn();
    const txTokenUpdate = jest.fn();
    const txRefreshRevoke = jest.fn();

    prisma.$transaction.mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user: { update: txUserUpdate },
          userAuthIdentity: { updateMany: txIdentityUpdateMany },
          emailVerificationToken: { update: txTokenUpdate },
          refreshToken: { updateMany: txRefreshRevoke },
        }),
    );

    const result = await service.confirmEmailChange("raw");

    expect(result.success).toBe(true);
    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { email: NEW_EMAIL } }),
    );
    expect(txIdentityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { email: NEW_EMAIL } }),
    );
    expect(txTokenUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
    );
    expect(txRefreshRevoke).toHaveBeenCalled();
  });
});

// ── linkSsoAccount ────────────────────────────────────────────────────────────

describe("AuthService — linkSsoAccount", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("jwt-token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(null) },
        },
        {
          provide: MailService,
          useValue: { sendEmailVerification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it("throws 403 for empty providerAccountId", async () => {
    await expect(
      service.linkSsoAccount(USER_ID, {
        provider: "GOOGLE",
        providerAccountId: "",
        email: USER_EMAIL,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws 403 when providerAccountId already linked to another user", async () => {
    prisma.userAuthIdentity.findUnique.mockResolvedValue({
      id: "ident-1",
      userId: "other-user",
    });
    await expect(
      service.linkSsoAccount(USER_ID, {
        provider: "GOOGLE",
        providerAccountId: "sub-123",
        email: USER_EMAIL,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates identity when none exists", async () => {
    prisma.userAuthIdentity.findUnique.mockResolvedValue(null);
    prisma.userAuthIdentity.create.mockResolvedValue({});

    const result = await service.linkSsoAccount(USER_ID, {
      provider: "GOOGLE",
      providerAccountId: "sub-123",
      email: USER_EMAIL,
    });

    expect(result.success).toBe(true);
    expect(prisma.userAuthIdentity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          provider: "GOOGLE",
          providerAccountId: "sub-123",
        }),
      }),
    );
  });

  it("updates email when identity already belongs to same user", async () => {
    prisma.userAuthIdentity.findUnique.mockResolvedValue({
      id: "ident-1",
      userId: USER_ID,
    });
    prisma.userAuthIdentity.update.mockResolvedValue({});

    const result = await service.linkSsoAccount(USER_ID, {
      provider: "GOOGLE",
      providerAccountId: "sub-123",
      email: NEW_EMAIL,
    });

    expect(result.success).toBe(true);
    expect(prisma.userAuthIdentity.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { email: NEW_EMAIL } }),
    );
  });
});
