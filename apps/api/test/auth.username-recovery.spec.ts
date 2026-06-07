import { ForbiddenException, NotFoundException } from "@nestjs/common";
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

  it("startUsernameRecovery lève NotFoundException si le username est inconnu", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.startUsernameRecovery("ghost")).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
