import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";

describe("AuthService.getMe", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
    mailService as never,
  );

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
  });

  it("retourne la classe courante de chaque enfant lié quand elle existe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
      parentLinks: [
        {
          student: {
            id: "student-1",
            firstName: "Remi",
            lastName: "Ntamack",
            user: { avatarUrl: null },
            enrollments: [
              {
                class: {
                  name: "6e C",
                },
              },
            ],
          },
        },
      ],
    });

    const result = await service.getMe("parent-1", "school-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "parent-1" },
        select: expect.objectContaining({
          parentLinks: expect.objectContaining({
            where: { schoolId: "school-1" },
          }),
        }),
      }),
    );
    expect(result.linkedStudents).toEqual([
      expect.objectContaining({
        id: "student-1",
        firstName: "Remi",
        lastName: "Ntamack",
        currentEnrollment: {
          class: {
            name: "6e C",
          },
        },
      }),
    ]);
  });

  it("retourne currentEnrollment à null quand aucun enrollment actif n'existe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [{ schoolId: "school-1", role: "PARENT" }],
      parentLinks: [
        {
          student: {
            id: "student-2",
            firstName: "Paul",
            lastName: "Ntamack",
            user: { avatarUrl: null },
            enrollments: [],
          },
        },
      ],
    });

    const result = await service.getMe("parent-1", "school-1");

    expect(result.linkedStudents).toEqual([
      expect.objectContaining({
        id: "student-2",
        currentEnrollment: null,
      }),
    ]);
  });

  it("rejette si l'utilisateur n'a aucun accès sur l'école (getMe)", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "parent-1",
      activeRole: "PARENT",
      profileCompleted: true,
      activationStatus: "ACTIVE",
      email: "parent@example.com",
      phone: null,
      avatarUrl: null,
      firstName: "Robert",
      lastName: "Ntamack",
      gender: null,
      platformRoles: [],
      memberships: [],
      parentLinks: [],
    });

    await expect(service.getMe("parent-1", "school-1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// AuthService.loginWithPhonePin — path B (ACTIVE user, pinHash
// exists but verifiedAt is null)
// ─────────────────────────────────────────────────────────────
describe("AuthService.loginWithPhonePin — path B (ACTIVE user, verifiedAt null)", () => {
  const prisma = {
    userPhoneCredential: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    authRateLimit: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    authAuditLog: {
      create: jest.fn(),
    },
  };

  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configService = { get: jest.fn() };
  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  let service: AuthService;

  // A minimal user shape that satisfies the post-credential checks
  const fakeUser = {
    id: "user-active-1",
    email: "parent@ecole.cm",
    activeRole: "PARENT",
    profileCompleted: true,
    activationStatus: "ACTIVE",
    platformRoles: [],
    memberships: [
      {
        schoolId: "school-1",
        school: { slug: "ecole-pilote" },
      },
    ],
    phoneCredential: { verifiedAt: null },
  };

  beforeEach(() => {
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      mailService as never,
    );

    // Stub private helpers that are not under test here
    (
      service as never as { assertNotRateLimited: jest.Mock }
    ).assertNotRateLimited = jest.fn().mockResolvedValue(undefined);
    (service as never as { recordAuthFailure: jest.Mock }).recordAuthFailure =
      jest.fn().mockResolvedValue(undefined);
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    (service as never as { clearAuthFailures: jest.Mock }).clearAuthFailures =
      jest.fn().mockResolvedValue(undefined);
    (service as never as { issueAuthSession: jest.Mock }).issueAuthSession =
      jest.fn().mockReturnValue({ accessToken: "tok", user: fakeUser });
    (
      service as never as { assertPlatformCredentialsReady: jest.Mock }
    ).assertPlatformCredentialsReady = jest.fn();
    (
      service as never as { activatePendingPhoneUserOnFirstLogin: jest.Mock }
    ).activatePendingPhoneUserOnFirstLogin = jest.fn();

    jest.clearAllMocks();

    // Re-apply stubs cleared by clearAllMocks
    (
      service as never as { assertNotRateLimited: jest.Mock }
    ).assertNotRateLimited = jest.fn().mockResolvedValue(undefined);
    (service as never as { recordAuthFailure: jest.Mock }).recordAuthFailure =
      jest.fn().mockResolvedValue(undefined);
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    (service as never as { clearAuthFailures: jest.Mock }).clearAuthFailures =
      jest.fn().mockResolvedValue(undefined);
    (service as never as { issueAuthSession: jest.Mock }).issueAuthSession =
      jest.fn().mockReturnValue({ accessToken: "tok", user: fakeUser });
    (
      service as never as { assertPlatformCredentialsReady: jest.Mock }
    ).assertPlatformCredentialsReady = jest.fn();
    (
      service as never as { activatePendingPhoneUserOnFirstLogin: jest.Mock }
    ).activatePendingPhoneUserOnFirstLogin = jest.fn();
  });

  async function makeCredential(pinPlain: string) {
    const pinHash = await bcrypt.hash(pinPlain, 10);
    return {
      id: "cred-1",
      phoneE164: "+237612345678",
      pinHash,
      verifiedAt: null,
      user: fakeUser,
    };
  }

  it("accepte le PIN correct et marque verifiedAt (path B)", async () => {
    const credential = await makeCredential("123456");
    prisma.userPhoneCredential.findUnique.mockResolvedValue(credential);
    prisma.userPhoneCredential.update.mockResolvedValue({
      ...credential,
      verifiedAt: new Date(),
    });

    await service.loginWithPhonePin("+237612345678", "123456");

    expect(prisma.userPhoneCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cred-1" },
        data: expect.objectContaining({ verifiedAt: expect.any(Date) }),
      }),
    );
    expect(
      (service as never as { activatePendingPhoneUserOnFirstLogin: jest.Mock })
        .activatePendingPhoneUserOnFirstLogin,
    ).not.toHaveBeenCalled();
  });

  it("rejette un PIN incorrect avec UnauthorizedException (path B)", async () => {
    const credential = await makeCredential("123456");
    prisma.userPhoneCredential.findUnique.mockResolvedValue(credential);

    await expect(
      service.loginWithPhonePin("+237612345678", "000000"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.userPhoneCredential.update).not.toHaveBeenCalled();
  });

  it("n'appelle pas activatePendingPhoneUserOnFirstLogin pour un user ACTIVE avec pinHash", async () => {
    const credential = await makeCredential("654321");
    prisma.userPhoneCredential.findUnique.mockResolvedValue(credential);
    prisma.userPhoneCredential.update.mockResolvedValue({
      ...credential,
      verifiedAt: new Date(),
    });

    await service.loginWithPhonePin("+237612345678", "654321");

    expect(
      (service as never as { activatePendingPhoneUserOnFirstLogin: jest.Mock })
        .activatePendingPhoneUserOnFirstLogin,
    ).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// AuthService.createPassword
// ─────────────────────────────────────────────────────────────
describe("AuthService.createPassword", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    authAuditLog: { create: jest.fn() },
  };
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configService = { get: jest.fn() };
  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      mailService as never,
    );
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    jest.clearAllMocks();
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  it("cree le mot de passe quand passwordHash est null", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: null,
    });
    prisma.user.update.mockResolvedValue({});

    const result = await service.createPassword("user-1", "NewPass1");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it("rejette si le mot de passe est deja configure", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "existing-hash",
    });

    await expect(
      service.createPassword("user-1", "NewPass1"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejette si le mot de passe ne respecte pas la politique", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: null,
    });

    await expect(
      service.createPassword("user-1", "weakpassword"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejette si user inconnu", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.createPassword("unknown-id", "NewPass1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

// ─────────────────────────────────────────────────────────────
// AuthService.addPhoneCredential
// ─────────────────────────────────────────────────────────────
describe("AuthService.addPhoneCredential", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userPhoneCredential: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authAuditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configService = { get: jest.fn() };
  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      mailService as never,
    );
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
    jest.clearAllMocks();
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    );
  });

  it("cree le credential phone+PIN quand aucun n'existe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      phoneCredential: null,
    });
    prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({});
    prisma.userPhoneCredential.create.mockResolvedValue({});

    const result = await service.addPhoneCredential(
      "user-1",
      "612345678",
      "123456",
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ phone: "+237612345678" }),
      }),
    );
    expect(prisma.userPhoneCredential.create).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("rejette si le PIN ne fait pas 6 chiffres", async () => {
    await expect(
      service.addPhoneCredential("user-1", "612345678", "123"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejette si un credential phone existe deja", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      phoneCredential: { id: "cred-1" },
    });

    await expect(
      service.addPhoneCredential("user-1", "612345678", "123456"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.userPhoneCredential.create).not.toHaveBeenCalled();
  });

  it("rejette si le telephone est deja utilise", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      phoneCredential: null,
    });
    prisma.userPhoneCredential.findUnique.mockResolvedValue({
      id: "other-cred",
    });

    await expect(
      service.addPhoneCredential("user-1", "612345678", "123456"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ─────────────────────────────────────────────────────────────
// AuthService.changePassword — protection passwordHash null
// ─────────────────────────────────────────────────────────────
describe("AuthService.changePassword — user sans mot de passe", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    authAuditLog: { create: jest.fn() },
  };
  const jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const configService = { get: jest.fn() };
  const mailService = {
    sendPasswordResetEmail: jest.fn(),
    sendPasswordResetSms: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      mailService as never,
    );
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
    jest.clearAllMocks();
    (service as never as { auditAuth: jest.Mock }).auditAuth = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  it("rejette avec ForbiddenException si passwordHash est null", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: null,
    });

    await expect(
      service.changePassword("user-1", "anything", "NewPass1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
