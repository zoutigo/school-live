import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

/**
 * Coverage for the previously missing UI entry point: a class's referent
 * teacher must be able to reach the health module for their own class, and
 * only their own class (test-module cases #304/#310). This exercises the
 * roster endpoint (`GET /schools/:slug/classes/:classId/health/students`)
 * and the pre-existing per-student endpoint's access matrix together, since
 * the roster is only the entry point into that per-student data.
 */
describe("Teacher class health roster e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-teacher-health-${runId}`;
  const password = "StrongPass1";

  let schoolId = "";
  let referentTeacherUserId = "";
  let otherTeacherUserId = "";
  let referentToken = "";
  let otherTeacherToken = "";
  let academicLevelId = "";
  let schoolYearId = "";
  let referentClassId = "";
  let otherClassId = "";
  let studentInReferentClassId = "";
  let studentInOtherClassId = "";

  async function apiJson(path: string, init?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
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
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: { slug: schoolSlug, name: `E2E Teacher Health School ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const referentTeacher = await prisma.user.create({
      data: {
        firstName: "William",
        lastName: "Tagal",
        email: `e2e-teacher-health-referent-${runId}@example.test`,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
      select: { id: true },
    });
    referentTeacherUserId = referentTeacher.id;
    referentToken = jwtService.sign({ sub: referentTeacherUserId });

    const otherTeacher = await prisma.user.create({
      data: {
        firstName: "Serge",
        lastName: "Belibi",
        email: `e2e-teacher-health-other-${runId}@example.test`,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
      select: { id: true },
    });
    otherTeacherUserId = otherTeacher.id;
    otherTeacherToken = jwtService.sign({ sub: otherTeacherUserId });

    const academicLevel = await prisma.academicLevel.create({
      data: { schoolId, code: `6E-${runId}`, label: "6ème" },
      select: { id: true },
    });
    academicLevelId = academicLevel.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `2026-2027-${runId}` },
      select: { id: true },
    });
    schoolYearId = schoolYear.id;
    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: schoolYearId },
    });

    const referentClass = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        name: "6e B",
        academicLevelId,
        referentTeacherUserId,
      },
      select: { id: true },
    });
    referentClassId = referentClass.id;

    const otherClass = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        name: "6e C",
        academicLevelId,
        referentTeacherUserId: otherTeacherUserId,
      },
      select: { id: true },
    });
    otherClassId = otherClass.id;

    const studentInReferentClass = await prisma.student.create({
      data: { schoolId, firstName: "Romuald", lastName: "Mboutman" },
      select: { id: true },
    });
    studentInReferentClassId = studentInReferentClass.id;
    await prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId,
        studentId: studentInReferentClassId,
        classId: referentClassId,
      },
    });

    const studentInOtherClass = await prisma.student.create({
      data: { schoolId, firstName: "Vincent", lastName: "Aboubacar" },
      select: { id: true },
    });
    studentInOtherClassId = studentInOtherClass.id;
    await prisma.enrollment.create({
      data: {
        schoolId,
        schoolYearId,
        studentId: studentInOtherClassId,
        classId: otherClassId,
      },
    });

    await prisma.studentHealthCondition.create({
      data: {
        schoolId,
        studentId: studentInReferentClassId,
        type: "PATHOLOGY",
        alertLevel: "URGENT",
        label: "Asthme sévère",
        description: "Description complète de la condition.",
        active: true,
        createdByUserId: referentTeacherUserId,
      },
    });
    await prisma.studentHealthCondition.create({
      data: {
        schoolId,
        studentId: studentInReferentClassId,
        type: "TREATMENT",
        alertLevel: "INFO",
        label: "Condition résolue",
        active: false,
        createdByUserId: referentTeacherUserId,
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.studentHealthCondition.deleteMany({ where: { schoolId } });
      await prisma.enrollment.deleteMany({ where: { schoolId } });
      await prisma.student.deleteMany({ where: { schoolId } });
      await prisma.class.deleteMany({ where: { schoolId } });
      await prisma.schoolYear.deleteMany({ where: { id: schoolYearId } });
      await prisma.academicLevel.deleteMany({ where: { id: academicLevelId } });
      await prisma.user.deleteMany({
        where: { id: { in: [referentTeacherUserId, otherTeacherUserId] } },
      });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    if (app) {
      await app.close();
    }
  });

  it("lets the referent teacher list the roster of their own class with a health summary", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/classes/${referentClassId}/health/students`,
      { headers: { authorization: `Bearer ${referentToken}` } },
    );

    expect(result.response.status).toBe(200);
    expect(result.body?.class).toEqual({ id: referentClassId, name: "6e B" });
    expect(result.body?.items).toEqual([
      expect.objectContaining({
        id: studentInReferentClassId,
        activeConditionsCount: 1,
        highestActiveAlertLevel: "URGENT",
      }),
    ]);
  });

  it("rejects a teacher who is not the referent of that class", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/classes/${referentClassId}/health/students`,
      { headers: { authorization: `Bearer ${otherTeacherToken}` } },
    );

    expect(result.response.status).toBe(403);
  });

  it("lets the referent open a student's full health record, redacted to active conditions", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/students/${studentInReferentClassId}/health/conditions`,
      { headers: { authorization: `Bearer ${referentToken}` } },
    );

    expect(result.response.status).toBe(200);
    const items = result.body?.items as Array<{ label: string }>;
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe("Asthme sévère");
  });

  it("rejects the referent creating a health condition (read-only role)", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/students/${studentInReferentClassId}/health/conditions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${referentToken}`,
        },
        body: JSON.stringify({
          type: "PATHOLOGY",
          alertLevel: "INFO",
          label: "Ne devrait pas passer",
        }),
      },
    );

    expect(result.response.status).toBe(403);
  });

  it("denies the referent access to a student outside their referent class", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/students/${studentInOtherClassId}/health/conditions`,
      { headers: { authorization: `Bearer ${referentToken}` } },
    );

    expect(result.response.status).toBe(403);
  });
});
