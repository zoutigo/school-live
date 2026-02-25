import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonValue = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("Forgot password API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-forgot-${runId}`;
  const schoolName = `E2E Forgot ${runId}`;
  const userEmail = `e2e-forgot-user-${runId}@example.test`;
  const unknownEmail = `e2e-forgot-unknown-${runId}@example.test`;
  const initialPassword = "InitialPass9";
  const nextPassword = "RecoveredPass9";
  const birthDate = "1985-07-14";

  let schoolId = "";
  let userId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonValue | null;
    return { response, body };
  }

  async function requestResetToken() {
    const { response, body } = await apiJson(
      "/api/auth/forgot-password/request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      },
    );

    expect(response.status).toBe(201);
    expect(body?.success).toBe(true);
    expect(typeof body?.resetToken).toBe("string");
    return String(body?.resetToken ?? "");
  }

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);

    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: "e2e-forgot-",
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        slug: {
          startsWith: "e2e-forgot-",
        },
      },
    });

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: schoolName,
      },
    });
    schoolId = school.id;

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        firstName: "Parent",
        lastName: "Mbella",
        passwordHash,
        profileCompleted: true,
        mustChangePassword: false,
        recoveryBirthDate: new Date(`${birthDate}T00:00:00.000Z`),
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });
    userId = user.id;

    const answerRows = await Promise.all(
      [
        { questionKey: "BIRTH_CITY", answer: "douala" },
        { questionKey: "FAVORITE_SPORT", answer: "football" },
        { questionKey: "FATHER_FIRST_NAME", answer: "andre" },
      ].map(async (entry) => ({
        userId,
        questionKey: entry.questionKey as
          | "BIRTH_CITY"
          | "FAVORITE_SPORT"
          | "FATHER_FIRST_NAME",
        answerHash: await bcrypt.hash(entry.answer, 10),
      })),
    );

    await prisma.userRecoveryAnswer.createMany({ data: answerRows });

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: `e2e-forgot-refresh-${runId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-forgot-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("returns a generic success for unknown email", async () => {
    const { response, body } = await apiJson(
      "/api/auth/forgot-password/request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unknownEmail }),
      },
    );

    expect(response.status).toBe(201);
    expect(body?.success).toBe(true);
    expect(body?.message).toBe(
      "Si ce compte existe, un lien de reinitialisation a ete envoye.",
    );
  });

  it("creates a reset token and exposes recovery questions", async () => {
    const token = await requestResetToken();

    const options = await apiJson("/api/auth/forgot-password/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    expect(options.response.status).toBe(201);
    expect(options.body?.success).toBe(true);
    expect(Array.isArray(options.body?.questions)).toBe(true);
    expect((options.body?.questions as unknown[]).length).toBe(3);
    expect(options.body?.schoolSlug).toBe(schoolSlug);
  });

  it("rejects invalid or expired tokens", async () => {
    const invalid = await apiJson("/api/auth/forgot-password/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token-value" }),
    });

    expect(invalid.response.status).toBe(401);

    const expiredRaw = `expired-${runId}`;
    const pepper =
      process.env.PASSWORD_RESET_TOKEN_PEPPER ??
      "dev-password-reset-pepper-change-me";
    const expiredHash = createHash("sha256")
      .update(`${expiredRaw}:${pepper}`)
      .digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: expiredHash,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const expired = await apiJson("/api/auth/forgot-password/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: expiredRaw }),
    });

    expect(expired.response.status).toBe(401);
  });

  it("rejects verify step when recovery data is incorrect", async () => {
    const token = await requestResetToken();

    const wrongBirthDate = await apiJson("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        birthDate: "1980-01-01",
        answers: [
          { questionKey: "BIRTH_CITY", answer: "douala" },
          { questionKey: "FAVORITE_SPORT", answer: "football" },
          { questionKey: "FATHER_FIRST_NAME", answer: "andre" },
        ],
      }),
    });

    expect(wrongBirthDate.response.status).toBe(403);

    const wrongAnswer = await apiJson("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        birthDate,
        answers: [
          { questionKey: "BIRTH_CITY", answer: "yaounde" },
          { questionKey: "FAVORITE_SPORT", answer: "football" },
          { questionKey: "FATHER_FIRST_NAME", answer: "andre" },
        ],
      }),
    });

    expect(wrongAnswer.response.status).toBe(403);
  });

  it("enforces verification before final reset", async () => {
    const token = await requestResetToken();

    const completeBeforeVerify = await apiJson(
      "/api/auth/forgot-password/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: nextPassword }),
      },
    );

    expect(completeBeforeVerify.response.status).toBe(403);
  });

  it("completes reset after successful verification and revokes sessions", async () => {
    const token = await requestResetToken();

    const verify = await apiJson("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        birthDate,
        answers: [
          { questionKey: "BIRTH_CITY", answer: "douala" },
          { questionKey: "FAVORITE_SPORT", answer: "football" },
          { questionKey: "FATHER_FIRST_NAME", answer: "andre" },
        ],
      }),
    });

    expect(verify.response.status).toBe(201);
    expect(verify.body?.success).toBe(true);

    const complete = await apiJson("/api/auth/forgot-password/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: nextPassword }),
    });

    expect(complete.response.status).toBe(201);
    expect(complete.body?.success).toBe(true);

    const login = await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password: nextPassword }),
    });

    expect(login.response.status).toBe(201);
    expect(login.body?.accessToken).toEqual(expect.any(String));

    const activeRefreshTokens = await prisma.refreshToken.count({
      where: { userId, revokedAt: null },
    });
    expect(activeRefreshTokens).toBe(1);

    const usedToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(usedToken?.usedAt).not.toBeNull();

    const reused = await apiJson("/api/auth/forgot-password/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: "AnotherPass9" }),
    });

    expect(reused.response.status).toBe(401);
  });

  it("rejects weak new passwords", async () => {
    const token = await requestResetToken();

    const verify = await apiJson("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        birthDate,
        answers: [
          { questionKey: "BIRTH_CITY", answer: "douala" },
          { questionKey: "FAVORITE_SPORT", answer: "football" },
          { questionKey: "FATHER_FIRST_NAME", answer: "andre" },
        ],
      }),
    });

    expect(verify.response.status).toBe(201);

    const weak = await apiJson("/api/auth/forgot-password/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: "password" }),
    });

    expect(weak.response.status).toBe(400);
  });
});
