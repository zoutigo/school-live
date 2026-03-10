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

function randomCameroonMsisdn() {
  const line = Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0");
  return `699${line.slice(0, 6)}`;
}

describe("Management contact auth e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";
  let bearerToken = "";

  const runId = randomSuffix();
  const superAdminEmail = `e2e-contact-superadmin-${runId}@example.test`;
  const schoolAdminEmail = `e2e-contact-schooladmin-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolSlug = "";
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
        email: { startsWith: "e2e-contact-" },
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const superAdminPhone = `+23769988${Math.floor(Math.random() * 9000 + 1000)}`;
    const superAdminPinHash = await bcrypt.hash("123456", 10);
    await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        phone: superAdminPhone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        phoneCredential: {
          create: {
            phoneE164: superAdminPhone,
            pinHash: superAdminPinHash,
            verifiedAt: new Date(),
          },
        },
        platformRoles: { create: [{ role: "SUPER_ADMIN" }] },
      },
    });

    await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
      },
    });

    const login = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: superAdminEmail, password }),
    });
    expect(login.response.status).toBe(201);
    bearerToken = String(login.body?.accessToken ?? "");

    const createSchool = await apiJson("/api/system/schools", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        name: `E2E Contact School ${runId}`,
        schoolAdminEmail,
      }),
    });
    expect(createSchool.response.status).toBe(201);
    schoolSlug = String((createSchool.body?.school as JsonValue)?.slug ?? "");
    schoolId = String((createSchool.body?.school as JsonValue)?.id ?? "");

    const academicLevel = await apiJson(
      `/api/schools/${schoolSlug}/admin/academic-levels`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          code: "6EME",
          label: "6eme",
        }),
      },
    );
    expect(academicLevel.response.status).toBe(201);
    const academicLevelId = String(academicLevel.body?.id ?? "");

    const schoolYear = await apiJson(
      `/api/schools/${schoolSlug}/admin/school-years`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ label: "2035-2036" }),
      },
    );
    expect(schoolYear.response.status).toBe(201);
    const schoolYearId = String(schoolYear.body?.id ?? "");

    const setActive = await apiJson(
      `/api/schools/${schoolSlug}/admin/school-years/active`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId }),
      },
    );
    expect(setActive.response.status).toBe(200);

    const curriculum = await apiJson(
      `/api/schools/${schoolSlug}/admin/curriculums`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          academicLevelId,
        }),
      },
    );
    expect(curriculum.response.status).toBe(201);
    const curriculumId = String(curriculum.body?.id ?? "");

    const classroom = await apiJson(
      `/api/schools/${schoolSlug}/admin/classrooms`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          schoolYearId,
          name: "6C",
          curriculumId,
        }),
      },
    );
    expect(classroom.response.status).toBe(201);
    classId = String(classroom.body?.id ?? "");

    const student = await apiJson(`/api/schools/${schoolSlug}/admin/students`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        firstName: "Lisa",
        lastName: "MBELE",
        classId,
      }),
    });
    expect(student.response.status).toBe(201);
    studentId = String(student.body?.id ?? "");
  });

  afterAll(async () => {
    await prisma.school.deleteMany({ where: { id: schoolId } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [superAdminEmail, schoolAdminEmail],
        },
      },
    });
    await app.close();
  });

  it("creates teacher via unknown email with password and flags first password change", async () => {
    const teacherEmail = `e2e-contact-teacher-email-${runId}@example.test`;

    const createTeacher = await apiJson(
      `/api/schools/${schoolSlug}/admin/teachers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          email: teacherEmail,
          password: "StrongPass1",
        }),
      },
    );

    expect(createTeacher.response.status).toBe(201);
    expect(Boolean(createTeacher.body?.userExisted)).toBe(false);

    const teacherUser = await prisma.user.findUniqueOrThrow({
      where: { email: teacherEmail },
      include: {
        memberships: true,
        teacherProfiles: true,
      },
    });
    expect(teacherUser.mustChangePassword).toBe(true);
    expect(teacherUser.memberships.some((row) => row.role === "TEACHER")).toBe(
      true,
    );
    expect(teacherUser.teacherProfiles.length).toBe(1);
  });

  it("affects existing phone account as teacher without creating a new account", async () => {
    const phone = "+237699001123";
    const existingEmail = `e2e-contact-known-phone-teacher-${runId}@example.test`;
    const pinHash = await bcrypt.hash("111111", 10);
    const passwordHash = await bcrypt.hash("StrongPass1", 10);

    const user = await prisma.user.create({
      data: {
        firstName: "Known",
        lastName: "PhoneTeacher",
        email: existingEmail,
        phone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        phoneCredential: {
          create: {
            phoneE164: phone,
            pinHash,
            verifiedAt: new Date(),
          },
        },
      },
    });

    const createTeacher = await apiJson(
      `/api/schools/${schoolSlug}/admin/teachers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          phone: "699001123",
        }),
      },
    );

    expect(createTeacher.response.status).toBe(201);
    expect(Boolean(createTeacher.body?.userExisted)).toBe(true);
    const membership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId,
        userId: user.id,
        role: "TEACHER",
      },
    });
    expect(membership).toBeTruthy();
  });

  it("creates phone-only teacher account with pending activation", async () => {
    const teacherPhone = randomCameroonMsisdn();
    const createTeacher = await apiJson(
      `/api/schools/${schoolSlug}/admin/teachers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          phone: teacherPhone,
          pin: "123456",
        }),
      },
    );

    expect(createTeacher.response.status).toBe(201);
    expect(Boolean(createTeacher.body?.activationRequired)).toBe(true);

    const created = await prisma.user.findFirstOrThrow({
      where: { phone: `+237${teacherPhone}` },
      include: {
        memberships: true,
        teacherProfiles: true,
        phoneCredential: true,
      },
    });
    expect(created.activationStatus).toBe("PENDING");
    expect(created.phoneCredential).toBeNull();
    expect(created.memberships.some((row) => row.role === "TEACHER")).toBe(
      true,
    );
    expect(created.teacherProfiles.length).toBe(1);

    const login = await apiJson("/api/auth/login-phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: teacherPhone,
        pin: "123456",
        schoolSlug,
      }),
    });
    expect(login.response.status).toBe(403);
    expect(
      typeof (login.body?.message as { code?: string } | undefined)?.code ===
        "string"
        ? (login.body?.message as { code?: string }).code
        : login.body?.code,
    ).toBe("PROFILE_SETUP_REQUIRED");
    const setupTokenFromMessage =
      typeof login.body?.message === "object" && login.body?.message !== null
        ? String(
            (login.body.message as { setupToken?: unknown }).setupToken ?? "",
          )
        : "";
    const setupToken =
      setupTokenFromMessage.length > 0
        ? setupTokenFromMessage
        : String(login.body?.setupToken ?? "");
    expect(setupToken.length).toBeGreaterThan(0);

    const onboarding = await apiJson("/api/auth/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        setupToken,
        newPin: "654321",
        firstName: "Teacher",
        lastName: "Phone",
        gender: "M",
        birthDate: "1990-01-10",
        answers: [
          { questionKey: "FAVORITE_BOOK", answer: "Livre" },
          { questionKey: "BIRTH_CITY", answer: "Douala" },
          { questionKey: "FAVORITE_SPORT", answer: "Football" },
        ],
      }),
    });
    expect(onboarding.response.status).toBe(201);

    const reloginWithOldPin = await apiJson("/api/auth/login-phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: teacherPhone,
        pin: "123456",
        schoolSlug,
      }),
    });
    expect(reloginWithOldPin.response.status).toBe(401);

    const reloginWithNewPin = await apiJson("/api/auth/login-phone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phone: teacherPhone,
        pin: "654321",
        schoolSlug,
      }),
    });
    expect(reloginWithNewPin.response.status).toBe(201);

    const activated = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        phoneCredential: true,
      },
    });
    expect(activated.activationStatus).toBe("ACTIVE");
    expect(activated.phoneCredential?.verifiedAt).toBeTruthy();
    expect(activated.profileCompleted).toBe(true);
  });

  it("links parent by known phone without registration flow", async () => {
    const phone = "+237699001125";
    const existingEmail = `e2e-contact-known-phone-parent-${runId}@example.test`;
    const pinHash = await bcrypt.hash("222222", 10);
    const passwordHash = await bcrypt.hash("StrongPass1", 10);

    const user = await prisma.user.create({
      data: {
        firstName: "Known",
        lastName: "PhoneParent",
        email: existingEmail,
        phone,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        phoneCredential: {
          create: {
            phoneE164: phone,
            pinHash,
            verifiedAt: new Date(),
          },
        },
      },
    });

    const link = await apiJson(
      `/api/schools/${schoolSlug}/admin/parent-students`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          studentId,
          phone: "699001125",
        }),
      },
    );

    expect(link.response.status).toBe(201);
    const parentMembership = await prisma.schoolMembership.findFirst({
      where: {
        schoolId,
        userId: user.id,
        role: "PARENT",
      },
    });
    expect(parentMembership).toBeTruthy();
  });

  it("creates phone-only parent account with pending activation and links to student", async () => {
    const parentPhone = randomCameroonMsisdn();
    const link = await apiJson(
      `/api/schools/${schoolSlug}/admin/parent-students`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          studentId,
          phone: parentPhone,
          pin: "123456",
        }),
      },
    );

    expect(link.response.status).toBe(201);
    const createdParent = await prisma.user.findFirstOrThrow({
      where: { phone: `+237${parentPhone}` },
      include: {
        memberships: true,
        phoneCredential: true,
      },
    });
    expect(createdParent.activationStatus).toBe("PENDING");
    expect(createdParent.phoneCredential).toBeNull();
    expect(createdParent.memberships.some((row) => row.role === "PARENT")).toBe(
      true,
    );

    const parentLink = await prisma.parentStudent.findFirst({
      where: {
        schoolId,
        studentId,
        parentUserId: createdParent.id,
      },
    });
    expect(parentLink).toBeTruthy();
  });
});
