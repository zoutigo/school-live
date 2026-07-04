/**
 * Tests unitaires pour les notifications parent lors d'un événement de discipline.
 *
 * Scénarios couverts :
 * - Email envoyé uniquement aux parents avec une adresse publique réelle
 * - Email NON envoyé aux parents avec un email auto-généré (@noemail.scolive.local)
 * - Email NON envoyé aux parents sans email (null)
 * - Push envoyé aux tokens actifs des parents
 * - Push NON envoyé quand aucun parent n'est lié à l'élève
 * - Gestion des erreurs : échec mail silencieux (flow non bloqué)
 * - Gestion des erreurs : échec push silencieux (flow non bloqué)
 * - Aucune notification si l'élève est introuvable
 * - Aucune notification si l'école est introuvable
 * - Contenu du push : titre et corps corrects pour chaque type d'événement
 * - Plusieurs parents : emails individuels + push groupé sur tous les tokens
 */
import { ManagementService } from "../src/management/management.service.js";

// ─── Types locaux ─────────────────────────────────────────────────────────────

const SCHOOL_ID = "school-1";
const STUDENT_ID = "student-1";
const EVENT_ID = "event-1";

function makeCurrentUser(overrides: { id?: string } = {}) {
  return {
    id: overrides.id ?? "teacher-1",
    activeRole: "TEACHER" as const,
    platformRoles: [] as string[],
    memberships: [{ schoolId: SCHOOL_ID, role: "TEACHER" }],
    profileCompleted: true,
    firstName: "Jean",
    lastName: "Dupont",
  };
}

function makeEvent(overrides: {
  type?: string;
  classId?: string | null;
} = {}) {
  return {
    id: EVENT_ID,
    schoolId: SCHOOL_ID,
    studentId: STUDENT_ID,
    classId: overrides.classId ?? "class-1",
    schoolYearId: "sy-1",
    authorUserId: "teacher-1",
    type: overrides.type ?? "ABSENCE",
    occurredAt: new Date("2026-07-01T08:00:00.000Z"),
    durationMinutes: null,
    justified: null,
    reason: "Maladie",
    comment: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    class: { id: "class-1", name: "6ème A" },
    schoolYear: { id: "sy-1", label: "2025-2026" },
    authorUser: { id: "teacher-1", firstName: "Jean", lastName: "Dupont", email: "jean@school.com" },
  };
}

// ─── Setup du service ─────────────────────────────────────────────────────────

function makePrisma(overrides: {
  student?: object | null;
  school?: object | null;
  pushTokens?: object[];
  lifeEvent?: object | null;
  studentInSchool?: boolean;
  activeSchoolYearId?: string | null;
  classContext?: object | null;
} = {}) {
  return {
    student: {
      findFirst: jest.fn().mockImplementation((args: { where: { id: string; schoolId: string } }) => {
        if (args.where.id === STUDENT_ID) {
          return Promise.resolve(
            overrides.student !== undefined ? overrides.student : {
              firstName: "Aminata",
              lastName: "Diallo",
              parentLinks: [],
            },
          );
        }
        return Promise.resolve(null);
      }),
    },
    school: {
      findUnique: jest.fn().mockResolvedValue(
        overrides.school !== undefined ? overrides.school : {
          name: "Lycée Victor Hugo",
          slug: "lycee-victor-hugo",
        },
      ),
    },
    mobilePushToken: {
      findMany: jest.fn().mockResolvedValue(
        overrides.pushTokens !== undefined ? overrides.pushTokens : [],
      ),
    },
    studentLifeEvent: {
      create: jest.fn().mockResolvedValue(makeEvent()),
      findFirst: jest.fn().mockResolvedValue(makeEvent()),
      update: jest.fn().mockResolvedValue(makeEvent()),
    },
    enrollment: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.classContext !== undefined ? overrides.classContext : null,
      ),
    },
    // used by ensureStudentInSchool
    $queryRaw: jest.fn(),
  };
}

function makeMail() {
  return {
    sendStudentLifeEventNotification: jest.fn().mockResolvedValue(undefined),
  };
}

function makePush() {
  return {
    sendStudentLifeEventNotification: jest.fn().mockResolvedValue(undefined),
  };
}

// Stub minimal pour les helpers internes qui font des lookups DB
function stubHelpers(service: ManagementService, schoolYearId = "sy-1") {
  (service as any).ensureStudentInSchool = jest.fn().mockResolvedValue(undefined);
  (service as any).getCurrentClassContextForStudent = jest.fn().mockResolvedValue({
    id: "class-1",
    schoolYearId,
  });
  (service as any).ensureClassInSchoolAndGet = jest.fn().mockResolvedValue({
    id: "class-1",
    schoolYearId,
  });
  (service as any).canWriteStudentLifeEvents = jest.fn().mockResolvedValue(true);
}

// ─── Suite principale ─────────────────────────────────────────────────────────

