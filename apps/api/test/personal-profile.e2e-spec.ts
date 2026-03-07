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

describe("Personal profile API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const email = `e2e-personal-profile-${runId}@example.test`;
  const password = "StrongPass9";
  const pin = "123456";

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
          startsWith: "e2e-personal-profile-",
        },
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        firstName: "Initial",
        lastName: "Name",
        gender: "M",
        phone: "+237650111111",
        phoneConfirmedAt: new Date(),
        passwordHash: await bcrypt.hash(password, 10),
        mustChangePassword: false,
        profileCompleted: true,
        platformRoles: {
          create: [{ role: "SUPER_ADMIN" }],
        },
      },
    });

    await prisma.userPhoneCredential.create({
      data: {
        userId: user.id,
        phoneE164: "+237650111111",
        pinHash: await bcrypt.hash(pin, 10),
        verifiedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-personal-profile-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("updates personal profile and keeps phone credential in sync", async () => {
    const login = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.response.status).toBe(201);
    const accessToken = String(login.body?.accessToken ?? "");

    const update = await apiJson("/api/me/profile", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        firstName: "Zoutigo",
        lastName: "SuperAdmin",
        gender: "F",
        phone: "650597838",
      }),
    });

    expect(update.response.status).toBe(200);
    expect(update.body?.firstName).toBe("Zoutigo");
    expect(update.body?.lastName).toBe("SuperAdmin");
    expect(update.body?.gender).toBe("F");
    expect(update.body?.phone).toBe("+237650597838");

    const updated = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { phoneCredential: true },
    });
    expect(updated.phone).toBe("+237650597838");
    expect(updated.phoneCredential?.phoneE164).toBe("+237650597838");

    const loginPhone = await apiJson("/api/auth/login-phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "650597838", pin }),
    });
    expect(loginPhone.response.status).toBe(201);
  });
});
