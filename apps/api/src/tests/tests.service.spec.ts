import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TestsService } from "./tests.service.js";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: "user-1",
    firstName: "Ada",
    lastName: "Lovelace",
    profileCompleted: true,
    isTester: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "SCHOOL_ADMIN" }],
    ...overrides,
  };
}

const TEST_CASE = {
  id: "case-1",
  title: "Connexion email",
  evidenceRequired: false,
  campaign: {
    title: "Campagne v1.2",
    school: { name: "Ecole Vogt", slug: "ecole-vogt" },
  },
};

const ADMIN_USERS = [
  { email: "admin@scolive.test", firstName: "Admin" },
  { email: "super@scolive.test", firstName: "Super" },
];

function makePrismaMock() {
  return {
    testCase: { findFirst: jest.fn() },
    testExecution: { create: jest.fn() },
    user: { findMany: jest.fn() },
  };
}

function makeMailServiceMock() {
  return {
    sendTestExecutionFailedNotification: jest.fn().mockResolvedValue(undefined),
  };
}

describe("TestsService#createExecution", () => {
  let service: TestsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let mailService: ReturnType<typeof makeMailServiceMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    mailService = makeMailServiceMock();
    prisma.testCase.findFirst.mockResolvedValue(TEST_CASE);
    prisma.user.findMany.mockResolvedValue(ADMIN_USERS);

    const module = await Test.createTestingModule({
      providers: [
        TestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaClientService, useValue: {} },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(TestsService);
  });

  it("notifies platform admins by email when an execution is FAILED", async () => {
    prisma.testExecution.create.mockResolvedValue({
      id: "exec-1",
      status: "FAILED",
      resultText: "Le bouton ne repond pas",
      comment: "Reproduit sur Android 13",
      deviceInfo: "android",
      appVersion: "1.0.0",
      executedAt: new Date(),
      attachments: [],
    });

    await service.createExecution(
      makeUser(),
      "case-1",
      { status: "FAILED", resultText: "Le bouton ne repond pas" },
      [],
    );

    expect(
      mailService.sendTestExecutionFailedNotification,
    ).toHaveBeenCalledTimes(2);
    expect(
      mailService.sendTestExecutionFailedNotification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@scolive.test",
        schoolName: "Ecole Vogt",
        schoolSlug: "ecole-vogt",
        campaignTitle: "Campagne v1.2",
        testCaseTitle: "Connexion email",
        testerFullName: "Ada Lovelace",
        resultText: "Le bouton ne repond pas",
        comment: "Reproduit sur Android 13",
      }),
    );
  });

  it("does not notify admins when an execution is PASSED", async () => {
    prisma.testExecution.create.mockResolvedValue({
      id: "exec-2",
      status: "PASSED",
      resultText: "Tout fonctionne",
      comment: null,
      deviceInfo: "android",
      appVersion: "1.0.0",
      executedAt: new Date(),
      attachments: [],
    });

    await service.createExecution(
      makeUser(),
      "case-1",
      { status: "PASSED", resultText: "Tout fonctionne" },
      [],
    );

    expect(
      mailService.sendTestExecutionFailedNotification,
    ).not.toHaveBeenCalled();
  });

  it("does not let a mail notification failure break the request", async () => {
    prisma.testExecution.create.mockResolvedValue({
      id: "exec-3",
      status: "FAILED",
      resultText: "Crash au demarrage",
      comment: null,
      deviceInfo: "android",
      appVersion: "1.0.0",
      executedAt: new Date(),
      attachments: [],
    });
    mailService.sendTestExecutionFailedNotification.mockRejectedValue(
      new Error("SMTP down"),
    );

    const result = await service.createExecution(
      makeUser(),
      "case-1",
      { status: "FAILED", resultText: "Crash au demarrage" },
      [],
    );

    expect(result.id).toBe("exec-3");
  });
});

function makeFullPrismaMock() {
  return {
    testCase: { findFirst: jest.fn(), update: jest.fn() },
    testCampaign: {
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    testCampaignAssignment: {
      upsert: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    testExecution: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
}

async function makeService(prisma: ReturnType<typeof makeFullPrismaMock>) {
  const module = await Test.createTestingModule({
    providers: [
      TestsService,
      { provide: PrismaService, useValue: prisma },
      { provide: MediaClientService, useValue: {} },
      { provide: MailService, useValue: makeMailServiceMock() },
    ],
  }).compile();

  return module.get(TestsService);
}

describe("TestsService#recycleTestCase", () => {
  it("marks the test case as recycled without touching execution history", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCase.findFirst.mockResolvedValue({ id: "case-1" });
    prisma.testCase.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: "case-1", recycledAt: data.recycledAt }),
    );
    const service = await makeService(prisma);

    const result = await service.recycleTestCase("case-1");

    expect(prisma.testCase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "case-1" },
        data: expect.objectContaining({ recycledAt: expect.any(Date) }),
      }),
    );
    expect(result.recycledAt).toBeInstanceOf(Date);
  });

  it("throws when the test case does not exist", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCase.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(service.recycleTestCase("missing")).rejects.toThrow(
      "Test case not found",
    );
  });
});

