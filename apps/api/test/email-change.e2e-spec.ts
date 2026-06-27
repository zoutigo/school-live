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

describe("Email change & link-sso API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const userEmail = `e2e-emailchange-${runId}@example.test`;
  const newEmail = `e2e-emailchange-new-${runId}@example.test`;
  const takenEmail = `e2e-emailchange-taken-${runId}@example.test`;
  const password = "TestPass123";
  let userId = "";
  let accessToken = "";
  let csrfToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const res = await api(path, init);
    const body = (await res.json().catch(() => null)) as JsonValue | null;
    return { response: res, body };
  }

  async function authedPost(path: string, body: unknown) {
    return apiJson(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(body),
    });
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
      where: { email: { startsWith: "e2e-emailchange-" } },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        firstName: "Test",
        lastName: "User",
        passwordHash,
        profileCompleted: true,
        mustChangePassword: false,
      },
    });
    userId = user.id;

    // Also create the "taken" email user
    await prisma.user.create({
      data: {
        email: takenEmail,
        firstName: "Other",
        lastName: "User",
        passwordHash,
        profileCompleted: true,
        mustChangePassword: false,
      },
    });

    // Login to get access token
    const loginRes = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, password }),
    });
    expect(loginRes.response.status).toBe(201);
    accessToken = String(loginRes.body?.accessToken ?? "");
    csrfToken = String(loginRes.body?.csrfToken ?? "");
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { startsWith: "e2e-emailchange-" } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  // ── requestEmailChange ────────────────────────────────────────────────────

  describe("POST /api/me/request-email-change", () => {
    it("rejects unauthenticated request", async () => {
      const { response } = await api("/api/me/request-email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      expect(response.status).toBe(401);
    });

    it("rejects invalid email format", async () => {
      const { response } = await authedPost("/api/me/request-email-change", {
        email: "not-an-email",
      });
      expect(response.status).toBe(400);
    });

    it("rejects same email as current", async () => {
      const { response, body } = await authedPost(
        "/api/me/request-email-change",
        { email: userEmail },
      );
      expect(response.status).toBe(403);
      expect(String(body?.message ?? "")).toContain("identique");
    });

    it("rejects email already taken by another user", async () => {
      const { response, body } = await authedPost(
        "/api/me/request-email-change",
        { email: takenEmail },
      );
      expect(response.status).toBe(403);
      expect(String(body?.message ?? "")).toContain("deja utilisee");
    });

    it("succeeds and creates a CHANGE_EMAIL verification token", async () => {
      const { response, body } = await authedPost(
        "/api/me/request-email-change",
        { email: newEmail },
      );
      expect(response.status).toBe(201);
      expect(body?.success).toBe(true);

      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId, purpose: "CHANGE_EMAIL", usedAt: null },
      });
      expect(token).not.toBeNull();
      expect(token?.email).toBe(newEmail);
    });
  });

  // ── confirmEmailChange ────────────────────────────────────────────────────

  describe("GET /api/auth/confirm-email-change", () => {
    let rawToken = "";

    beforeAll(async () => {
      // Create a fresh CHANGE_EMAIL token directly in DB
      const tokenRaw = "test-confirm-token-" + runId;
      rawToken = tokenRaw;
      const tokenHash = createHash("sha256").update(tokenRaw).digest("hex");

      await prisma.emailVerificationToken.deleteMany({
        where: { userId, purpose: "CHANGE_EMAIL" },
      });
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          email: newEmail,
          tokenHash,
          purpose: "CHANGE_EMAIL",
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    });

    it("rejects missing token", async () => {
      const { response } = await api("/api/auth/confirm-email-change", {});
      expect(response.status).toBe(403);
    });

    it("rejects wrong purpose token (ADD_EMAIL used as CHANGE_EMAIL)", async () => {
      const wrongRaw = "wrong-purpose-" + runId;
      const wrongHash = createHash("sha256").update(wrongRaw).digest("hex");
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          email: newEmail,
          tokenHash: wrongHash,
          purpose: "ADD_EMAIL",
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
      const { response } = await api(
        `/api/auth/confirm-email-change?token=${encodeURIComponent(wrongRaw)}`,
      );
      expect(response.status).toBe(403);
      await prisma.emailVerificationToken.deleteMany({
        where: { tokenHash: wrongHash },
      });
    });

    it("confirms email change and updates User.email + UserAuthIdentity.email", async () => {
      // Attach an SSO identity to verify it gets updated too
      await prisma.userAuthIdentity.create({
        data: {
          userId,
          provider: "GOOGLE",
          providerAccountId: `google-sub-${runId}`,
          email: userEmail,
        },
      });

      const { response, body } = await api(
        `/api/auth/confirm-email-change?token=${encodeURIComponent(rawToken)}`,
      );
      expect(response.status).toBe(200);
      expect(body?.success).toBe(true);

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.email).toBe(newEmail);

      const identity = await prisma.userAuthIdentity.findFirst({
        where: { userId },
      });
      expect(identity?.email).toBe(newEmail);

      const token = await prisma.emailVerificationToken.findFirst({
        where: { userId, purpose: "CHANGE_EMAIL" },
      });
      expect(token?.usedAt).not.toBeNull();
    });

    it("rejects token reuse after confirmation", async () => {
      const { response } = await api(
        `/api/auth/confirm-email-change?token=${encodeURIComponent(rawToken)}`,
      );
      expect(response.status).toBe(403);
    });

    afterAll(async () => {
      // Restore original email for other tests
      await prisma.user.update({
        where: { id: userId },
        data: { email: userEmail },
      });
    });
  });

  // ── linkSsoAccount ────────────────────────────────────────────────────────

  describe("POST /api/me/link-sso", () => {
    const providerAccountId = `link-sso-sub-${randomSuffix()}`;

    afterEach(async () => {
      await prisma.userAuthIdentity.deleteMany({ where: { userId } });
    });

    it("rejects unauthenticated request", async () => {
      const { response } = await api("/api/me/link-sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "GOOGLE",
          providerAccountId,
          email: userEmail,
        }),
      });
      expect(response.status).toBe(401);
    });

    it("rejects invalid provider", async () => {
      const { response } = await authedPost("/api/me/link-sso", {
        provider: "FACEBOOK",
        providerAccountId,
        email: userEmail,
      });
      expect(response.status).toBe(400);
    });

    it("creates identity on first link", async () => {
      const { response, body } = await authedPost("/api/me/link-sso", {
        provider: "GOOGLE",
        providerAccountId,
        email: userEmail,
      });
      expect(response.status).toBe(201);
      expect(body?.success).toBe(true);

      const identity = await prisma.userAuthIdentity.findUnique({
        where: {
          provider_providerAccountId: { provider: "GOOGLE", providerAccountId },
        },
      });
      expect(identity?.userId).toBe(userId);
    });

    it("rejects if providerAccountId already linked to another user", async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `e2e-emailchange-other2-${runId}@example.test`,
          firstName: "Other",
          lastName: "Two",
          profileCompleted: true,
        },
      });
      await prisma.userAuthIdentity.create({
        data: {
          userId: otherUser.id,
          provider: "GOOGLE",
          providerAccountId,
          email: "other2@test.com",
        },
      });

      const { response, body } = await authedPost("/api/me/link-sso", {
        provider: "GOOGLE",
        providerAccountId,
        email: userEmail,
      });
      expect(response.status).toBe(403);
      expect(String(body?.message ?? "")).toContain("autre utilisateur");

      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
