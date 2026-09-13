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
 * Regression coverage for a production incident: a class whose stored
 * `trackId` had drifted out of sync with its curriculum's `trackId` (data
 * inconsistency introduced outside the normal API flow) made assigning a
 * referent teacher fail with "Track must match curriculum track", even
 * though the request never touched track/curriculum fields.
 */
describe("Classroom referent assignment with stale track/curriculum e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-track-mismatch-${runId}`;
  const adminEmail = `e2e-track-mismatch-admin-${runId}@example.test`;
  const teacherEmail = `e2e-track-mismatch-teacher-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let adminUserId = "";
  let teacherUserId = "";
  let adminToken = "";
  let academicLevelId = "";
  let staleTrackId = "";
  let curriculumId = "";
  let classId = "";
  let schoolYearId = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
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
      data: { slug: schoolSlug, name: `E2E Track Mismatch School ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const admin = await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "E2E",
        email: adminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "SCHOOL_ADMIN" } },
      },
      select: { id: true },
    });
    adminUserId = admin.id;
    adminToken = jwtService.sign({ sub: adminUserId });

    const teacher = await prisma.user.create({
      data: {
        firstName: "Serge",
        lastName: "Belibi",
        email: teacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
      select: { id: true },
    });
    teacherUserId = teacher.id;

    const academicLevel = await prisma.academicLevel.create({
      data: { schoolId, code: `6E-${runId}`, label: "6ème" },
      select: { id: true },
    });
    academicLevelId = academicLevel.id;

    // Track kept on the class itself but no longer reflected by its
    // curriculum below — this is the exact drift observed in production.
    const staleTrack = await prisma.track.create({
      data: { schoolId, code: `GEN-${runId}`, label: "Général" },
      select: { id: true },
    });
    staleTrackId = staleTrack.id;

    const curriculum = await prisma.curriculum.create({
      data: {
        schoolId,
        name: `6EME - TRONC_COMMUN ${runId}`,
        academicLevelId,
        trackId: null,
      },
      select: { id: true },
    });
    curriculumId = curriculum.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `2026-2027-${runId}` },
      select: { id: true },
    });
    schoolYearId = schoolYear.id;

    const classroom = await prisma.class.create({
      data: {
        schoolId,
        schoolYearId,
        name: "6e B",
        academicLevelId,
        trackId: staleTrackId,
        curriculumId,
      },
      select: { id: true },
    });
    classId = classroom.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.class.deleteMany({ where: { id: classId } });
      await prisma.curriculum.deleteMany({ where: { id: curriculumId } });
      await prisma.track.deleteMany({ where: { schoolId } });
      await prisma.academicLevel.deleteMany({ where: { id: academicLevelId } });
      await prisma.schoolYear.deleteMany({ where: { id: schoolYearId } });
      await prisma.user.deleteMany({
        where: { id: { in: [adminUserId, teacherUserId] } },
      });
      await prisma.school.deleteMany({ where: { id: schoolId } });
    }
    if (app) {
      await app.close();
    }
  });

  it("confirms the class starts with a track/curriculum mismatch", async () => {
    const classroom = await prisma.class.findUniqueOrThrow({
      where: { id: classId },
      select: {
        trackId: true,
        curriculum: { select: { trackId: true } },
      },
    });

    expect(classroom.trackId).toBe(staleTrackId);
    expect(classroom.curriculum?.trackId).toBeNull();
  });

  it("assigns a referent teacher despite the pre-existing track/curriculum mismatch", async () => {
    const result = await apiJson(
      `/api/schools/${schoolSlug}/admin/classrooms/${classId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ referentTeacherUserId: teacherUserId }),
      },
    );

    expect(result.response.status).toBe(200);
    expect(result.body?.referentTeacher).toEqual(
      expect.objectContaining({ id: teacherUserId }),
    );

    const classroom = await prisma.class.findUniqueOrThrow({
      where: { id: classId },
      select: { referentTeacherUserId: true, trackId: true, curriculumId: true },
    });
    expect(classroom.referentTeacherUserId).toBe(teacherUserId);
    // The pre-existing mismatch is left untouched, not silently "fixed".
    expect(classroom.trackId).toBe(staleTrackId);
    expect(classroom.curriculumId).toBe(curriculumId);
  });

  it("still rejects an explicit track change that does not match the curriculum", async () => {
    const otherTrack = await prisma.track.create({
      data: { schoolId, code: `L-${runId}`, label: "Littéraire" },
      select: { id: true },
    });

    const result = await apiJson(
      `/api/schools/${schoolSlug}/admin/classrooms/${classId}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ trackId: otherTrack.id }),
      },
    );

    expect(result.response.status).toBe(400);
    expect(result.body?.message).toContain(
      "Track must match curriculum track",
    );

    await prisma.track.deleteMany({ where: { id: otherTrack.id } });
  });
});
