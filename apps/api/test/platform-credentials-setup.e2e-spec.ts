import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonValue = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function buildCookieHeader(response: Response) {
  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const rawSetCookies = getSetCookie
    ? getSetCookie.call(response.headers)
    : [response.headers.get("set-cookie") ?? ""].filter(Boolean);

  return rawSetCookies.map((entry) => entry.split(";")[0]).join("; ");
}

describe("Platform credentials setup API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const platformEmail = `e2e-platform-credentials-${runId}@example.test`;
  const tempPassword = "TempPass11";
  const finalPassword = "FinalPass22";
  const finalPhone = "650999888";
  const finalPin = "112233";
  const providerAccountId = `google-platform-${runId}`;

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
          startsWith: "e2e-platform-credentials-",
        },
      },
    });

    const user = await prisma.user.create({
      data: {
        email: platformEmail,
        firstName: "Platform",
        lastName: "Admin",
        gender: "M",
        phone: "+237650999777",
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
        profileCompleted: true,
        platformRoles: {
          create: [{ role: "SUPER_ADMIN" }],
        },
      },
    });

    await prisma.userAuthIdentity.create({
      data: {
        userId: user.id,
        provider: "GOOGLE",
        providerAccountId,
        email: platformEmail,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-platform-credentials-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("blocks password login until platform credentials are completed", async () => {
    const login = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: platformEmail,
        password: tempPassword,
      }),
    });

    expect(login.response.status).toBe(403);
    expect(extractErrorCode(login.body)).toBe(
      "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    );
    const token =
      ((login.body?.message as JsonValue | undefined)?.setupToken as
        | string
        | undefined) ?? (login.body?.setupToken as string | undefined);
    expect(typeof token).toBe("string");
    expect((token ?? "").length).toBeGreaterThan(20);
  });

  it("completes platform credentials setup then allows password and phone+PIN login", async () => {
    const ssoLogin = await apiJson("/api/auth/sso/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "GOOGLE",
        providerAccountId,
        email: platformEmail,
      }),
    });

    expect(ssoLogin.response.status).toBe(403);
    expect(extractErrorCode(ssoLogin.body)).toBe(
      "PLATFORM_CREDENTIAL_SETUP_REQUIRED",
    );
    const setupToken =
      ((ssoLogin.body?.message as JsonValue | undefined)?.setupToken as
        | string
        | undefined) ?? (ssoLogin.body?.setupToken as string | undefined);
    expect(typeof setupToken).toBe("string");

    const complete = await apiJson("/api/auth/platform-credentials/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: setupToken,
        newPassword: finalPassword,
        phone: finalPhone,
        newPin: finalPin,
      }),
    });

    expect(complete.response.status).toBe(201);
    expect(complete.body?.success).toBe(true);
    expect(typeof complete.body?.accessToken).toBe("string");

    const cookieHeader = buildCookieHeader(complete.response);
    expect(cookieHeader).toContain("school_live_access_token=");
    expect(cookieHeader).toContain("school_live_refresh_token=");

    const me = await apiJson("/api/me", {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
    });
    expect(me.response.status).toBe(200);
    expect(me.body?.email).toBe(platformEmail);
    expect(me.body?.role).toBe("SUPER_ADMIN");

    const reloginPassword = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: platformEmail,
        password: finalPassword,
      }),
    });
    expect(reloginPassword.response.status).toBe(201);
    expect(typeof reloginPassword.body?.accessToken).toBe("string");

    const reloginPhone = await apiJson("/api/auth/login-phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: finalPhone,
        pin: finalPin,
      }),
    });
    expect(reloginPhone.response.status).toBe(201);
    expect(typeof reloginPhone.body?.accessToken).toBe("string");
  });
});
