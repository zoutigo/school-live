import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module.js";
import { EMAIL_PORT } from "../src/infrastructure/email/email.port.js";
import { QUEUE_PORT } from "../src/infrastructure/messaging/queue.port.js";
import { PUSH_PORT } from "../src/infrastructure/push/push.port.js";
import { MAIL_QUEUE_NAME } from "../src/mail/mail.types.js";
import { HomeworkNotificationsProjectionService } from "../src/notifications/homework-notifications-projection.service.js";
import { PUSH_QUEUE_NAME } from "../src/notifications/push.types.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Homework created notifications e2e (mail + push)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl = "";
  let projectionService: HomeworkNotificationsProjectionService;

  const mockEmailPort = {
    sendTemporaryPasswordEmail: jest.fn().mockResolvedValue(undefined),
    sendStudentLifeEventNotification: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendInternalMessageNotification: jest.fn().mockResolvedValue(undefined),
    sendTimetableChangeNotification: jest.fn().mockResolvedValue(undefined),
    sendTestExecutionFailedNotification: jest.fn().mockResolvedValue(undefined),
    sendHomeworkCreatedNotification: jest.fn().mockResolvedValue(undefined),
  };
  const mockPushPort = {
    sendTimetableChangeNotification: jest.fn().mockResolvedValue(undefined),
    sendHomeworkCreatedNotification: jest.fn().mockResolvedValue(undefined),
  };
  // No worker process consumes BullMQ jobs in this test process. The
  // homework-notification dispatch queue must still succeed (it has no
  // fallback), but mail/push job dispatch is forced to fail so
  // MailService/PushService fall back to their documented synchronous
  // path, calling the mocked ports directly and making the test
  // deterministic without a live worker.
  const mockQueuePort = {
    add: jest.fn((queueName: string) => {
      if (queueName === MAIL_QUEUE_NAME || queueName === PUSH_QUEUE_NAME) {
        return Promise.reject(new Error("mail/push queue disabled for e2e"));
      }
      return Promise.resolve();
    }),
  };

  const runId = randomSuffix();
  const schoolSlug = `e2e-homework-notif-${runId}`;
  const teacherEmail = `e2e-hw-teacher-${runId}@example.test`;
  const studentEmail = `e2e-hw-student-${runId}@example.test`;
  const parentEmail = `e2e-hw-parent-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let schoolYearId = "";
  let classId = "";
  let subjectId = "";
  let teacherUserId = "";
  let studentUserId = "";
  let parentUserId = "";
  let studentId = "";
  let accessToken = "";

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
    return String(body?.accessToken ?? "");
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_PORT)
      .useValue(mockEmailPort)
      .overrideProvider(PUSH_PORT)
      .useValue(mockPushPort)
      .overrideProvider(QUEUE_PORT)
      .useValue(mockQueuePort)
      .compile();

    app = moduleRef.createNestApplication();
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
    projectionService = app.get(HomeworkNotificationsProjectionService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: { slug: schoolSlug, name: `Homework notif school ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `${runId}` },
      select: { id: true },
    });
    schoolYearId = schoolYear.id;

    const klass = await prisma.class.create({
      data: { schoolId, schoolYearId, name: `6e Notif ${runId}` },
      select: { id: true },
    });
    classId = klass.id;

    const subject = await prisma.subject.create({
      data: { schoolId, name: `Francais ${runId}` },
      select: { id: true },
    });
    subjectId = subject.id;

    const teacher = await prisma.user.create({
      data: {
        firstName: "Albert",
        lastName: "Mvondo",
        email: teacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
        teacherProfiles: { create: { schoolId } },
      },
      select: { id: true },
    });
    teacherUserId = teacher.id;

    await prisma.teacherClassSubject.create({
      data: {
        schoolId,
        schoolYearId,
        classId,
        subjectId,
        teacherUserId,
      },
    });

    const studentUser = await prisma.user.create({
      data: {
        firstName: "Lisa",
        lastName: "Mbele",
        email: studentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "STUDENT" } },
      },
      select: { id: true },
    });
    studentUserId = studentUser.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: studentUserId,
        firstName: "Lisa",
        lastName: "Mbele",
      },
      select: { id: true },
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

    const parentUser = await prisma.user.create({
      data: {
        firstName: "Robert",
        lastName: "Mbele",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "PARENT" } },
      },
      select: { id: true },
    });
    parentUserId = parentUser.id;

    await prisma.parentStudent.create({
      data: { schoolId, parentUserId, studentId },
    });

    await prisma.mobilePushToken.create({
      data: {
        userId: parentUserId,
        token: `ExponentPushToken[parent-${runId}]`,
      },
    });
    await prisma.mobilePushToken.create({
      data: {
        userId: studentUserId,
        token: `ExponentPushToken[student-${runId}]`,
      },
    });

    accessToken = await login(teacherEmail);
  });

  afterAll(async () => {
    if (prisma && schoolId) {
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { id: { in: [teacherUserId, studentUserId, parentUserId] } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it("creates the homework via the API and lets the parent and the student be notified by mail and push", async () => {
    const created = await apiJson(
      `/api/schools/${schoolSlug}/classes/${classId}/homework`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subjectId,
          title: "Conjugaison du present",
          contentHtml: "<p>Exercices 1 a 5</p>",
          expectedAt: "2026-06-01T17:00:00.000Z",
        }),
      },
    );
    expect(created.response.status).toBe(201);
    const homeworkId = String(created.body?.id ?? "");
    expect(homeworkId).toBeTruthy();

    // The HTTP call enqueues the job on BullMQ; no worker process runs inside
    // this test, so we invoke the same projection logic directly (real DB,
    // mocked mail/push ports) to verify the end-to-end recipient resolution.
    await projectionService.project({ schoolId, classId, homeworkId });

    expect(mockEmailPort.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: studentEmail,
        title: "Conjugaison du present",
      }),
    );
    expect(mockEmailPort.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: parentEmail,
        title: "Conjugaison du present",
      }),
    );

    expect(mockPushPort.sendHomeworkCreatedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.arrayContaining([
          `ExponentPushToken[parent-${runId}]`,
          `ExponentPushToken[student-${runId}]`,
        ]),
        data: expect.objectContaining({
          type: "HOMEWORK_CREATED",
          schoolSlug,
          classId,
          homeworkId,
        }),
      }),
    );
  });
});
