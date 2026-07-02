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
import { PUSH_QUEUE_NAME } from "../src/notifications/push.types.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(60_000);

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
const mockQueuePort = {
  add: jest.fn((queueName: string) => {
    if (queueName === MAIL_QUEUE_NAME || queueName === PUSH_QUEUE_NAME) {
      return Promise.reject(new Error("mail/push queue disabled for e2e"));
    }
    return Promise.resolve();
  }),
};

describe("Homework CRUD e2e", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl = "";

  const runId = randomSuffix();
  const schoolSlug = `e2e-homework-crud-${runId}`;
  const teacherEmail = `e2e-hw-crud-teacher-${runId}@example.test`;
  const studentEmail = `e2e-hw-crud-student-${runId}@example.test`;
  const parentEmail = `e2e-hw-crud-parent-${runId}@example.test`;
  const otherTeacherEmail = `e2e-hw-crud-other-teacher-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let schoolYearId = "";
  let classId = "";
  let subjectId = "";
  let teacherUserId = "";
  let studentUserId = "";
  let parentUserId = "";
  let otherTeacherUserId = "";
  let studentId = "";
  let teacherToken = "";
  let studentToken = "";
  let parentToken = "";
  let otherTeacherToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  function authHeaders(token: string, extra?: Record<string, string>) {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...extra,
    };
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

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: { slug: schoolSlug, name: `Homework CRUD e2e ${runId}` },
      select: { id: true },
    });
    schoolId = school.id;

    const schoolYear = await prisma.schoolYear.create({
      data: { schoolId, label: `${runId}` },
      select: { id: true },
    });
    schoolYearId = schoolYear.id;

    const klass = await prisma.class.create({
      data: { schoolId, schoolYearId, name: `6e CRUD ${runId}` },
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
        firstName: "Jean",
        lastName: "Enseignant",
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
      data: { schoolId, schoolYearId, classId, subjectId, teacherUserId },
    });

    const otherTeacher = await prisma.user.create({
      data: {
        firstName: "Paul",
        lastName: "Autre",
        email: otherTeacherEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "TEACHER" } },
        teacherProfiles: { create: { schoolId } },
      },
      select: { id: true },
    });
    otherTeacherUserId = otherTeacher.id;

    await prisma.teacherClassSubject.create({
      data: {
        schoolId,
        schoolYearId,
        classId,
        subjectId,
        teacherUserId: otherTeacherUserId,
      },
    });

    const studentUserRecord = await prisma.user.create({
      data: {
        firstName: "Marie",
        lastName: "Eleve",
        email: studentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "STUDENT" } },
      },
      select: { id: true },
    });
    studentUserId = studentUserRecord.id;

    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: studentUserId,
        firstName: "Marie",
        lastName: "Eleve",
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

    const parentUserRecord = await prisma.user.create({
      data: {
        firstName: "Pierre",
        lastName: "Parent",
        email: parentEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        memberships: { create: { schoolId, role: "PARENT" } },
      },
      select: { id: true },
    });
    parentUserId = parentUserRecord.id;

    await prisma.parentStudent.create({
      data: { schoolId, parentUserId, studentId },
    });

    teacherToken = await login(teacherEmail);
    studentToken = await login(studentEmail);
    parentToken = await login(parentEmail);
    otherTeacherToken = await login(otherTeacherEmail);
  });

  afterAll(async () => {
    if (prisma && schoolId) {
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [
              teacherUserId,
              studentUserId,
              parentUserId,
              otherTeacherUserId,
            ],
          },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  const homeworkUrl = () =>
    `/api/schools/${schoolSlug}/classes/${classId}/homework`;
  const hwDetailUrl = (id: string) =>
    `/api/schools/${schoolSlug}/classes/${classId}/homework/${id}`;

  // ─── CRUD ───────────────────────────────────────────────────────────────

  describe("POST /homework (créer)", () => {
    it("201 — l'enseignant crée un devoir", async () => {
      const { response, body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Lecture de la semaine",
          contentHtml: "<p>Lire le chapitre 1</p>",
          expectedAt: "2026-09-01T17:00:00.000Z",
        }),
      });

      expect(response.status).toBe(201);
      expect(body?.title).toBe("Lecture de la semaine");
      expect(body?.id).toBeTruthy();
    });

    it("403 — un étudiant ne peut pas créer un devoir", async () => {
      const { response } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(studentToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir non autorisé",
          expectedAt: "2026-09-01T17:00:00.000Z",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("400 — title manquant → erreur de validation", async () => {
      const { response } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({ subjectId, expectedAt: "2026-09-01T17:00:00.000Z" }),
      });

      expect(response.status).toBe(400);
    });

    it("crée un devoir avec pièces jointes", async () => {
      const { response, body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir avec pièces jointes",
          expectedAt: "2026-09-02T17:00:00.000Z",
          attachments: [
            {
              fileName: "fiche.pdf",
              fileUrl: "http://minio.local/fiche.pdf",
              sizeLabel: "120 Ko",
              mimeType: "application/pdf",
            },
          ],
        }),
      });

      expect(response.status).toBe(201);
      const attachments = body?.attachments as unknown[];
      expect(Array.isArray(attachments)).toBe(true);
      expect(attachments).toHaveLength(1);
      expect((attachments[0] as JsonObject).fileName).toBe("fiche.pdf");
    });
  });

  describe("GET /homework (lister)", () => {
    let createdHwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Liste test",
          expectedAt: "2026-09-10T17:00:00.000Z",
        }),
      });
      createdHwId = String(body?.id ?? "");
    });

    it("200 — l'enseignant voit la liste des devoirs", async () => {
      const { response, body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(teacherToken),
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it("200 — l'élève voit la liste avec studentId implicite", async () => {
      const { response, body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(studentToken),
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it("200 — le parent voit la liste avec le studentId de son enfant", async () => {
      const { response } = await apiJson(
        `${homeworkUrl()}?studentId=${studentId}`,
        { headers: authHeaders(parentToken) },
      );

      expect(response.status).toBe(200);
    });

    it("la liste inclut myDoneAt=null si le devoir n'est pas marqué fait", async () => {
      const { body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(studentToken),
      });

      const hw = (body as JsonObject[]).find(
        (item) => item.id === createdHwId,
      );
      expect(hw?.myDoneAt).toBeNull();
    });
  });

  describe("GET /homework/:id (detail)", () => {
    let hwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Detail test",
          expectedAt: "2026-09-15T17:00:00.000Z",
        }),
      });
      hwId = String(body?.id ?? "");
    });

    it("200 — l'enseignant consulte le détail", async () => {
      const { response, body } = await apiJson(hwDetailUrl(hwId), {
        headers: authHeaders(teacherToken),
      });

      expect(response.status).toBe(200);
      expect(body?.id).toBe(hwId);
      expect(Array.isArray(body?.comments)).toBe(true);
      expect(Array.isArray(body?.completionStatuses)).toBe(true);
    });

    it("200 — l'élève consulte le détail (sans completionStatuses d'autres élèves)", async () => {
      const { response, body } = await apiJson(hwDetailUrl(hwId), {
        headers: authHeaders(studentToken),
      });

      expect(response.status).toBe(200);
      expect(body?.id).toBe(hwId);
      expect((body?.completionStatuses as unknown[]).length).toBe(0);
    });

    it("404 — devoir inconnu → NotFoundException", async () => {
      const { response } = await apiJson(hwDetailUrl("unknown-hw"), {
        headers: authHeaders(teacherToken),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /homework/:id (modifier)", () => {
    let hwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Avant modification",
          expectedAt: "2026-09-20T17:00:00.000Z",
        }),
      });
      hwId = String(body?.id ?? "");
    });

    it("200 — l'auteur peut modifier son devoir", async () => {
      const { response, body } = await apiJson(hwDetailUrl(hwId), {
        method: "PATCH",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({ title: "Après modification" }),
      });

      expect(response.status).toBe(200);
      expect(body?.title).toBe("Après modification");
    });

    it("403 — un autre enseignant ne peut pas modifier le devoir", async () => {
      const { response } = await apiJson(hwDetailUrl(hwId), {
        method: "PATCH",
        headers: authHeaders(otherTeacherToken),
        body: JSON.stringify({ title: "Modif non autorisée" }),
      });

      expect(response.status).toBe(403);
    });

    it("403 — un étudiant ne peut pas modifier un devoir", async () => {
      const { response } = await apiJson(hwDetailUrl(hwId), {
        method: "PATCH",
        headers: authHeaders(studentToken),
        body: JSON.stringify({ title: "Modif non autorisée" }),
      });

      expect(response.status).toBe(403);
    });

    it("met à jour les pièces jointes et écrase les précédentes", async () => {
      const { response, body } = await apiJson(hwDetailUrl(hwId), {
        method: "PATCH",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          attachments: [
            {
              fileName: "nouveau.pdf",
              fileUrl: "http://minio.local/nouveau.pdf",
              sizeLabel: "50 Ko",
              mimeType: "application/pdf",
            },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const attachments = body?.attachments as unknown[];
      expect(attachments).toHaveLength(1);
      expect((attachments[0] as JsonObject).fileName).toBe("nouveau.pdf");
    });
  });

  describe("DELETE /homework/:id (supprimer)", () => {
    it("204 — l'auteur supprime son devoir", async () => {
      const { body: created } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "A supprimer",
          expectedAt: "2026-09-25T17:00:00.000Z",
        }),
      });
      const hwId = String(created?.id ?? "");

      const { response } = await api(hwDetailUrl(hwId), {
        method: "DELETE",
        headers: authHeaders(teacherToken),
      });

      expect(response.status).toBe(204);
    });

    it("403 — un autre enseignant ne peut pas supprimer le devoir d'un pair", async () => {
      const { body: created } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir pas supprimable par autre",
          expectedAt: "2026-09-26T17:00:00.000Z",
        }),
      });
      const hwId = String(created?.id ?? "");

      const { response } = await api(hwDetailUrl(hwId), {
        method: "DELETE",
        headers: authHeaders(otherTeacherToken),
      });

      expect(response.status).toBe(403);
    });

    it("403 — un parent ne peut pas supprimer un devoir", async () => {
      const { body: created } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir parent supprime",
          expectedAt: "2026-09-27T17:00:00.000Z",
        }),
      });
      const hwId = String(created?.id ?? "");

      const { response } = await api(hwDetailUrl(hwId), {
        method: "DELETE",
        headers: authHeaders(parentToken),
      });

      expect(response.status).toBe(403);
    });
  });

  // ─── Completion ─────────────────────────────────────────────────────────

  describe("PATCH /homework/:id/completion (marquer fait)", () => {
    let hwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir à marquer fait",
          expectedAt: "2026-10-01T17:00:00.000Z",
        }),
      });
      hwId = String(body?.id ?? "");
    });

    it("200 — l'élève marque le devoir comme fait (done=true)", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/completion`,
        {
          method: "PATCH",
          headers: authHeaders(studentToken),
          body: JSON.stringify({ done: true }),
        },
      );

      expect(response.status).toBe(200);
      expect(body?.myDoneAt).not.toBeNull();
    });

    it("200 — l'élève peut démarquer le devoir comme fait (done=false)", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/completion`,
        {
          method: "PATCH",
          headers: authHeaders(studentToken),
          body: JSON.stringify({ done: false }),
        },
      );

      expect(response.status).toBe(200);
      expect(body?.myDoneAt).toBeNull();
    });

    it("200 — le parent marque le devoir comme fait pour son enfant", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/completion`,
        {
          method: "PATCH",
          headers: authHeaders(parentToken),
          body: JSON.stringify({ done: true, studentId }),
        },
      );

      expect(response.status).toBe(200);
      expect(body?.myDoneAt).not.toBeNull();
    });

    it("403 — l'enseignant ne peut pas marquer un devoir comme fait", async () => {
      const { response } = await apiJson(
        `${hwDetailUrl(hwId)}/completion`,
        {
          method: "PATCH",
          headers: authHeaders(teacherToken),
          body: JSON.stringify({ done: true }),
        },
      );

      expect(response.status).toBe(403);
    });

    it("la liste reflète myDoneAt après completion", async () => {
      await apiJson(`${hwDetailUrl(hwId)}/completion`, {
        method: "PATCH",
        headers: authHeaders(studentToken),
        body: JSON.stringify({ done: true }),
      });

      const { body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(studentToken),
      });

      const hw = (body as JsonObject[]).find((item) => item.id === hwId);
      expect(hw?.myDoneAt).not.toBeNull();
    });
  });

  // ─── Comments ────────────────────────────────────────────────────────────

  describe("POST /homework/:id/comments (commenter)", () => {
    let hwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir commentable",
          expectedAt: "2026-10-05T17:00:00.000Z",
        }),
      });
      hwId = String(body?.id ?? "");
    });

    it("201 — l'enseignant publie un commentaire", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/comments`,
        {
          method: "POST",
          headers: authHeaders(teacherToken),
          body: JSON.stringify({ body: "Bon courage à tous !" }),
        },
      );

      expect(response.status).toBe(201);
      const comments = body?.comments as JsonObject[];
      expect(Array.isArray(comments)).toBe(true);
      expect(comments.some((c) => c.body === "Bon courage à tous !")).toBe(true);
    });

    it("le commentaire de l'enseignant a authorDisplayName et createdAt", async () => {
      const { body } = await apiJson(`${hwDetailUrl(hwId)}/comments`, {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({ body: "Commentaire avec horodatage" }),
      });

      const comments = body?.comments as JsonObject[];
      const comment = comments.find(
        (c) => c.body === "Commentaire avec horodatage",
      );
      expect(comment?.authorDisplayName).toBeTruthy();
      expect(comment?.createdAt).toBeTruthy();
      expect(comment?.mine).toBe(true);
    });

    it("201 — l'élève publie un commentaire", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/comments`,
        {
          method: "POST",
          headers: authHeaders(studentToken),
          body: JSON.stringify({ body: "J'ai une question !" }),
        },
      );

      expect(response.status).toBe(201);
      const comments = body?.comments as JsonObject[];
      expect(comments.some((c) => c.body === "J'ai une question !")).toBe(true);
    });

    it("201 — le parent publie un commentaire avec studentId", async () => {
      const { response, body } = await apiJson(
        `${hwDetailUrl(hwId)}/comments`,
        {
          method: "POST",
          headers: authHeaders(parentToken),
          body: JSON.stringify({
            body: "Commentaire du parent",
            studentId,
          }),
        },
      );

      expect(response.status).toBe(201);
      const comments = body?.comments as JsonObject[];
      expect(comments.some((c) => c.body === "Commentaire du parent")).toBe(
        true,
      );
    });

    it("400 — corps vide → erreur de validation", async () => {
      const { response } = await apiJson(`${hwDetailUrl(hwId)}/comments`, {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({ body: "   " }),
      });

      expect(response.status).toBe(400);
    });

    it("les commentaires sont ordonnés par date croissante", async () => {
      const { body } = await apiJson(`${hwDetailUrl(hwId)}`, {
        headers: authHeaders(teacherToken),
      });

      const comments = body?.comments as JsonObject[];
      const timestamps = comments.map((c) => new Date(c.createdAt as string).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  // ─── Résumé de complétion pour l'enseignant ────────────────────────────

  describe("summary de complétion (teacher view)", () => {
    let hwId = "";

    beforeAll(async () => {
      const { body } = await apiJson(homeworkUrl(), {
        method: "POST",
        headers: authHeaders(teacherToken),
        body: JSON.stringify({
          subjectId,
          title: "Devoir summary",
          expectedAt: "2026-10-10T17:00:00.000Z",
        }),
      });
      hwId = String(body?.id ?? "");
    });

    it("summary.totalStudents = 1 (un élève inscrit)", async () => {
      const { body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(teacherToken),
      });

      const hw = (body as JsonObject[]).find((item) => item.id === hwId);
      const summary = hw?.summary as JsonObject | null;
      expect(summary?.totalStudents).toBe(1);
      expect(summary?.doneStudents).toBe(0);
    });

    it("summary.doneStudents=1 après que l'élève a marqué fait", async () => {
      await apiJson(`${hwDetailUrl(hwId)}/completion`, {
        method: "PATCH",
        headers: authHeaders(studentToken),
        body: JSON.stringify({ done: true }),
      });

      const { body } = await apiJson(homeworkUrl(), {
        headers: authHeaders(teacherToken),
      });

      const hw = (body as JsonObject[]).find((item) => item.id === hwId);
      const summary = hw?.summary as JsonObject | null;
      expect(summary?.doneStudents).toBe(1);
    });

    it("completionStatuses dans le detail inclut l'état de chaque élève", async () => {
      const { body } = await apiJson(hwDetailUrl(hwId), {
        headers: authHeaders(teacherToken),
      });

      const statuses = body?.completionStatuses as JsonObject[];
      expect(statuses).toHaveLength(1);
      expect(statuses[0].studentId).toBe(studentId);
      expect(statuses[0].doneAt).not.toBeNull();
    });
  });
});
