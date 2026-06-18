import { Test } from "@nestjs/testing";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TestsService } from "./tests.service.js";

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
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
      "school-1",
      "case-1",
      { status: "FAILED", resultText: "Le bouton ne repond pas" },
      [],
    );

    expect(mailService.sendTestExecutionFailedNotification).toHaveBeenCalledTimes(2);
    expect(mailService.sendTestExecutionFailedNotification).toHaveBeenCalledWith(
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
      "school-1",
      "case-1",
      { status: "PASSED", resultText: "Tout fonctionne" },
      [],
    );

    expect(mailService.sendTestExecutionFailedNotification).not.toHaveBeenCalled();
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
      "school-1",
      "case-1",
      { status: "FAILED", resultText: "Crash au demarrage" },
      [],
    );

    expect(result.id).toBe("exec-3");
  });
});