describe("TestsService#assignCampaign / unassignCampaign", () => {
  it("creates an assignment (upsert) for an existing campaign and tester", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCampaign.findFirst.mockResolvedValue({ id: "campaign-1" });
    prisma.user.findUnique.mockResolvedValue({
      id: "tester-1",
      isTester: true,
    });
    prisma.testCampaignAssignment.upsert.mockResolvedValue({
      id: "assignment-1",
      campaignId: "campaign-1",
      userId: "tester-1",
      note: "Prioritaire",
      createdAt: new Date(),
    });
    const service = await makeService(prisma);

    const result = await service.assignCampaign(
      makeUser({ id: "admin-1" }),
      "campaign-1",
      "tester-1",
      "Prioritaire",
    );

    expect(prisma.testCampaignAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          campaignId_userId: { campaignId: "campaign-1", userId: "tester-1" },
        },
      }),
    );
    expect(result.userId).toBe("tester-1");
  });

  it("throws when the campaign does not exist", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCampaign.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(
      service.assignCampaign(makeUser(), "missing", "tester-1"),
    ).rejects.toThrow("Test campaign not found");
  });

  it("throws when the tester does not exist", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCampaign.findFirst.mockResolvedValue({ id: "campaign-1" });
    prisma.user.findUnique.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(
      service.assignCampaign(makeUser(), "campaign-1", "missing"),
    ).rejects.toThrow("Tester not found");
  });

  it("removes an existing assignment", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCampaignAssignment.findUnique.mockResolvedValue({
      id: "assignment-1",
    });
    const service = await makeService(prisma);

    const result = await service.unassignCampaign("assignment-1");

    expect(prisma.testCampaignAssignment.delete).toHaveBeenCalledWith({
      where: { id: "assignment-1" },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("TestsService#listTesters", () => {
  it("aggregates per-tester campaign/execution stats", async () => {
    const prisma = makeFullPrismaMock();
    prisma.user.findMany.mockResolvedValue([
      {
        id: "tester-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@scolive.test",
        memberships: [{ school: { id: "school-1", name: "Ecole Vogt" } }],
        testExecutions: [
          {
            status: "PASSED",
            testCaseId: "case-1",
            testCase: { campaignId: "campaign-1" },
          },
          {
            status: "FAILED",
            testCaseId: "case-2",
            testCase: { campaignId: "campaign-1" },
          },
          {
            status: "PASSED",
            testCaseId: "case-3",
            testCase: { campaignId: "campaign-2" },
          },
        ],
      },
    ]);
    prisma.user.count.mockResolvedValue(1);
    const service = await makeService(prisma);

    const result = await service.listTesters();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      fullName: "Ada Lovelace",
      stats: {
        campaignsCount: 2,
        executionsCount: 3,
        passedCount: 2,
        failedCount: 1,
      },
    });
  });
});

describe("TestsService#getSynthesis", () => {
  it("rolls up campaign/case/execution counts globally", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testCampaign.groupBy.mockResolvedValue([
      { status: "DRAFT", _count: { _all: 1 } },
      { status: "ACTIVE", _count: { _all: 3 } },
    ]);
    prisma.testExecution.groupBy.mockResolvedValue([
      { status: "PASSED", _count: { _all: 8 } },
      { status: "FAILED", _count: { _all: 2 } },
    ]);
    prisma.user.count.mockResolvedValue(5);
    prisma.testExecution.count.mockResolvedValue(3);
    (prisma.testCase as { count?: jest.Mock }).count = jest
      .fn()
      .mockResolvedValue(12);
    const service = await makeService(prisma);

    const result = await service.getSynthesis();

    expect(result.campaigns).toMatchObject({
      draft: 1,
      active: 3,
      archived: 0,
      total: 4,
    });
    expect(result.totalCases).toBe(12);
    expect(result.executions).toMatchObject({
      total: 10,
      passed: 8,
      failed: 2,
      successRate: 0.8,
      pendingReview: 3,
    });
    expect(prisma.testExecution.count).toHaveBeenCalledWith({
      where: { status: { in: ["FAILED", "BLOCKED"] }, adminReviewedAt: null },
    });
    expect(result.testersCount).toBe(5);
  });
});

const EXECUTION_ROW = {
  id: "exec-1",
  status: "FAILED",
  resultText: "Le bouton plante",
  comment: "Reproduit a chaque fois",
  executedAt: new Date("2026-06-10T10:00:00Z"),
  adminReviewedAt: null,
  adminReviewNote: null,
  user: { id: "tester-1", firstName: "Ada", lastName: "Lovelace" },
  adminReviewedBy: null,
  testCase: {
    id: "case-1",
    title: "Connexion email",
    campaign: { id: "campaign-1", title: "Campagne v1.2" },
  },
};

