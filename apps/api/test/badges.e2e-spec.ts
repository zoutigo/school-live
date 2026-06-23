import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Badges API e2e", () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-badges-school-${runId}`;
  const parentEmail = `e2e-badges-parent-${runId}@example.test`;
  const teacherEmail = `e2e-badges-teacher-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let schoolYearId = "";
  let classId = "";
  let subjectId = "";
  let evaluationTypeId = "";
  let parentUserId = "";
  let teacherUserId = "";
  let studentId = "";
  let evaluationId = "";

  let parentToken = "";
  let teacherToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  async function login(email: string) {
    const { response, body } = await apiJson("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(201);
    return String((body as { accessToken: string }).accessToken);
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

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: { slug: schoolSlug, name: `E2E Badges School ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `Année ${runId}` },
      select: { id: true },
    });
    schoolYearId = schoolYear.id;
    await prisma.school.update({
      where: { id: schoolId },
      data: { activeSchoolYearId: schoolYearId },
    });

    const klass = await prisma.class.create({
      data: { schoolId, schoolYearId, name: `Classe ${runId}` },
      select: { id: true },
    });
    classId = klass.id;

    const subject = await prisma.subject.create({
      data: { schoolId, name: `Matière ${runId}` },
      select: { id: true },
    });
    subjectId = subject.id;

    const evaluationType = await prisma.evaluationType.create({
      data: {
        schoolId,
        code: `DST-${runId}`,
        label: `Devoir surveillé ${runId}`,
      },
      select: { id: true },
    });
    evaluationTypeId = evaluationType.id;

    const student = await prisma.student.create({
      data: { schoolId, firstName: "Léo", lastName: "Martin" },
      select: { id: true },
    });
    studentId = student.id;

    await prisma.enrollment.create({
      data: { schoolId, schoolYearId, studentId, classId, status: "ACTIVE" },
    });

    const parent = await prisma.user.create({
      data: {
        firstName: "Parent",
        lastName: "E2E",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "PARENT" } },
      },
      select: { id: true },
    });
    parentUserId = parent.id;

    await prisma.parentStudent.create({
      data: { schoolId, parentUserId, studentId },
    });

    const teacher = await prisma.user.create({
      data: {
        firstName: "Teacher",
        lastName: "E2E",
        email: teacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
      },
      select: { id: true },
    });
    teacherUserId = teacher.id;

    await prisma.teacherClassSubject.create({
      data: { schoolId, schoolYearId, teacherUserId, classId, subjectId },
    });

    await prisma.homework.create({
      data: {
        schoolId,
        schoolYearId,
        classId,
        subjectId,
        authorUserId: teacherUserId,
        title: "Exercices chapitre 3",
        expectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    const evaluation = await prisma.evaluation.create({
      data: {
        schoolId,
        schoolYearId,
        classId,
        subjectId,
        evaluationTypeId,
        authorUserId: teacherUserId,
        title: "Contrôle chapitre 3",
        maxScore: 20,
        term: "TERM_1",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    evaluationId = evaluation.id;

    await prisma.studentEvaluationScore.create({
      data: { evaluationId, studentId, score: 15, status: "ENTERED" },
    });

    await prisma.feedPost.create({
      data: {
        schoolId,
        authorUserId: teacherUserId,
        title: "Bienvenue",
        bodyHtml: "<p>Bienvenue à tous !</p>",
        audienceScope: "SCHOOL_ALL",
        audienceLabel: "Toute l'école",
      },
    });

    await prisma.studentLifeEvent.create({
      data: {
        schoolId,
        studentId,
        classId,
        schoolYearId,
        authorUserId: teacherUserId,
        type: "ABSENCE",
        occurredAt: new Date(),
        reason: "Retard",
      },
    });

    parentToken = await login(parentEmail);
    teacherToken = await login(teacherEmail);
  });

  afterAll(async () => {
    if (prisma && schoolId) {
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { id: { in: [parentUserId, teacherUserId].filter(Boolean) } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it("requires authentication", async () => {
    const { response } = await apiJson(
      `/api/schools/${schoolSlug}/me/unread-summary`,
    );
    expect(response.status).toBe(401);
  });

  it("reports homework pending, notes unread and discipline unread for a parent's child", async () => {
    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/me/unread-summary`,
      { headers: { authorization: `Bearer ${parentToken}` } },
    );

    expect(response.status).toBe(200);
    expect(body?.feedUnread).toBe(1);
    const children = body?.children as Array<Record<string, unknown>>;
    expect(children).toHaveLength(1);
    const child = children[0];
    expect(child.studentId).toBe(studentId);
    expect(child.homeworkPending).toBe(1);
    expect(child.notesUnread).toBe(1);
    expect(child.disciplineUnread).toBe(1);
    expect(Number(body?.total)).toBeGreaterThanOrEqual(4);
  });

  it("clears the feed badge after marking it read, ignoring the client-provided scopeRefId", async () => {
    const markRead = await apiJson(
      `/api/schools/${schoolSlug}/me/read-markers`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ scope: "FEED", scopeRefId: "some-other-id" }),
      },
    );
    expect(markRead.response.status).toBe(200);
    expect(markRead.body).toEqual({ ok: true });

    const { body } = await apiJson(
      `/api/schools/${schoolSlug}/me/unread-summary`,
      { headers: { authorization: `Bearer ${parentToken}` } },
    );
    expect(body?.feedUnread).toBe(0);
  });

  it("clears the notes badge after marking it read, without affecting discipline", async () => {
    const markRead = await apiJson(
      `/api/schools/${schoolSlug}/me/read-markers`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ scope: "NOTES", scopeRefId: studentId }),
      },
    );
    expect(markRead.response.status).toBe(200);
    expect(markRead.body).toEqual({ ok: true });

    const { body } = await apiJson(
      `/api/schools/${schoolSlug}/me/unread-summary`,
      { headers: { authorization: `Bearer ${parentToken}` } },
    );
    const child = (body?.children as Array<Record<string, unknown>>)[0];
    expect(child.notesUnread).toBe(0);
    expect(child.disciplineUnread).toBe(1);
  });

  it("rejects an unknown badge scope", async () => {
    const { response } = await apiJson(
      `/api/schools/${schoolSlug}/me/read-markers`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${parentToken}`,
        },
        body: JSON.stringify({ scope: "NOT_A_SCOPE", scopeRefId: studentId }),
      },
    );
    expect(response.status).toBe(400);
  });

  it("reports the teacher's missing scores for their published evaluation", async () => {
    const { response, body } = await apiJson(
      `/api/schools/${schoolSlug}/me/unread-summary`,
      { headers: { authorization: `Bearer ${teacherToken}` } },
    );

    expect(response.status).toBe(200);
    const teacherClasses = body?.teacherClasses as Array<
      Record<string, unknown>
    >;
    expect(teacherClasses).toHaveLength(1);
    expect(teacherClasses[0].classId).toBe(classId);
    // Roster has 1 active enrollment, 1 score already entered -> nothing left to grade.
    expect(teacherClasses[0].evaluationsToGrade).toBe(0);
  });
});
