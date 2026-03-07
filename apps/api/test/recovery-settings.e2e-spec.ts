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

describe("Recovery settings API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-recovery-settings-${runId}`;
  const parentEmail = `e2e-recovery-parent-${runId}@example.test`;
  const teacherEmail = `e2e-recovery-teacher-${runId}@example.test`;
  const password = "StrongPass9";

  let schoolId = "";
  let classId = "";
  let studentId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonValue | null;
    return { response, body };
  }

  async function loginAccessToken(email: string) {
    const login = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.response.status).toBe(201);
    expect(typeof login.body?.accessToken).toBe("string");
    return String(login.body?.accessToken ?? "");
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
          startsWith: "e2e-recovery-",
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        slug: {
          startsWith: "e2e-recovery-settings-",
        },
      },
    });

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Recovery ${runId}`,
      },
    });
    schoolId = school.id;

    const schoolYear = await prisma.schoolYear.create({
      data: {
        schoolId,
        label: "2025-2026",
      },
    });

    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: schoolYear.id },
    });

    const classEntity = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId: schoolYear.id,
        name: "CM2 A",
      },
    });
    classId = classEntity.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        firstName: "Junior",
        lastName: "Mbida",
      },
    });
    studentId = student.id;

    await prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId: schoolYear.id,
        classId,
        studentId,
        status: "ACTIVE",
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const parent = await prisma.user.create({
      data: {
        email: parentEmail,
        firstName: "Parent",
        lastName: "One",
        gender: "F",
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        recoveryBirthDate: new Date("1987-01-09T00:00:00.000Z"),
        recoveryClassId: classId,
        recoveryStudentId: studentId,
        memberships: {
          create: [{ schoolId, role: "PARENT" }],
        },
      },
    });

    await prisma.userRecoveryAnswer.createMany({
      data: [
        {
          userId: parent.id,
          questionKey: "MOTHER_MAIDEN_NAME",
          answerHash: await bcrypt.hash("abena", 10),
        },
        {
          userId: parent.id,
          questionKey: "FATHER_FIRST_NAME",
          answerHash: await bcrypt.hash("michel", 10),
        },
        {
          userId: parent.id,
          questionKey: "FAVORITE_SPORT",
          answerHash: await bcrypt.hash("basket", 10),
        },
      ],
    });

    const teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        firstName: "Teacher",
        lastName: "One",
        gender: "M",
        activationStatus: "ACTIVE",
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        recoveryBirthDate: new Date("1990-06-14T00:00:00.000Z"),
        memberships: {
          create: [{ schoolId, role: "TEACHER" }],
        },
      },
    });

    await prisma.userRecoveryAnswer.createMany({
      data: [
        {
          userId: teacher.id,
          questionKey: "BIRTH_CITY",
          answerHash: await bcrypt.hash("douala", 10),
        },
        {
          userId: teacher.id,
          questionKey: "FAVORITE_TEACHER",
          answerHash: await bcrypt.hash("nana", 10),
        },
        {
          userId: teacher.id,
          questionKey: "CHILDHOOD_NICKNAME",
          answerHash: await bcrypt.hash("toto", 10),
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
            startsWith: "e2e-recovery-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("returns current recovery context for a parent account", async () => {
    const accessToken = await loginAccessToken(parentEmail);

    const options = await apiJson("/api/auth/recovery/options", {
      method: "GET",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(options.response.status).toBe(200);
    expect(Array.isArray(options.body?.questions)).toBe(true);
    expect(Array.isArray(options.body?.selectedQuestions)).toBe(true);
    expect(Array.isArray(options.body?.classes)).toBe(true);
    expect(Array.isArray(options.body?.students)).toBe(true);
    expect((options.body?.schoolRoles as string[]).includes("PARENT")).toBe(
      true,
    );
    expect(options.body?.birthDate).toBe("1987-01-09");
  });

  it("updates recovery settings and persists new hashed answers", async () => {
    const accessToken = await loginAccessToken(parentEmail);

    const update = await apiJson("/api/auth/recovery/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        birthDate: "1988-02-10",
        parentClassId: classId,
        parentStudentId: studentId,
        answers: [
          { questionKey: "BIRTH_CITY", answer: "Bafoussam" },
          { questionKey: "FAVORITE_BOOK", answer: "L aventure" },
          { questionKey: "FAVORITE_TEACHER", answer: "M. Ndzi" },
        ],
      }),
    });

    expect(update.response.status).toBe(201);
    expect(update.body?.success).toBe(true);

    const parent = await prisma.user.findUniqueOrThrow({
      where: { email: parentEmail },
      include: { recoveryAnswers: true },
    });

    expect(parent.recoveryBirthDate?.toISOString().slice(0, 10)).toBe(
      "1988-02-10",
    );
    expect(parent.recoveryAnswers).toHaveLength(3);

    const byKey = new Map(
      parent.recoveryAnswers.map((entry) => [
        entry.questionKey,
        entry.answerHash,
      ]),
    );
    expect(
      await bcrypt.compare("bafoussam", byKey.get("BIRTH_CITY") ?? ""),
    ).toBe(true);
    expect(
      await bcrypt.compare("l aventure", byKey.get("FAVORITE_BOOK") ?? ""),
    ).toBe(true);
    expect(
      await bcrypt.compare("m. ndzi", byKey.get("FAVORITE_TEACHER") ?? ""),
    ).toBe(true);
  });

  it("rejects duplicate recovery question selection", async () => {
    const accessToken = await loginAccessToken(teacherEmail);

    const invalid = await apiJson("/api/auth/recovery/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        birthDate: "1991-03-15",
        answers: [
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "BIRTH_CITY", answer: "Douala bis" },
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
        ],
      }),
    });

    expect(invalid.response.status).toBe(403);
  });
});
