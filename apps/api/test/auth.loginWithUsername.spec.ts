import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";

// ─────────────────────────────────────────────────────────────
// AuthService.loginWithUsername
// ─────────────────────────────────────────────────────────────

/**
 * Helper that creates a minimal but valid AuthService instance with
 * all private helpers stubbed out so each test can focus on a single
 * branch of loginWithUsername.
 */
async function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    authRateLimit: {
      findUnique: jest.fn().mockResolvedValue(null), // not blocked by default
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    authAuditLog: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
    ...prismaOverrides,
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue("signed-jwt"),
    verifyAsync: jest.fn(),
  };
  const configService = { get: jest.fn().mockReturnValue(null) };
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

  // Stub private helpers that are side-effects or orthogonal to the branch
  // under test.
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

  return { service, prisma };
}

function makeActiveUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    username: "jeandupont",
    email: "jean@ecole.cm",
    passwordHash: null as string | null,
    mustChangePassword: false,
    profileCompleted: true,
    activationStatus: "ACTIVE",
    platformRoles: [] as Array<{ role: string }>,
    phoneCredential: { verifiedAt: new Date() },
    memberships: [
      {
        schoolId: "school-1",
        school: { id: "school-1", slug: "ecole-pilote" },
      },
    ],
    ...overrides,
  };
}

describe("AuthService.loginWithUsername — succès", () => {
  it("retourne un AuthResponse avec accessToken quand les credentials sont valides", async () => {
    const { service, prisma } = await makeService();
    const passwordHash = await bcrypt.hash("ValidPass1", 10);
    const user = makeActiveUser({ passwordHash });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    // stub issueAuthSession
    (service as never as { issueAuthSession: jest.Mock }).issueAuthSession =
      jest.fn().mockReturnValue({ accessToken: "tok", user });

    const result = await service.loginWithUsername("jeandupont", "ValidPass1");

    expect(result).toHaveProperty("accessToken", "tok");
    expect(
      (service as never as { issueAuthSession: jest.Mock }).issueAuthSession,
    ).toHaveBeenCalledWith(user, "ecole-pilote");
  });
});

describe("AuthService.loginWithUsername — username inexistant", () => {
  it("lève UnauthorizedException et appelle recordAuthFailure", async () => {
    const { service, prisma } = await makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.loginWithUsername("nobody", "Pass1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      (service as never as { recordAuthFailure: jest.Mock }).recordAuthFailure,
    ).toHaveBeenCalled();
  });
});

describe("AuthService.loginWithUsername — passwordHash null", () => {
  it("lève UnauthorizedException quand passwordHash est null", async () => {
    const { service, prisma } = await makeService();
    const user = makeActiveUser({ passwordHash: null });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    await expect(
      service.loginWithUsername("jeandupont", "AnyPass1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      (service as never as { recordAuthFailure: jest.Mock }).recordAuthFailure,
    ).toHaveBeenCalled();
  });
});

describe("AuthService.loginWithUsername — mauvais mot de passe", () => {
  it("lève UnauthorizedException et appelle recordAuthFailure", async () => {
    const { service, prisma } = await makeService();
    const passwordHash = await bcrypt.hash("CorrectPass1", 10);
    const user = makeActiveUser({ passwordHash });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    await expect(
      service.loginWithUsername("jeandupont", "WrongPass1"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      (service as never as { recordAuthFailure: jest.Mock }).recordAuthFailure,
    ).toHaveBeenCalled();
  });
});

describe("AuthService.loginWithUsername — mustChangePassword", () => {
  it("lève ForbiddenException avec code PASSWORD_CHANGE_REQUIRED", async () => {
    const { service, prisma } = await makeService();
    const passwordHash = await bcrypt.hash("TempPass1", 10);
    const user = makeActiveUser({ passwordHash, mustChangePassword: true });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    let thrownError: unknown;
    try {
      await service.loginWithUsername("jeandupont", "TempPass1");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ForbiddenException);
    const response = (thrownError as ForbiddenException).getResponse() as {
      code: string;
    };
    expect(response.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });
});

describe("AuthService.loginWithUsername — compte SUSPENDED", () => {
  it("lève ForbiddenException avec code ACCOUNT_VALIDATION_REQUIRED", async () => {
    const { service, prisma } = await makeService();
    const passwordHash = await bcrypt.hash("ValidPass1", 10);
    const user = makeActiveUser({
      passwordHash,
      activationStatus: "SUSPENDED",
      mustChangePassword: false,
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

    let thrownError: unknown;
    try {
      await service.loginWithUsername("jeandupont", "ValidPass1");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ForbiddenException);
    const response = (thrownError as ForbiddenException).getResponse() as {
      code: string;
    };
    expect(response.code).toBe("ACCOUNT_VALIDATION_REQUIRED");
  });
});

describe("AuthService.loginWithUsername — rate limit déjà bloqué", () => {
  it("lève avant même la query Prisma quand assertNotRateLimited rejette", async () => {
    const { service, prisma } = await makeService();

    // Override the stub to simulate an active block
    (
      service as never as { assertNotRateLimited: jest.Mock }
    ).assertNotRateLimited = jest
      .fn()
      .mockRejectedValue(
        new HttpException(
          { code: "AUTH_RATE_LIMITED", retryAt: new Date().toISOString() },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

    await expect(
      service.loginWithUsername("jeandupont", "AnyPass1"),
    ).rejects.toBeInstanceOf(HttpException);

    // Prisma should never have been called
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
