import { ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { AuthService } from "../src/auth/auth.service";

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "user-1" }),
    },
    userPhoneCredential: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue({ id: "cred-1" }),
    },
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    authAuditLog: {
      create: jest.fn().mockResolvedValue({ id: "audit-1" }),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: { update: jest.fn().mockResolvedValue({ id: "user-1" }) },
        userPhoneCredential: {
          upsert: jest.fn().mockResolvedValue({ id: "cred-1" }),
        },
        refreshToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    ),
    ...prismaOverrides,
  };

  const jwtService = new JwtService({ secret: "dev-secret-change-me" });

  const service = new AuthService(
    prisma as never,
    jwtService,
    { get: jest.fn().mockReturnValue(null) } as never,
    {} as never,
  );

  return { service, prisma, jwtService };
}

describe("AuthService PIN recovery codes", () => {
  function buildUser(overrides: Record<string, unknown> = {}) {
    return {
      id: "user-1",
      email: "user@example.test",
      phone: "+237600000020",
      recoveryBirthDate: new Date("2005-01-15T00:00:00.000Z"),
      memberships: [{ schoolId: "school-1", school: { slug: "ecole-demo" } }],
      recoveryAnswers: [],
      phoneCredential: { phoneE164: "+237600000020" },
      ...overrides,
    };
  }

  it("resolveUserForPinRecovery (via getPinRecoveryOptions) lève ForbiddenException avec code RECOVERY_INVALID si le compte est inconnu", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getPinRecoveryOptions({ email: "ghost@example.test" }),
    ).rejects.toMatchObject({
      response: { code: "RECOVERY_INVALID" },
    });
  });

  it("resolveUserForPinRecovery lève ForbiddenException avec code RECOVERY_INVALID si aucune question de récupération n'est configurée", async () => {
    const { service, prisma } = makeService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(
      buildUser({ recoveryAnswers: [] }),
    );

    await expect(
      service.getPinRecoveryOptions({ email: "user@example.test" }),
    ).rejects.toMatchObject({
      response: { code: "RECOVERY_INVALID" },
    });
  });

  it("verifyPinRecovery lève ForbiddenException avec code RECOVERY_INVALID si une réponse est invalide", async () => {
    const { service, prisma } = makeService();
    const answerHash1 = await bcrypt.hash("alpha", 10);
    const answerHash2 = await bcrypt.hash("bravo", 10);
    const answerHash3 = await bcrypt.hash("charlie", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(
      buildUser({
        recoveryAnswers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answerHash: answerHash1 },
          { questionKey: "FATHER_FIRST_NAME", answerHash: answerHash2 },
          { questionKey: "FAVORITE_SPORT", answerHash: answerHash3 },
        ],
      }),
    );

    await expect(
      service.verifyPinRecovery({
        email: "user@example.test",
        birthDate: "2005-01-15",
        answers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "wrong" },
          { questionKey: "FATHER_FIRST_NAME", answer: "bravo" },
          { questionKey: "FAVORITE_SPORT", answer: "charlie" },
        ],
      }),
    ).rejects.toMatchObject({
      response: { code: "RECOVERY_INVALID" },
    });
  });

  it("verifyPinRecovery retourne un recoveryToken après vérification valide", async () => {
    const { service, prisma } = makeService();
    const answerHash1 = await bcrypt.hash("alpha", 10);
    const answerHash2 = await bcrypt.hash("bravo", 10);
    const answerHash3 = await bcrypt.hash("charlie", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(
      buildUser({
        recoveryAnswers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answerHash: answerHash1 },
          { questionKey: "FATHER_FIRST_NAME", answerHash: answerHash2 },
          { questionKey: "FAVORITE_SPORT", answerHash: answerHash3 },
        ],
      }),
    );

    const result = await service.verifyPinRecovery({
      email: "user@example.test",
      birthDate: "2005-01-15",
      answers: [
        { questionKey: "MOTHER_MAIDEN_NAME", answer: "alpha" },
        { questionKey: "FATHER_FIRST_NAME", answer: "bravo" },
        { questionKey: "FAVORITE_SPORT", answer: "charlie" },
      ],
    });

    expect(result.success).toBe(true);
    expect(typeof result.recoveryToken).toBe("string");
  });

  it("completePinRecovery lève ForbiddenException avec code RECOVERY_SESSION_EXPIRED si le jeton est invalide ou expiré", async () => {
    const { service } = makeService();

    await expect(
      service.completePinRecovery("not-a-jwt", "654321"),
    ).rejects.toMatchObject({
      response: { code: "RECOVERY_SESSION_EXPIRED" },
    });

    const error = await service
      .completePinRecovery("not-a-jwt", "654321")
      .catch((err) => err);
    expect(error).toBeInstanceOf(ForbiddenException);
  });

  it("completePinRecovery lève ForbiddenException avec code SAME_PIN si le nouveau PIN est identique à l'actuel", async () => {
    const { service, prisma, jwtService } = makeService();
    const pinHash = await bcrypt.hash("654321", 10);
    const recoveryToken = jwtService.sign(
      { purpose: "PIN_RECOVERY" },
      { subject: "user-1", expiresIn: "15m" },
    );

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      phone: "+237600000020",
      phoneCredential: {
        id: "cred-1",
        phoneE164: "+237600000020",
        pinHash,
      },
      memberships: [{ school: { id: "school-1", slug: "ecole-demo" } }],
    });

    await expect(
      service.completePinRecovery(recoveryToken, "654321"),
    ).rejects.toMatchObject({
      response: { code: "SAME_PIN" },
    });
  });
});
