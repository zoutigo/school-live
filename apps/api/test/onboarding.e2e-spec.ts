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

describe("Onboarding API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-onboarding-${runId}`;
  const schoolName = `E2E Onboarding ${runId}`;
  const schoolYearLabel = "2025-2026";

  const parentEmail = `e2e-onboarding-parent-${runId}@example.test`;
  const teacherEmail = `e2e-onboarding-teacher-${runId}@example.test`;
  const alreadyActiveEmail = `e2e-onboarding-active-${runId}@example.test`;
  const invalidTempEmail = `e2e-onboarding-invalid-temp-${runId}@example.test`;

  const temporaryPassword = "TempPass11";
  const newPassword = "NewPassWord9";

  let schoolId = "";
  let schoolYearId = "";
  let classId = "";
  let studentId = "";
  let parentUserId = "";

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
          startsWith: "e2e-onboarding-",
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        slug: {
          startsWith: "e2e-onboarding-",
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

    const schoolYear = await prisma.schoolYear.create({
      data: {
        schoolId,
        label: schoolYearLabel,
      },
    });
    schoolYearId = schoolYear.id;

    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: schoolYearId },
    });

    const classEntity = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        name: "6e A",
      },
    });
    classId = classEntity.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        firstName: "Paul",
        lastName: "MBELE",
      },
    });
    studentId = student.id;

    await prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId,
        studentId,
        classId,
        status: "ACTIVE",
      },
    });

    const temporaryHash = await bcrypt.hash(temporaryPassword, 10);
    const activeHash = await bcrypt.hash("AlreadyPass9", 10);

    const parent = await prisma.user.create({
      data: {
        email: parentEmail,
        firstName: "Invite",
        lastName: "Parent",
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
        memberships: {
          create: [
            {
              schoolId,
              role: "PARENT",
            },
          ],
        },
      },
    });
    parentUserId = parent.id;

    const teacher = await prisma.user.create({
      data: {
        email: teacherEmail,
        firstName: "Invite",
        lastName: "Teacher",
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
        memberships: {
          create: [
            {
              schoolId,
              role: "TEACHER",
            },
          ],
        },
      },
    });

    await prisma.user.create({
      data: {
        email: alreadyActiveEmail,
        firstName: "Already",
        lastName: "Active",
        passwordHash: activeHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: {
          create: [
            {
              schoolId,
              role: "TEACHER",
            },
          ],
        },
      },
    });

    await prisma.user.create({
      data: {
        email: invalidTempEmail,
        firstName: "Wrong",
        lastName: "Temp",
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
        memberships: {
          create: [
            {
              schoolId,
              role: "TEACHER",
            },
          ],
        },
      },
    });

    await prisma.refreshToken.create({
      data: {
        userId: teacher.id,
        tokenHash: `e2e-onboarding-token-${runId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (schoolId) {
        await prisma.school.deleteMany({
          where: { id: schoolId },
        });
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-onboarding-",
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("completes onboarding for parent and allows login with new password", async () => {
    const onboarding = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parentEmail,
        temporaryPassword,
        newPassword,
        firstName: "Lisa",
        lastName: "Mbele",
        gender: "F",
        birthDate: "1987-01-09",
        answers: [
          {
            questionKey: "MOTHER_MAIDEN_NAME",
            answer: "Abena",
          },
          {
            questionKey: "FAVORITE_SPORT",
            answer: "Basket",
          },
          {
            questionKey: "BIRTH_CITY",
            answer: "Douala",
          },
        ],
        parentClassId: classId,
        parentStudentId: studentId,
      }),
    });

    expect(onboarding.response.status).toBe(201);
    expect(onboarding.body?.success).toBe(true);
    expect(onboarding.body?.schoolSlug).toBe(schoolSlug);

    const updatedParent = await prisma.user.findUniqueOrThrow({
      where: { email: parentEmail },
      include: {
        recoveryAnswers: true,
      },
    });

    expect(updatedParent.mustChangePassword).toBe(false);
    expect(updatedParent.profileCompleted).toBe(true);
    expect(updatedParent.firstName).toBe("Lisa");
    expect(updatedParent.lastName).toBe("Mbele");
    expect(updatedParent.gender).toBe("F");
    expect(updatedParent.recoveryClassId).toBe(classId);
    expect(updatedParent.recoveryStudentId).toBe(studentId);
    expect(updatedParent.recoveryBirthDate).not.toBeNull();
    expect(updatedParent.recoveryAnswers).toHaveLength(3);

    const validPassword = await bcrypt.compare(
      newPassword,
      updatedParent.passwordHash,
    );
    expect(validPassword).toBe(true);

    const login = await apiJson(`/api/schools/${schoolSlug}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parentEmail,
        password: newPassword,
      }),
    });

    expect(login.response.status).toBe(201);
    expect(typeof login.body?.accessToken).toBe("string");
  });

  it("completes onboarding for non-parent without class/student and revokes refresh tokens", async () => {
    const onboarding = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: teacherEmail,
        temporaryPassword,
        newPassword: "TeacherPass9",
        firstName: "Jean",
        lastName: "Ondoa",
        gender: "M",
        birthDate: "1990-03-11",
        answers: [
          {
            questionKey: "FAVORITE_TEACHER",
            answer: "Mme Ngono",
          },
          {
            questionKey: "FATHER_FIRST_NAME",
            answer: "Martin",
          },
          {
            questionKey: "CHILDHOOD_NICKNAME",
            answer: "Jojo",
          },
        ],
      }),
    });

    expect(onboarding.response.status).toBe(201);
    expect(onboarding.body?.success).toBe(true);

    const teacher = await prisma.user.findUniqueOrThrow({
      where: { email: teacherEmail },
    });
    expect(teacher.mustChangePassword).toBe(false);
    expect(teacher.profileCompleted).toBe(true);
    expect(teacher.gender).toBe("M");

    const tokens = await prisma.refreshToken.findMany({
      where: { userId: teacher.id },
    });
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.every((token) => token.revokedAt instanceof Date)).toBe(true);
  });

  it("returns 401 when temporary password is invalid", async () => {
    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: invalidTempEmail,
        temporaryPassword: "WrongPass99",
        newPassword: "ValidPass9",
        firstName: "X",
        lastName: "Y",
        gender: "M",
        birthDate: "1991-02-01",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Yaounde" },
          { questionKey: "FAVORITE_SPORT", answer: "Foot" },
        ],
      }),
    });

    expect(response.response.status).toBe(401);
  });

  it("returns 403 when password change is not required anymore", async () => {
    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: alreadyActiveEmail,
        temporaryPassword: "AlreadyPass9",
        newPassword: "AnotherPass9",
        firstName: "A",
        lastName: "B",
        gender: "F",
        birthDate: "1992-05-01",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Kribi" },
          { questionKey: "FAVORITE_SPORT", answer: "Foot" },
        ],
      }),
    });

    expect(response.response.status).toBe(403);
    expect(String(response.body?.message)).toContain(
      "Password change is not required",
    );
  });

  it("returns 400 when new password does not match complexity requirements", async () => {
    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: alreadyActiveEmail,
        temporaryPassword: "AlreadyPass9",
        newPassword: "weak",
        firstName: "A",
        lastName: "B",
        gender: "M",
        birthDate: "1992-05-01",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Kribi" },
          { questionKey: "FAVORITE_SPORT", answer: "Foot" },
        ],
      }),
    });

    expect(response.response.status).toBe(400);
    const message = response.body?.message;
    const normalized = Array.isArray(message)
      ? message.join(" ")
      : String(message ?? "");
    expect(normalized).toContain("Le mot de passe doit contenir au moins 8");
  });

  it("returns 403 when recovery questions are not distinct", async () => {
    const parent = await prisma.user.findUniqueOrThrow({
      where: { id: parentUserId },
    });
    const temporaryHash = await bcrypt.hash("AgainTemp11", 10);
    await prisma.user.update({
      where: { id: parent.id },
      data: {
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
      },
    });

    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parentEmail,
        temporaryPassword: "AgainTemp11",
        newPassword: "AgainPass11",
        firstName: "Lisa",
        lastName: "Mbele",
        gender: "F",
        birthDate: "1987-01-09",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "FAVORITE_BOOK", answer: "Livre2" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
        ],
        parentClassId: classId,
        parentStudentId: studentId,
      }),
    });

    expect(response.response.status).toBe(403);
    expect(String(response.body?.message)).toContain("3 distinct recovery");
  });

  it("returns 403 for parent when class/student are missing", async () => {
    const parent = await prisma.user.findUniqueOrThrow({
      where: { email: parentEmail },
    });
    const temporaryHash = await bcrypt.hash("ThirdTemp11", 10);
    await prisma.user.update({
      where: { id: parent.id },
      data: {
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
      },
    });

    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parentEmail,
        temporaryPassword: "ThirdTemp11",
        newPassword: "ThirdPass11",
        firstName: "Lisa",
        lastName: "Mbele",
        gender: "F",
        birthDate: "1987-01-09",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Handball" },
        ],
      }),
    });

    expect(response.response.status).toBe(403);
    expect(String(response.body?.message)).toContain(
      "Parent must select class and student",
    );
  });

  it("returns 403 for parent when class/student selection is invalid", async () => {
    const parent = await prisma.user.findUniqueOrThrow({
      where: { email: parentEmail },
    });
    const temporaryHash = await bcrypt.hash("FourthTemp11", 10);
    await prisma.user.update({
      where: { id: parent.id },
      data: {
        passwordHash: temporaryHash,
        mustChangePassword: true,
        profileCompleted: false,
      },
    });

    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: parentEmail,
        temporaryPassword: "FourthTemp11",
        newPassword: "FourthPass11",
        firstName: "Lisa",
        lastName: "Mbele",
        gender: "F",
        birthDate: "1987-01-09",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Volley" },
        ],
        parentClassId: classId,
        parentStudentId: "missing-student-id",
      }),
    });

    expect(response.response.status).toBe(403);
    expect(String(response.body?.message)).toContain(
      "Invalid class/student selection",
    );
  });

  it("returns 400 when gender is missing", async () => {
    const response = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: invalidTempEmail,
        temporaryPassword,
        newPassword: "MissingGender9",
        firstName: "X",
        lastName: "Y",
        birthDate: "1991-02-01",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Yaounde" },
          { questionKey: "FAVORITE_SPORT", answer: "Foot" },
        ],
      }),
    });

    expect(response.response.status).toBe(400);
  });
});
