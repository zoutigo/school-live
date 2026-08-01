import "reflect-metadata";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module.js";
import { EMAIL_PORT } from "../src/infrastructure/email/email.port.js";
import { QUEUE_PORT } from "../src/infrastructure/messaging/queue.port.js";
import { MAIL_QUEUE_NAME } from "../src/mail/mail.types.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

type JsonObject = Record<string, unknown>;

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

jest.setTimeout(30_000);

describe("Contact submissions API e2e", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl = "";

  const mockEmailPort = {
    sendTemporaryPasswordEmail: jest.fn().mockResolvedValue(undefined),
    sendStudentLifeEventNotification: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendInternalMessageNotification: jest.fn().mockResolvedValue(undefined),
    sendTimetableChangeNotification: jest.fn().mockResolvedValue(undefined),
    sendTestExecutionFailedNotification: jest.fn().mockResolvedValue(undefined),
    sendHomeworkCreatedNotification: jest.fn().mockResolvedValue(undefined),
    sendRoomStatusChangeNotification: jest.fn().mockResolvedValue(undefined),
    sendGradePublishedNotification: jest.fn().mockResolvedValue(undefined),
    sendContactFormSubmissionNotification: jest
      .fn()
      .mockResolvedValue(undefined),
  };

  const mockQueuePort = {
    add: jest.fn((queueName: string) => {
      if (queueName === MAIL_QUEUE_NAME) {
        return Promise.reject(new Error("mail queue disabled for e2e"));
      }
      return Promise.resolve();
    }),
  };

  const runId = randomSuffix();
  const superAdminEmail = `e2e-contact-sub-super-${runId}@example.test`;
  const schoolAdminEmail = `e2e-contact-sub-school-${runId}@example.test`;
  const password = "StrongPass1";

  let schoolId = "";
  let superAdminUserId = "";
  let schoolAdminUserId = "";
  let superAdminToken = "";
  let schoolAdminToken = "";

  async function api(path: string, init?: RequestInit) {
    return fetch(`${baseUrl}${path}`, init);
  }

  async function apiJson(path: string, init?: RequestInit) {
    const response = await api(path, init);
    const body = (await response.json().catch(() => null)) as JsonObject | null;
    return { response, body };
  }

  function validPayload(overrides: Partial<JsonObject> = {}) {
    return {
      name: "Jean Dupont",
      email: `visiteur-${randomSuffix()}@example.test`,
      phone: "690000000",
      subject: "Question sur les tarifs",
      message: "Bonjour, je souhaite en savoir plus sur vos offres Scolive.",
      ...overrides,
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_PORT)
      .useValue(mockEmailPort)
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
    jwtService = app.get(JwtService);

    const passwordHash = await bcrypt.hash(password, 10);

    const school = await prisma.school.create({
      data: {
        slug: `e2e-contact-sub-school-${runId}`,
        name: `E2E Contact Submissions School ${runId}`,
      },
      select: { id: true },
    });
    schoolId = school.id;

    const superAdmin = await prisma.user.create({
      data: {
        firstName: "Super",
        lastName: "Admin",
        email: superAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        activeRole: "SUPER_ADMIN",
        platformRoles: { create: { role: "SUPER_ADMIN" } },
      },
      select: { id: true },
    });
    superAdminUserId = superAdmin.id;

    const schoolAdmin = await prisma.user.create({
      data: {
        firstName: "School",
        lastName: "Admin",
        email: schoolAdminEmail,
        passwordHash,
        mustChangePassword: false,
        profileCompleted: true,
        activeRole: "SCHOOL_ADMIN",
        memberships: { create: { schoolId, role: "SCHOOL_ADMIN" } },
      },
      select: { id: true },
    });
    schoolAdminUserId = schoolAdmin.id;

    superAdminToken = jwtService.sign({ sub: superAdminUserId });
    schoolAdminToken = jwtService.sign({ sub: schoolAdminUserId });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.contactSubmission.deleteMany({});
      await prisma.school.deleteMany({ where: { id: schoolId } });
      await prisma.user.deleteMany({
        where: { id: { in: [superAdminUserId, schoolAdminUserId] } },
      });
    }

    if (app) {
      await app.close();
    }
  });

  it("rejette une soumission avec un email invalide", async () => {
    const result = await apiJson(
      "/api/public/site-content/contact-submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload({ email: "pas-un-email" })),
      },
    );

    expect(result.response.status).toBe(400);
    expect(
      mockEmailPort.sendContactFormSubmissionNotification,
    ).not.toHaveBeenCalled();
  });

  it("rejette une soumission avec un téléphone qui ne fait pas 9 chiffres", async () => {
    const result = await apiJson(
      "/api/public/site-content/contact-submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload({ phone: "12345" })),
      },
    );

    expect(result.response.status).toBe(400);
  });

  it("crée une soumission valide, sanitize le contenu et envoie le mail de notification", async () => {
    const payload = validPayload({
      name: "<b>Marie</b> Curie",
      message: "Bonjour <script>alert(1)</script>, message légitime.",
    });

    const result = await apiJson(
      "/api/public/site-content/contact-submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(result.response.status).toBe(201);
    expect(result.body).toEqual({ success: true });

    expect(
      mockEmailPort.sendContactFormSubmissionNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Marie Curie",
        email: payload.email,
        message: expect.stringContaining("message légitime."),
      }),
    );
    const [callPayload] =
      mockEmailPort.sendContactFormSubmissionNotification.mock.calls.at(-1) as [
        { message: string },
      ];
    expect(callPayload.message).not.toContain("<script>");

    const stored = await prisma.contactSubmission.findFirst({
      where: { email: payload.email },
    });
    expect(stored?.name).toBe("Marie Curie");
    expect(stored?.readAt).toBeNull();
  });

  it("ignore silencieusement une soumission avec honeypot rempli", async () => {
    const payload = validPayload({ website: "http://spam.example" });

    const result = await apiJson(
      "/api/public/site-content/contact-submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(result.response.status).toBe(201);
    const stored = await prisma.contactSubmission.findFirst({
      where: { email: payload.email },
    });
    expect(stored).toBeNull();
  });

  it("limite la fréquence de soumission par IP", async () => {
    // Repart d'un compteur propre : les tests précédents ont déjà créé des
    // soumissions depuis la même IP (127.0.0.1 en environnement de test).
    await prisma.contactSubmission.deleteMany({});

    for (let i = 0; i < 5; i += 1) {
      const result = await apiJson(
        "/api/public/site-content/contact-submissions",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validPayload()),
        },
      );
      expect(result.response.status).toBe(201);
    }

    const blocked = await apiJson(
      "/api/public/site-content/contact-submissions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validPayload()),
      },
    );
    expect(blocked.response.status).toBe(429);
  });

  it("refuse l'accès admin à un utilisateur non SUPER_ADMIN/ADMIN", async () => {
    const result = await apiJson(
      "/api/site-content/admin/contact-submissions",
      {
        headers: { authorization: `Bearer ${schoolAdminToken}` },
      },
    );

    expect(result.response.status).toBe(403);
  });

  it("liste les soumissions et marque comme lue au premier accès au détail", async () => {
    // Le test précédent a saturé la limite de fréquence pour cette IP.
    await prisma.contactSubmission.deleteMany({});

    const payload = validPayload();
    await apiJson("/api/public/site-content/contact-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const list = await apiJson("/api/site-content/admin/contact-submissions", {
      headers: { authorization: `Bearer ${superAdminToken}` },
    });
    expect(list.response.status).toBe(200);
    const listBody = list.body as {
      items: Array<{ id: string; email: string }>;
      total: number;
    };
    const created = listBody.items.find((item) => item.email === payload.email);
    expect(created).toBeDefined();

    const detailFirst = await apiJson(
      `/api/site-content/admin/contact-submissions/${created!.id}`,
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );
    expect(detailFirst.response.status).toBe(200);
    expect(detailFirst.body?.readAt).not.toBeNull();

    const detailSecond = await apiJson(
      `/api/site-content/admin/contact-submissions/${created!.id}`,
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );
    expect(detailSecond.body?.readAt).toBe(detailFirst.body?.readAt);
  });

  it("retourne 404 pour une soumission inexistante", async () => {
    const result = await apiJson(
      "/api/site-content/admin/contact-submissions/not-an-id",
      { headers: { authorization: `Bearer ${superAdminToken}` } },
    );
    expect(result.response.status).toBe(404);
  });
});
