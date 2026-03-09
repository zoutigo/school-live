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

describe("Timetable subject style API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";
  let bearerToken = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-timetable-style-${runId}`;
  const schoolAdminEmail = `e2e-timetable-style-admin-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let schoolYearId = "";
  let previousSchoolYearId = "";
  let classId = "";
  let subjectId = "";
  let secondSubjectId = "";

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
          startsWith: "e2e-timetable-style-",
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        slug: {
          startsWith: "e2e-timetable-style-",
        },
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: {
        slug: schoolSlug,
        name: `E2E Timetable Style ${runId}`,
      },
    });
    schoolId = school.id;

    const schoolYear = await prisma.schoolYear.create({
      data: {
        schoolId,
        label: "2025-2026",
      },
    });
    schoolYearId = schoolYear.id;

    const previousSchoolYear = await prisma.schoolYear.create({
      data: {
        schoolId,
        label: "2024-2025",
      },
    });
    previousSchoolYearId = previousSchoolYear.id;

    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: schoolYearId },
    });

    const academicLevel = await prisma.academicLevel.create({
      data: {
        schoolId,
        code: "6EME",
        label: "6eme",
      },
    });

    const curriculum = await prisma.curriculum.create({
      data: {
        schoolId,
        name: `Curriculum ${runId}`,
        academicLevelId: academicLevel.id,
      },
    });

    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: `Maths ${runId}`,
      },
    });
    subjectId = subject.id;

    const secondSubject = await prisma.subject.create({
      data: {
        schoolId,
        name: `Francais ${runId}`,
      },
    });
    secondSubjectId = secondSubject.id;

    await prisma.curriculumSubject.create({
      data: {
        schoolId,
        curriculumId: curriculum.id,
        subjectId,
        isMandatory: true,
        coefficient: 2,
        weeklyHours: 4,
      },
    });
    await prisma.curriculumSubject.create({
      data: {
        schoolId,
        curriculumId: curriculum.id,
        subjectId: secondSubjectId,
        isMandatory: true,
        coefficient: 2,
        weeklyHours: 4,
      },
    });

    const classroom = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        academicLevelId: academicLevel.id,
        curriculumId: curriculum.id,
        name: "6eB",
      },
    });
    classId = classroom.id;

    await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [{ schoolId, role: "SCHOOL_ADMIN" }],
        },
      },
    });

    const login = await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: schoolAdminEmail, password }),
    });

    expect(login.response.status).toBe(201);
    bearerToken = String(login.body?.accessToken ?? "");
    expect(bearerToken).not.toBe("");
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({ where: { id: schoolId } });
      }

      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-timetable-style-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("updates class subject color and exposes it in class timetable read", async () => {
    const setBlue = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId, colorHex: "#2563EB" }),
      },
    );

    expect(setBlue.response.status).toBe(200);
    expect(String(setBlue.body?.colorHex)).toBe("#2563EB");

    const setGreen = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId, colorHex: "#10B981" }),
      },
    );

    expect(setGreen.response.status).toBe(200);
    expect(String(setGreen.body?.colorHex)).toBe("#10B981");

    const readTimetable = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}?schoolYearId=${encodeURIComponent(
        schoolYearId,
      )}`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );

    expect(readTimetable.response.status).toBe(200);
    const subjectStyles = Array.isArray(readTimetable.body?.subjectStyles)
      ? (readTimetable.body?.subjectStyles as Array<Record<string, unknown>>)
      : [];
    const row = subjectStyles.find(
      (entry) => String(entry.subjectId) === subjectId,
    );
    expect(row).toBeDefined();
    expect(String(row?.colorHex)).toBe("#10B981");
  });

  it("keeps subject colors isolated by school year", async () => {
    const currentYearStyle = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId, colorHex: "#0F766E" }),
      },
    );
    expect(currentYearStyle.response.status).toBe(200);

    const previousYearStyle = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          schoolYearId: previousSchoolYearId,
          colorHex: "#7C3AED",
        }),
      },
    );
    expect(previousYearStyle.response.status).toBe(200);

    const readCurrentYear = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}?schoolYearId=${encodeURIComponent(
        schoolYearId,
      )}`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );
    expect(readCurrentYear.response.status).toBe(200);
    const currentStyles = Array.isArray(readCurrentYear.body?.subjectStyles)
      ? (readCurrentYear.body?.subjectStyles as Array<Record<string, unknown>>)
      : [];
    const currentRow = currentStyles.find(
      (entry) => String(entry.subjectId) === subjectId,
    );
    expect(String(currentRow?.colorHex)).toBe("#0F766E");

    const readPreviousYear = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}?schoolYearId=${encodeURIComponent(
        previousSchoolYearId,
      )}`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );
    expect(readPreviousYear.response.status).toBe(200);
    const previousStyles = Array.isArray(readPreviousYear.body?.subjectStyles)
      ? (readPreviousYear.body?.subjectStyles as Array<Record<string, unknown>>)
      : [];
    const previousRow = previousStyles.find(
      (entry) => String(entry.subjectId) === subjectId,
    );
    expect(String(previousRow?.colorHex)).toBe("#7C3AED");
  });

  it("rejects too-close colors for two subjects in the same class and school year", async () => {
    const firstStyle = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${subjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId, colorHex: "#2563EB" }),
      },
    );
    expect(firstStyle.response.status).toBe(200);

    const conflictingStyle = await apiJson(
      `/api/schools/${schoolSlug}/timetable/classes/${classId}/subjects/${secondSubjectId}/style`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId, colorHex: "#2563EB" }),
      },
    );
    expect(conflictingStyle.response.status).toBe(400);
    expect(String(conflictingStyle.body?.message)).toContain(
      "Color too close to another subject color",
    );
  });
});