describe("TestsService#listMyExecutions / getMyExecution", () => {
  it("lists only the current tester's executions", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findMany.mockResolvedValue([EXECUTION_ROW]);
    prisma.testExecution.count.mockResolvedValue(1);
    const service = await makeService(prisma);

    const result = await service.listMyExecutions(makeUser({ id: "tester-1" }));

    expect(prisma.testExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "tester-1" }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "exec-1",
      user: { fullName: "Ada Lovelace" },
      campaign: { id: "campaign-1", title: "Campagne v1.2" },
    });
  });

  it("rejects a non-tester user", async () => {
    const prisma = makeFullPrismaMock();
    const service = await makeService(prisma);

    await expect(
      service.listMyExecutions(makeUser({ isTester: false })),
    ).rejects.toThrow(
      "Ce module est reserve aux utilisateurs marques comme testeurs.",
    );
  });

  it("returns the execution detail when it belongs to the tester", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue({
      ...EXECUTION_ROW,
      deviceInfo: "android",
      appVersion: "1.0.0",
      createdAt: EXECUTION_ROW.executedAt,
      attachments: [],
    });
    const service = await makeService(prisma);

    const result = await service.getMyExecution(
      makeUser({ id: "tester-1" }),
      "exec-1",
    );

    expect(prisma.testExecution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exec-1", userId: "tester-1" },
      }),
    );
    expect(result.id).toBe("exec-1");
  });

  it("throws a localized not-found error (fr) when the execution does not belong to the tester", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(
      service.getMyExecution(makeUser({ id: "tester-1" }), "exec-other"),
    ).rejects.toThrow("Exécution de test introuvable.");
  });

  it("throws a localized not-found error (en) when preferredLocale is EN", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(
      service.getMyExecution(
        makeUser({ id: "tester-1", preferredLocale: "EN" }),
        "exec-other",
      ),
    ).rejects.toThrow("Test execution not found.");
  });
});

describe("TestsService#listAdminExecutions / getAdminExecution", () => {
  it("lists executions across all testers with combinable filters", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findMany.mockResolvedValue([EXECUTION_ROW]);
    prisma.testExecution.count.mockResolvedValue(1);
    const service = await makeService(prisma);

    const result = await service.listAdminExecutions({
      status: "FAILED",
      campaignId: "campaign-1",
      reviewed: false,
    });

    expect(prisma.testExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "FAILED",
          testCase: { campaignId: "campaign-1" },
          adminReviewedAt: null,
        },
      }),
    );
    expect(result.items).toHaveLength(1);
  });

  it("throws when the execution does not exist", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(service.getAdminExecution("missing")).rejects.toThrow(
      "Exécution de test introuvable.",
    );
  });
});

describe("TestsService#reviewExecution", () => {
  it("marks an execution as reviewed with a note", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue({ id: "exec-1" });
    prisma.testExecution.update.mockResolvedValue({
      id: "exec-1",
      adminReviewedAt: new Date(),
      adminReviewNote: "Corrige en v1.3",
      adminReviewedBy: { id: "admin-1", firstName: "Admin", lastName: "Root" },
    });
    const service = await makeService(prisma);

    const result = await service.reviewExecution(
      makeUser({ id: "admin-1" }),
      "exec-1",
      { reviewed: true, note: "Corrige en v1.3" },
    );

    expect(prisma.testExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exec-1" },
        data: expect.objectContaining({
          adminReviewedById: "admin-1",
          adminReviewNote: "Corrige en v1.3",
        }),
      }),
    );
    expect(result.adminReviewNote).toBe("Corrige en v1.3");
  });

  it("clears the review when reviewed is false", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue({ id: "exec-1" });
    prisma.testExecution.update.mockResolvedValue({
      id: "exec-1",
      adminReviewedAt: null,
      adminReviewNote: null,
      adminReviewedBy: null,
    });
    const service = await makeService(prisma);

    await service.reviewExecution(makeUser({ id: "admin-1" }), "exec-1", {
      reviewed: false,
    });

    expect(prisma.testExecution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          adminReviewedAt: null,
          adminReviewedById: null,
          adminReviewNote: null,
        },
      }),
    );
  });

  it("throws when the execution does not exist", async () => {
    const prisma = makeFullPrismaMock();
    prisma.testExecution.findFirst.mockResolvedValue(null);
    const service = await makeService(prisma);

    await expect(
      service.reviewExecution(makeUser(), "missing", { reviewed: true }),
    ).rejects.toThrow("Exécution de test introuvable.");
  });
});
