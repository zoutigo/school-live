import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "user-1" }),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "prt-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: "prt-1" }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: "prt-1" }),
        },
      }),
    ),
    ...prismaOverrides,
  };

  const service = new AuthService(
    prisma as never,
    { signAsync: jest.fn(), verifyAsync: jest.fn() } as never,
    { get: jest.fn().mockReturnValue(null) } as never,
    {} as never,
  );

  return { service, prisma };
}

describe("AuthService username recovery", () => {
  it("startUsernameRecovery retourne noQuestions si aucune question n'est configurée", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "amina42",
      recoveryBirthDate: null,
      recoveryAnswers: [],
      memberships: [],
    });

    await expect(service.startUsernameRecovery("amina42")).resolves.toEqual({
      questions: [],
      noQuestions: true,
    });
  });

  it("startUsernameRecovery lève NotFoundException avec code USER_NOT_FOUND si le username est inconnu", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.startUsernameRecovery("ghost")).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(service.startUsernameRecovery("ghost")).rejects.toMatchObject({
      response: { code: "USER_NOT_FOUND" },
    });
  });

  it("verifyUsernameRecovery retourne un recoveryToken après vérification", async () => {
    const { service, prisma } = makeService();
    const answerHash1 = await bcrypt.hash("abena", 10);
    const answerHash2 = await bcrypt.hash("douala", 10);
    const answerHash3 = await bcrypt.hash("basket", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "amina42",
      recoveryBirthDate: new Date("2005-01-15T00:00:00.000Z"),
      memberships: [{ school: { slug: "ecole-demo" } }],
      recoveryAnswers: [
        { questionKey: "MOTHER_MAIDEN_NAME", answerHash: answerHash1 },
        { questionKey: "BIRTH_CITY", answerHash: answerHash2 },
        { questionKey: "FAVORITE_SPORT", answerHash: answerHash3 },
      ],
    });

    const result = await service.verifyUsernameRecovery({
      username: "amina42",
      birthDate: "2005-01-15",
      answers: [
        { questionKey: "MOTHER_MAIDEN_NAME", answer: "Abena" },
        { questionKey: "BIRTH_CITY", answer: "Douala" },
        { questionKey: "FAVORITE_SPORT", answer: "Basket" },
      ],
    });

    expect(result.success).toBe(true);
    expect(typeof result.recoveryToken).toBe("string");
    expect(result.recoveryToken.length).toBeGreaterThan(10);
  });

  it("verifyUsernameRecovery lève ForbiddenException si une réponse est invalide", async () => {
    const { service, prisma } = makeService();
    const answerHash1 = await bcrypt.hash("abena", 10);
    const answerHash2 = await bcrypt.hash("douala", 10);
    const answerHash3 = await bcrypt.hash("basket", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "amina42",
      recoveryBirthDate: new Date("2005-01-15T00:00:00.000Z"),
      memberships: [{ school: { slug: "ecole-demo" } }],
      recoveryAnswers: [
        { questionKey: "MOTHER_MAIDEN_NAME", answerHash: answerHash1 },
        { questionKey: "BIRTH_CITY", answerHash: answerHash2 },
        { questionKey: "FAVORITE_SPORT", answerHash: answerHash3 },
      ],
    });

    await expect(
      service.verifyUsernameRecovery({
        username: "amina42",
        birthDate: "2005-01-15",
        answers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "Wrong" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Basket" },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("startUsernameRecovery retourne les questions quand l'utilisateur en a configuré 3", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "amina42",
      recoveryBirthDate: new Date("2005-01-15"),
      recoveryAnswers: [
        { questionKey: "BIRTH_CITY" },
        { questionKey: "FAVORITE_SPORT" },
        { questionKey: "MOTHER_MAIDEN_NAME" },
      ],
      memberships: [{ school: { slug: "ecole-demo" } }],
    });

    const result = await service.startUsernameRecovery("AMINA42");

    expect(result.noQuestions).toBe(false);
    expect(result.questions).toHaveLength(3);
    expect(result.questions[0]).toHaveProperty("key");
    expect(result.questions[0]).toHaveProperty("label");
  });

  it("startUsernameRecovery normalise l'identifiant en minuscules pour la recherche", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.startUsernameRecovery("GHOST_USER"),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: "ghost_user" },
      }),
    );
  });

  it("verifyUsernameRecovery lève ForbiddenException si la date de naissance est incorrecte", async () => {
    const { service, prisma } = makeService();
    const answerHash1 = await bcrypt.hash("abena", 10);
    const answerHash2 = await bcrypt.hash("douala", 10);
    const answerHash3 = await bcrypt.hash("basket", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      username: "amina42",
      recoveryBirthDate: new Date("2005-01-15T00:00:00.000Z"),
      memberships: [{ school: { slug: "ecole-demo" } }],
      recoveryAnswers: [
        { questionKey: "MOTHER_MAIDEN_NAME", answerHash: answerHash1 },
        { questionKey: "BIRTH_CITY", answerHash: answerHash2 },
        { questionKey: "FAVORITE_SPORT", answerHash: answerHash3 },
      ],
    });

    await expect(
      service.verifyUsernameRecovery({
        username: "amina42",
        birthDate: "1990-06-01",
        answers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "Abena" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Basket" },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("verifyUsernameRecovery lève ForbiddenException si le username est inconnu", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    // L'implémentation masque l'information pour éviter l'énumération des comptes
    await expect(
      service.verifyUsernameRecovery({
        username: "ghost",
        birthDate: "2005-01-15",
        answers: [
          { questionKey: "BIRTH_CITY", answer: "Yaoundé" },
          { questionKey: "FAVORITE_SPORT", answer: "Foot" },
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "Dupont" },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("completeUsernameRecovery délègue à completePasswordReset avec le même token et mot de passe", async () => {
    const { service } = makeService();
    const spy = jest
      .spyOn(service as never, "completePasswordReset" as never)
      .mockResolvedValueOnce(undefined as never);

    await service.completeUsernameRecovery("my-token", "NewPass1");

    expect(spy).toHaveBeenCalledWith("my-token", "NewPass1");
  });
});

describe("AuthService password reset token codes", () => {
  function buildResetToken(overrides: Record<string, unknown> = {}) {
    return {
      id: "prt-1",
      userId: "user-1",
      usedAt: null,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "user-1",
        passwordHash: null,
        recoveryBirthDate: new Date("2005-01-15T00:00:00.000Z"),
        memberships: [],
        recoveryAnswers: [],
      },
      ...overrides,
    };
  }

  it("getValidPasswordResetToken lève UnauthorizedException avec code TOKEN_INVALID si le token est inconnu", async () => {
    const { service, prisma } = makeService();
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.completePasswordReset("unknown-token", "NewPass1"),
    ).rejects.toMatchObject({
      response: { code: "TOKEN_INVALID" },
    });
  });

  it("getValidPasswordResetToken lève UnauthorizedException avec code TOKEN_INVALID si le token a déjà été utilisé", async () => {
    const { service, prisma } = makeService();
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(
      buildResetToken({ usedAt: new Date() }),
    );

    await expect(
      service.completePasswordReset("used-token", "NewPass1"),
    ).rejects.toMatchObject({
      response: { code: "TOKEN_INVALID" },
    });
  });

  it("getValidPasswordResetToken lève UnauthorizedException avec code TOKEN_EXPIRED si le token a expiré", async () => {
    const { service, prisma } = makeService();
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(
      buildResetToken({ expiresAt: new Date(Date.now() - 60_000) }),
    );

    await expect(
      service.completePasswordReset("expired-token", "NewPass1"),
    ).rejects.toMatchObject({
      response: { code: "TOKEN_EXPIRED" },
    });

    const error = await service
      .completePasswordReset("expired-token", "NewPass1")
      .catch((err) => err);
    expect(error).toBeInstanceOf(UnauthorizedException);
  });

  it("completePasswordReset lève ForbiddenException avec code SAME_PASSWORD si le mot de passe est inchangé", async () => {
    const { service, prisma } = makeService();
    const passwordHash = await bcrypt.hash("Secret123", 10);
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(
      buildResetToken({ user: { passwordHash } }),
    );

    await expect(
      service.completePasswordReset("valid-token", "Secret123"),
    ).rejects.toMatchObject({
      response: { code: "SAME_PASSWORD" },
    });

    const error = await service
      .completePasswordReset("valid-token", "Secret123")
      .catch((err) => err);
    expect(error).toBeInstanceOf(ForbiddenException);
  });

  it("verifyPasswordReset lève ForbiddenException avec code RECOVERY_INVALID si la date de naissance ne correspond pas", async () => {
    const { service, prisma } = makeService();
    (prisma.passwordResetToken.findFirst as jest.Mock).mockResolvedValue(
      buildResetToken(),
    );

    await expect(
      service.verifyPasswordReset({
        token: "valid-token",
        birthDate: "1990-01-01",
        answers: [
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Basket" },
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "Abena" },
        ],
      }),
    ).rejects.toMatchObject({
      response: { code: "RECOVERY_INVALID" },
    });
  });
});