describe("notifyParentsAboutStudentLifeEvent — via createStudentLifeEvent", () => {
  let mail: ReturnType<typeof makeMail>;
  let push: ReturnType<typeof makePush>;

  beforeEach(() => {
    mail = makeMail();
    push = makePush();
  });

  // ── Email : adresse publique ────────────────────────────────────────────────

  it("envoie un email au parent ayant une adresse réelle", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "ABSENCE", reason: "Maladie" },
    );

    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledTimes(1);
    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maman@gmail.com",
        parentFirstName: "Fatou",
        studentFirstName: "Aminata",
        studentLastName: "Diallo",
        eventType: "ABSENCE",
        eventAction: "CREATED",
        locale: "fr",
      }),
    );
  });

  // ── Email : email auto-généré ignoré (BUG CORRIGÉ) ────────────────────────

  it("n'envoie PAS d'email au parent avec un email auto-généré", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "parent-1@noemail.scolive.local",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "ABSENCE", reason: "Maladie" },
    );

    expect(mail.sendStudentLifeEventNotification).not.toHaveBeenCalled();
  });

  // ── Email : email null ignoré ──────────────────────────────────────────────

  it("n'envoie PAS d'email au parent sans email (null)", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: null,
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "ABSENCE", reason: "Maladie" },
    );

    expect(mail.sendStudentLifeEventNotification).not.toHaveBeenCalled();
  });

  // ── Email : locale EN ──────────────────────────────────────────────────────

  it("utilise la locale 'en' pour un parent anglophone", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "dad@example.com",
              firstName: "John",
              preferredLocale: "EN",
            },
          },
        ],
      },
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "SANCTION", reason: "Comportement" },
    );

    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en" }),
    );
  });

  // ── Push : tokens collectés et notification envoyée ────────────────────────

  it("envoie une notification push aux tokens actifs des parents", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [
        { token: "ExponentPushToken[aaa111]" },
        { token: "ExponentPushToken[bbb222]" },
      ],
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "ABSENCE", reason: "Maladie" },
    );

    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["parent-1"] },
          isActive: true,
        }),
      }),
    );
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["ExponentPushToken[aaa111]", "ExponentPushToken[bbb222]"],
        title: "Vie scolaire · Aminata Diallo",
        body: "Absence",
        data: expect.objectContaining({
          type: "STUDENT_LIFE_EVENT",
          schoolSlug: "lycee-victor-hugo",
          studentId: STUDENT_ID,
        }),
      }),
    );
  });

  // ── Push : libellé correct pour chaque type ────────────────────────────────

  it.each([
    ["ABSENCE", "Absence"],
    ["RETARD", "Retard"],
    ["SANCTION", "Sanction"],
    ["PUNITION", "Punition"],
  ])(
    "push body = '%s' pour le type %s",
    async (type, expectedLabel) => {
      const prisma = makePrisma({
        student: {
          firstName: "Aminata",
          lastName: "Diallo",
          parentLinks: [
            {
              parent: {
                id: "parent-1",
                email: "maman@gmail.com",
                firstName: "Fatou",
                preferredLocale: "FR",
              },
            },
          ],
        },
        pushTokens: [{ token: "ExponentPushToken[tok1]" }],
      });
      // stub studentLifeEvent.create to return correct type
      prisma.studentLifeEvent.create.mockResolvedValue(
        makeEvent({ type }),
      );

      const service = new ManagementService(
        prisma as never,
        mail as never,
        undefined,
        push as never,
      );
      stubHelpers(service);

      await service.createStudentLifeEvent(
        SCHOOL_ID,
        makeCurrentUser() as never,
        STUDENT_ID,
        { type: type as never, reason: "Test" },
      );

      expect(push.sendStudentLifeEventNotification).toHaveBeenCalledWith(
        expect.objectContaining({ body: expectedLabel }),
      );
    },
  );

  // ── Push : non envoyé si aucun parent ─────────────────────────────────────

  it("ne tente pas de récupérer les tokens si aucun parent n'est lié", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [],
      },
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "ABSENCE", reason: "Maladie" },
    );

    expect(prisma.mobilePushToken.findMany).not.toHaveBeenCalled();
    expect(push.sendStudentLifeEventNotification).not.toHaveBeenCalled();
  });

  // ── Plusieurs parents ──────────────────────────────────────────────────────

  it("envoie un email séparé à chaque parent avec adresse réelle, push groupé sur tous les tokens", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
          {
            parent: {
              id: "parent-2",
              email: "papa@gmail.com",
              firstName: "Mamadou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [
        { token: "ExponentPushToken[p1tok]" },
        { token: "ExponentPushToken[p2tok]" },
      ],
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "RETARD", reason: "Transport" },
    );

    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledTimes(2);
    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "maman@gmail.com" }),
    );
    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: "papa@gmail.com" }),
    );

    // Les deux IDs parents sont passés à la requête push tokens
    expect(prisma.mobilePushToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: expect.arrayContaining(["parent-1", "parent-2"]) },
        }),
      }),
    );

    // Un seul appel push regroupant tous les tokens
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledTimes(1);
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: expect.arrayContaining([
          "ExponentPushToken[p1tok]",
          "ExponentPushToken[p2tok]",
        ]),
      }),
    );
  });

  // ── Parent avec email auto-généré reçoit quand même le push ───────────────

  it("envoie le push au parent avec email auto-généré même si l'email est ignoré", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "parent-1@noemail.scolive.local",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [{ token: "ExponentPushToken[tok1]" }],
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await service.createStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      { type: "PUNITION", reason: "Retard en classe" },
    );

    expect(mail.sendStudentLifeEventNotification).not.toHaveBeenCalled();
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({ tokens: ["ExponentPushToken[tok1]"] }),
    );
  });

  // ── Gestion d'erreur : élève introuvable ──────────────────────────────────

  it("ne lève pas d'erreur et n'envoie rien si l'élève est introuvable", async () => {
    const prisma = makePrisma({ student: null });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await expect(
      service.createStudentLifeEvent(
        SCHOOL_ID,
        makeCurrentUser() as never,
        STUDENT_ID,
        { type: "ABSENCE", reason: "Maladie" },
      ),
    ).resolves.toBeDefined();

    expect(mail.sendStudentLifeEventNotification).not.toHaveBeenCalled();
    expect(push.sendStudentLifeEventNotification).not.toHaveBeenCalled();
  });

  // ── Gestion d'erreur : école introuvable ──────────────────────────────────

  it("ne lève pas d'erreur et n'envoie rien si l'école est introuvable", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      school: null,
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await expect(
      service.createStudentLifeEvent(
        SCHOOL_ID,
        makeCurrentUser() as never,
        STUDENT_ID,
        { type: "ABSENCE", reason: "Maladie" },
      ),
    ).resolves.toBeDefined();

    expect(mail.sendStudentLifeEventNotification).not.toHaveBeenCalled();
    expect(push.sendStudentLifeEventNotification).not.toHaveBeenCalled();
  });

  // ── Gestion d'erreur : échec mail silencieux ──────────────────────────────

  it("continue le flow même si l'envoi d'email échoue", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [{ token: "ExponentPushToken[tok1]" }],
    });

    mail.sendStudentLifeEventNotification.mockRejectedValue(
      new Error("SMTP unavailable"),
    );

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await expect(
      service.createStudentLifeEvent(
        SCHOOL_ID,
        makeCurrentUser() as never,
        STUDENT_ID,
        { type: "ABSENCE", reason: "Maladie" },
      ),
    ).resolves.toBeDefined();

    // Le push est quand même envoyé malgré l'échec du mail
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledTimes(1);
  });

  // ── Gestion d'erreur : échec push silencieux ──────────────────────────────

  it("continue le flow même si la notification push échoue", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [{ token: "ExponentPushToken[tok1]" }],
    });

    push.sendStudentLifeEventNotification.mockRejectedValue(
      new Error("Push service down"),
    );

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);

    await expect(
      service.createStudentLifeEvent(
        SCHOOL_ID,
        makeCurrentUser() as never,
        STUDENT_ID,
        { type: "ABSENCE", reason: "Maladie" },
      ),
    ).resolves.toBeDefined();

    // L'email est quand même envoyé malgré l'échec du push
    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledTimes(1);
  });

  // ── Action UPDATED : updateStudentLifeEvent notifie aussi ─────────────────

  it("notifie également les parents lors d'une mise à jour d'événement", async () => {
    const prisma = makePrisma({
      student: {
        firstName: "Aminata",
        lastName: "Diallo",
        parentLinks: [
          {
            parent: {
              id: "parent-1",
              email: "maman@gmail.com",
              firstName: "Fatou",
              preferredLocale: "FR",
            },
          },
        ],
      },
      pushTokens: [{ token: "ExponentPushToken[tok1]" }],
    });

    const service = new ManagementService(
      prisma as never,
      mail as never,
      undefined,
      push as never,
    );
    stubHelpers(service);
    (service as any).canWriteStudentLifeEvents = jest
      .fn()
      .mockResolvedValue(true);
    (service as any).hasSchoolRole = jest.fn().mockReturnValue(false);

    await service.updateStudentLifeEvent(
      SCHOOL_ID,
      makeCurrentUser() as never,
      STUDENT_ID,
      EVENT_ID,
      { reason: "Correction motif" },
    );

    expect(mail.sendStudentLifeEventNotification).toHaveBeenCalledWith(
      expect.objectContaining({ eventAction: "UPDATED" }),
    );
    expect(push.sendStudentLifeEventNotification).toHaveBeenCalledTimes(1);
  });
});
