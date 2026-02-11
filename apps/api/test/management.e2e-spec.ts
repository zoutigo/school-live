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

describe("Management API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";
  let bearerToken = "";

  const runId = randomSuffix();
  const superAdminEmail = `e2e-superadmin-${runId}@example.test`;
  const schoolAdminEmail = `e2e-schooladmin-${runId}@example.test`;
  const password = "StrongPass1";

  let createdSchoolSlug = "";
  let createdSchoolId = "";
  const createdSchoolIds: string[] = [];
  let createdClassId = "";
  let createdSchoolYearId = "";
  let rolledSchoolYearId = "";
  let rolledClassId = "";
  let createdStudentId = "";
  let createdSubjectId = "";
  let createdCurriculumId = "";

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, init);
    return response;
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
          startsWith: "e2e-",
        },
      },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        platformRoles: {
          create: [{ role: "SUPER_ADMIN" }],
        },
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
    expect(typeof login.body?.accessToken).toBe("string");
    bearerToken = String(login.body?.accessToken);
  });

  afterAll(async () => {
    if (prisma) {
      if (createdSchoolIds.length > 0) {
        await prisma.school.deleteMany({
          where: {
            id: {
              in: createdSchoolIds,
            },
          },
        });
      }

      await prisma.user.deleteMany({
        where: {
          email: {
            in: [superAdminEmail, schoolAdminEmail],
          },
        },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("creates school and runs school-year/curriculum flows", async () => {
    const createSchool = await apiJson("/api/system/schools", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        name: `E2E School ${runId}`,
        schoolAdminEmail,
      }),
    });

    expect(createSchool.response.status).toBe(201);
    createdSchoolSlug = String((createSchool.body?.school as JsonValue)?.slug);
    createdSchoolId = String((createSchool.body?.school as JsonValue)?.id);
    createdSchoolIds.push(createdSchoolId);
    expect(createdSchoolSlug).toContain("e2e-school");

    const classGroup = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/class-groups`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ name: "College" }),
      },
    );

    expect(classGroup.response.status).toBe(201);
    const classGroupId = String(classGroup.body?.id);

    const listSchoolYears = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/school-years`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );

    expect(listSchoolYears.response.status).toBe(200);
    expect(Array.isArray(listSchoolYears.body)).toBe(true);

    const createSchoolYear = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/school-years`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ label: "2030-2031" }),
      },
    );

    expect(createSchoolYear.response.status).toBe(201);
    createdSchoolYearId = String(createSchoolYear.body?.id);

    const setActive = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/school-years/active`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ schoolYearId: createdSchoolYearId }),
      },
    );

    expect(setActive.response.status).toBe(200);

    const createClassroom = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/classrooms`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          classGroupId,
          schoolYearId: createdSchoolYearId,
          name: "A",
        }),
      },
    );

    expect(createClassroom.response.status).toBe(201);
    createdClassId = String(createClassroom.body?.id);

    const createStudent = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          firstName: "Student",
          lastName: "One",
          classId: createdClassId,
        }),
      },
    );

    expect(createStudent.response.status).toBe(201);
    createdStudentId = String(createStudent.body?.id);

    const rollover = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/school-years/rollover`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          sourceSchoolYearId: createdSchoolYearId,
          targetLabel: "2031-2032",
          copyAssignments: false,
          copyEnrollments: false,
          setTargetAsActive: false,
        }),
      },
    );

    expect(rollover.response.status).toBe(201);
    expect(Number(rollover.body?.createdClassesCount)).toBeGreaterThanOrEqual(
      1,
    );
    rolledSchoolYearId = String(
      (rollover.body?.targetSchoolYear as JsonValue)?.id,
    );

    const listClassroomsAfterRollover = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/classrooms`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );

    expect(listClassroomsAfterRollover.response.status).toBe(200);
    const classroomRows = Array.isArray(listClassroomsAfterRollover.body)
      ? (listClassroomsAfterRollover.body as JsonValue[])
      : [];
    const rolledClass = classroomRows.find((entry) => {
      const row = entry as JsonValue;
      const rowYear = row.schoolYear as JsonValue;
      return (
        String(row.name) === "A" &&
        String(rowYear?.id ?? "") === rolledSchoolYearId
      );
    }) as JsonValue | undefined;
    expect(rolledClass).toBeDefined();
    rolledClassId = String(rolledClass?.id);

    const upsertEnrollment = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students/${createdStudentId}/enrollments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          classId: rolledClassId,
          status: "ACTIVE",
        }),
      },
    );

    expect(upsertEnrollment.response.status).toBe(201);

    const switchActiveYear = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/school-years/active`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          schoolYearId: rolledSchoolYearId,
        }),
      },
    );

    expect(switchActiveYear.response.status).toBe(200);

    const studentEnrollments = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students/${createdStudentId}/enrollments`,
      {
        headers: {
          authorization: `Bearer ${bearerToken}`,
        },
      },
    );

    expect(studentEnrollments.response.status).toBe(200);
    const enrollmentRows = Array.isArray(studentEnrollments.body)
      ? (studentEnrollments.body as JsonValue[])
      : [];
    expect(enrollmentRows.length).toBe(2);
    expect(enrollmentRows.some((entry) => Boolean(entry.isCurrent))).toBe(true);

    const originalYearEnrollment = enrollmentRows.find(
      (entry) =>
        String((entry.schoolYear as JsonValue)?.id ?? "") ===
        createdSchoolYearId,
    );
    expect(originalYearEnrollment).toBeDefined();

    const listStudentsWithEnrollments = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students`,
      {
        headers: {
          authorization: `Bearer ${bearerToken}`,
        },
      },
    );
    expect(listStudentsWithEnrollments.response.status).toBe(200);
    const listedStudents = Array.isArray(listStudentsWithEnrollments.body)
      ? (listStudentsWithEnrollments.body as JsonValue[])
      : [];
    const listedCreatedStudent = listedStudents.find(
      (entry) => String(entry.id) === createdStudentId,
    );
    expect(listedCreatedStudent).toBeDefined();

    const markTransferred = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students/${createdStudentId}/enrollments/${String(
        originalYearEnrollment?.id,
      )}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          status: "TRANSFERRED",
        }),
      },
    );

    expect(markTransferred.response.status).toBe(200);

    const bulkStatus = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/enrollments/status`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          enrollmentIds: [String(originalYearEnrollment?.id)],
          status: "WITHDRAWN",
        }),
      },
    );

    expect(bulkStatus.response.status).toBe(200);
    expect(Number(bulkStatus.body?.updatedCount)).toBe(1);

    const secondSchool = await apiJson("/api/system/schools", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        name: `E2E School B ${runId}`,
        schoolAdminEmail,
      }),
    });

    expect(secondSchool.response.status).toBe(201);
    const secondSchoolSlug = String(
      (secondSchool.body?.school as JsonValue)?.slug,
    );
    const secondSchoolId = String((secondSchool.body?.school as JsonValue)?.id);
    createdSchoolIds.push(secondSchoolId);

    const secondGroup = await apiJson(
      `/api/schools/${secondSchoolSlug}/admin/class-groups`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ name: "Cross" }),
      },
    );
    expect(secondGroup.response.status).toBe(201);

    const secondYears = await apiJson(
      `/api/schools/${secondSchoolSlug}/admin/school-years`,
      {
        headers: { authorization: `Bearer ${bearerToken}` },
      },
    );
    expect(secondYears.response.status).toBe(200);
    const secondSchoolYearRows = Array.isArray(secondYears.body)
      ? (secondYears.body as JsonValue[])
      : [];
    const secondSchoolYearId = String(
      (secondSchoolYearRows[0] as JsonValue | undefined)?.id ?? "",
    );

    const secondClass = await apiJson(
      `/api/schools/${secondSchoolSlug}/admin/classrooms`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          classGroupId: String(secondGroup.body?.id),
          schoolYearId: secondSchoolYearId,
          name: "X1",
        }),
      },
    );

    expect(secondClass.response.status).toBe(201);

    const crossSchoolEnrollment = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/students/${createdStudentId}/enrollments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          classId: String(secondClass.body?.id),
        }),
      },
    );

    expect(crossSchoolEnrollment.response.status).toBe(404);

    const createAcademicLevel = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/academic-levels`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ code: "TLE", label: "Terminale" }),
      },
    );

    expect(createAcademicLevel.response.status).toBe(201);
    const academicLevelId = String(createAcademicLevel.body?.id);

    const createTrack = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/tracks`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({ code: "S", label: "Scientifique" }),
      },
    );

    expect(createTrack.response.status).toBe(201);
    const trackId = String(createTrack.body?.id);

    const createCurriculum = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/curriculums`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          name: `Terminale S ${runId}`,
          academicLevelId,
          trackId,
        }),
      },
    );

    expect(createCurriculum.response.status).toBe(201);
    createdCurriculumId = String(createCurriculum.body?.id);

    const subject = await prisma.subject.create({
      data: {
        schoolId: createdSchoolId,
        name: `Mathematiques ${runId}`,
      },
      select: { id: true },
    });
    createdSubjectId = subject.id;

    const upsertCurriculumSubject = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/curriculums/${createdCurriculumId}/subjects`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          subjectId: createdSubjectId,
          isMandatory: true,
          coefficient: 4,
        }),
      },
    );

    expect(upsertCurriculumSubject.response.status).toBe(201);

    const createOverride = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/classrooms/${createdClassId}/subject-overrides`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          subjectId: createdSubjectId,
          action: "ADD",
        }),
      },
    );

    expect(createOverride.response.status).toBe(201);

    const listOverrides = await apiJson(
      `/api/schools/${createdSchoolSlug}/admin/classrooms/${createdClassId}/subject-overrides`,
      {
        headers: {
          authorization: `Bearer ${bearerToken}`,
        },
      },
    );

    expect(listOverrides.response.status).toBe(200);
    const overrides = Array.isArray(listOverrides.body)
      ? (listOverrides.body as unknown as JsonValue[])
      : [];
    expect(overrides.length).toBeGreaterThan(0);
  });
});
