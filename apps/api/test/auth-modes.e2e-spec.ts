import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { createHash } from "crypto";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonValue = Record<string, unknown>;

function extractErrorCode(body: JsonValue | null | undefined) {
  const direct = body?.code;
  if (typeof direct === "string") {
    return direct;
  }

  const message = body?.message;
  if (message && typeof message === "object") {
    const nested = (message as JsonValue).code;
    if (typeof nested === "string") {
      return nested;
    }
  }

  return null;
}

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashActivationCode(code: string) {
  const pepper =
    process.env.ACTIVATION_CODE_PEPPER ??
    "dev-activation-code-pepper-change-me";
  return createHash("sha256").update(`${code}:${pepper}`).digest("hex");
}

describe("Authentication modes API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-auth-${runId}`;

  const passwordUserEmail = `e2e-auth-password-${runId}@example.test`;
  const phoneUserEmail = `e2e-auth-phone-${runId}@example.test`;
  const pendingUserEmail = `e2e-auth-pending-${runId}@example.test`;
  const ssoReadyEmail = `e2e-auth-sso-ready-${runId}@example.test`;
  const ssoMissingEmail = `e2e-auth-sso-missing-${runId}@example.test`;
  const unknownSsoEmail = `e2e-auth-sso-unknown-${runId}@example.test`;
  const phoneRateLimitEmail = `e2e-auth-phone-limit-${runId}@example.test`;
  const pinRecoveryEmail = `e2e-auth-pin-recovery-${runId}@example.test`;

  const password = "StrongPass9";
  const wrongPassword = "WrongPass9";
  const phonePin = "123456";

  let schoolId = "";
  let pendingUserId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonValue | null;
    return { response, body };
  }

  beforeAll(async () => {
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
          startsWith: "e2e-auth-",
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        slug: {
          startsWith: "e2e-auth-",
        },
      },
    });

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Auth ${runId}`,
      },
    });
    schoolId = school.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(phonePin, 10);

    await prisma.user.create({
      data: {
        email: passwordUserEmail,
        firstName: "Password",
        lastName: "User",
        gender: "M",
        phone: "+237600000001",
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "TEACHER" }],
        },
      },
    });

    const phoneUser = await prisma.user.create({
      data: {
        email: phoneUserEmail,
        firstName: "Phone",
        lastName: "User",
        gender: "F",
        phone: "+237600000002",
        phoneConfirmedAt: new Date(),
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userPhoneCredential.create({
      data: {
        userId: phoneUser.id,
        phoneE164: "+237600000002",
        pinHash,
        verifiedAt: new Date(),
      },
    });

    const pendingUser = await prisma.user.create({
      data: {
        email: pendingUserEmail,
        firstName: "Pending",
        lastName: "User",
        gender: "M",
        phone: "+237600000003",
        activationStatus: "PENDING",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userPhoneCredential.create({
      data: {
        userId: pendingUser.id,
        phoneE164: "+237600000003",
        pinHash,
        verifiedAt: new Date(),
      },
    });
    pendingUserId = pendingUser.id;

    const ssoReadyUser = await prisma.user.create({
      data: {
        email: ssoReadyEmail,
        firstName: "Sso",
        lastName: "Ready",
        gender: "F",
        phone: "+237600000004",
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "TEACHER" }],
        },
      },
    });

    await prisma.userAuthIdentity.create({
      data: {
        userId: ssoReadyUser.id,
        provider: "GOOGLE",
        providerAccountId: `google-ready-${runId}`,
        email: ssoReadyEmail,
      },
    });

    const ssoMissing = await prisma.user.create({
      data: {
        email: ssoMissingEmail,
        firstName: "Sso",
        lastName: "Missing",
        gender: null,
        phone: null,
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userAuthIdentity.create({
      data: {
        userId: ssoMissing.id,
        provider: "GOOGLE",
        providerAccountId: `google-missing-${runId}`,
        email: ssoMissingEmail,
      },
    });

    const phoneRateLimitUser = await prisma.user.create({
      data: {
        email: phoneRateLimitEmail,
        firstName: "Phone",
        lastName: "RateLimit",
        gender: "F",
        phone: "+237600000010",
        phoneConfirmedAt: new Date(),
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userPhoneCredential.create({
      data: {
        userId: phoneRateLimitUser.id,
        phoneE164: "+237600000010",
        pinHash,
        verifiedAt: new Date(),
      },
    });

    const pinRecoveryUser = await prisma.user.create({
      data: {
        email: pinRecoveryEmail,
        firstName: "Pin",
        lastName: "Recovery",
        gender: "F",
        phone: "+237600000020",
        phoneConfirmedAt: new Date(),
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        recoveryBirthDate: new Date("1990-05-15T00:00:00.000Z"),
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userPhoneCredential.create({
      data: {
        userId: pinRecoveryUser.id,
        phoneE164: "+237600000020",
        pinHash,
        verifiedAt: new Date(),
      },
    });

    await prisma.userRecoveryAnswer.createMany({
      data: [
        {
          userId: pinRecoveryUser.id,
          questionKey: "MOTHER_MAIDEN_NAME",
          answerHash: await bcrypt.hash("alpha", 10),
        },
        {
          userId: pinRecoveryUser.id,
          questionKey: "FATHER_FIRST_NAME",
          answerHash: await bcrypt.hash("bravo", 10),
        },
        {
          userId: pinRecoveryUser.id,
          questionKey: "FAVORITE_SPORT",
          answerHash: await bcrypt.hash("charlie", 10),
        },
      ],
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
            startsWith: "e2e-auth-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("authenticates with password and rejects invalid password", async () => {
    const ok = await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: passwordUserEmail, password }),
    });

    expect(ok.response.status).toBe(201);
    expect(typeof ok.body?.accessToken).toBe("string");

    const ko = await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: passwordUserEmail,
        password: wrongPassword,
      }),
    });

    expect(ko.response.status).toBe(401);
  });

  it("authenticates with phone + PIN and rejects invalid PIN", async () => {
    const ok = await apiJson(`/api/schools/${schoolSlug}/auth/login-phone`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+237600000002", pin: phonePin }),
    });

    expect(ok.response.status).toBe(201);
    expect(typeof ok.body?.accessToken).toBe("string");

    const ko = await apiJson(`/api/schools/${schoolSlug}/auth/login-phone`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+237600000002", pin: "654321" }),
    });

    expect(ko.response.status).toBe(401);
  });

  it("blocks school data access for pending users on phone login", async () => {
    const pending = await apiJson(
      `/api/schools/${schoolSlug}/auth/login-phone`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+237600000003", pin: phonePin }),
      },
    );

    expect(pending.response.status).toBe(403);
    expect(extractErrorCode(pending.body)).toBe("ACCOUNT_VALIDATION_REQUIRED");
  });

  it("authenticates with SSO and rejects unknown SSO accounts", async () => {
    const ok = await apiJson("/api/auth/sso/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-ready-${runId}`,
        email: ssoReadyEmail,
        schoolSlug,
      }),
    });

    expect(ok.response.status).toBe(201);
    expect(typeof ok.body?.accessToken).toBe("string");

    const unknown = await apiJson("/api/auth/sso/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-unknown-${runId}`,
        email: unknownSsoEmail,
        schoolSlug,
      }),
    });

    expect(unknown.response.status).toBe(401);
  });

  it("requires SSO profile completion then allows login", async () => {
    const firstTry = await apiJson("/api/auth/sso/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-missing-${runId}`,
        email: ssoMissingEmail,
        schoolSlug,
      }),
    });

    expect(firstTry.response.status).toBe(403);
    expect(extractErrorCode(firstTry.body)).toBe(
      "SSO_PROFILE_COMPLETION_REQUIRED",
    );

    const options = await apiJson("/api/auth/sso/profile/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-missing-${runId}`,
        email: ssoMissingEmail,
      }),
    });

    expect(options.response.status).toBe(201);
    expect(Array.isArray(options.body?.missingFields)).toBe(true);
    expect(options.body?.needsProfileCompletion).toBe(true);

    const complete = await apiJson("/api/auth/sso/profile/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-missing-${runId}`,
        email: ssoMissingEmail,
        firstName: "Sso",
        lastName: "Completed",
        gender: "F",
        phone: "+237600009999",
        schoolSlug,
        newPin: "654321",
      }),
    });

    expect(complete.response.status).toBe(201);
    expect(complete.body?.success).toBe(true);

    const secondTry = await apiJson("/api/auth/sso/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId: `google-missing-${runId}`,
        email: ssoMissingEmail,
        schoolSlug,
      }),
    });

    expect(secondTry.response.status).toBe(201);
    expect(typeof secondTry.body?.accessToken).toBe("string");
  });

  it("allows PIN change and rejects invalid current PIN", async () => {
    const login = await apiJson(`/api/schools/${schoolSlug}/auth/login-phone`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+237600000002", pin: phonePin }),
    });

    expect(login.response.status).toBe(201);
    const accessToken = String(login.body?.accessToken ?? "");
    expect(accessToken.length).toBeGreaterThan(10);

    const wrongCurrent = await apiJson("/api/auth/change-pin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPin: "000000", newPin: "222222" }),
    });
    expect(wrongCurrent.response.status).toBe(401);

    const ok = await apiJson("/api/auth/change-pin", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ currentPin: phonePin, newPin: "222222" }),
    });
    expect(ok.response.status).toBe(201);
    expect(ok.body?.success).toBe(true);

    const relogin = await apiJson(
      `/api/schools/${schoolSlug}/auth/login-phone`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+237600000002", pin: "222222" }),
      },
    );
    expect(relogin.response.status).toBe(201);
  });

  it("rate limits repeated invalid phone PIN attempts", async () => {
    for (let index = 0; index < 5; index += 1) {
      const attempt = await apiJson(
        `/api/schools/${schoolSlug}/auth/login-phone`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: "+237600000010", pin: "000000" }),
        },
      );
      expect(attempt.response.status).toBe(401);
    }

    const blocked = await apiJson(
      `/api/schools/${schoolSlug}/auth/login-phone`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+237600000010", pin: phonePin }),
      },
    );

    expect(blocked.response.status).toBe(429);
    expect(extractErrorCode(blocked.body)).toBe("AUTH_RATE_LIMITED");
  });

  it("creates audit entries for success and failure", async () => {
    await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: passwordUserEmail, password }),
    });
    await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: passwordUserEmail,
        password: wrongPassword,
      }),
    });

    const logs = await prisma.authAuditLog.findMany({
      where: {
        event: "LOGIN_PASSWORD",
        principal: passwordUserEmail,
      },
      select: {
        status: true,
      },
    });

    const statuses = new Set(logs.map((item) => item.status));
    expect(statuses.has("SUCCESS")).toBe(true);
    expect(statuses.has("FAILURE")).toBe(true);
  });

  it("invalidates older activation codes when activation succeeds", async () => {
    const now = new Date();
    const code1 = `C1${runId.slice(0, 6)}`.toUpperCase();
    const code2 = `C2${runId.slice(0, 6)}`.toUpperCase();

    await prisma.activationCode.createMany({
      data: [
        {
          userId: pendingUserId,
          schoolId,
          codeHash: hashActivationCode(code1),
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        },
        {
          userId: pendingUserId,
          schoolId,
          codeHash: hashActivationCode(code2),
          expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
      ],
    });

    const activated = await apiJson("/api/auth/activation/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: pendingUserEmail,
        schoolSlug,
        confirmedPhone: "+237600000003",
        newPin: "333333",
        activationCode: code2,
      }),
    });

    expect(activated.response.status).toBe(201);
    expect(activated.body?.success).toBe(true);

    const remaining = await prisma.activationCode.findMany({
      where: { userId: pendingUserId, schoolId },
      select: { usedAt: true },
    });
    expect(remaining.length).toBeGreaterThanOrEqual(2);
    expect(remaining.every((item) => item.usedAt instanceof Date)).toBe(true);
  });

  it("recovers forgotten PIN with recovery questions without email flow", async () => {
    const options = await apiJson("/api/auth/forgot-pin/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+237600000020" }),
    });
    expect(options.response.status).toBe(201);
    expect(Array.isArray(options.body?.questions)).toBe(true);

    const invalidVerify = await apiJson("/api/auth/forgot-pin/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "+237600000020",
        birthDate: "1990-05-15",
        answers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "wrong" },
          { questionKey: "FATHER_FIRST_NAME", answer: "bravo" },
          { questionKey: "FAVORITE_SPORT", answer: "charlie" },
        ],
      }),
    });
    expect(invalidVerify.response.status).toBe(403);

    const verify = await apiJson("/api/auth/forgot-pin/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: "+237600000020",
        birthDate: "1990-05-15",
        answers: [
          { questionKey: "MOTHER_MAIDEN_NAME", answer: "alpha" },
          { questionKey: "FATHER_FIRST_NAME", answer: "bravo" },
          { questionKey: "FAVORITE_SPORT", answer: "charlie" },
        ],
      }),
    });
    expect(verify.response.status).toBe(201);
    const recoveryToken = String(verify.body?.recoveryToken ?? "");
    expect(recoveryToken.length).toBeGreaterThan(10);

    const complete = await apiJson("/api/auth/forgot-pin/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recoveryToken,
        newPin: "777777",
      }),
    });
    expect(complete.response.status).toBe(201);
    expect(complete.body?.success).toBe(true);

    const relogin = await apiJson(
      `/api/schools/${schoolSlug}/auth/login-phone`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "+237600000020", pin: "777777" }),
      },
    );
    expect(relogin.response.status).toBe(201);
  });
});
