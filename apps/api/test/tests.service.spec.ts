import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { TestsService } from "../src/tests/tests.service";

describe("TestsService", () => {
  const prisma = {
    testCampaign: {
      findMany: jest.fn(),
    },
    testCase: {
      findFirst: jest.fn(),
    },
    testExecution: {
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mediaClientService = {
    uploadImage: jest.fn(),
  };

  const mailService = {
    sendTestExecutionFailedNotification: jest.fn(),
  };

  const service = new TestsService(
    prisma as never,
    mediaClientService as never,
    mailService as never,
  );

  const testerUser = {
    id: "user-1",
    isTester: true,
    platformRoles: [],
    memberships: [{ schoolId: "school-1", role: "PARENT" as const }],
    profileCompleted: true,
    firstName: "Valery",
    lastName: "MBELE",
  };

  beforeEach(() => {
    prisma.testCampaign.findMany.mockReset();
    prisma.testCase.findFirst.mockReset();
    prisma.testExecution.create.mockReset();
    mediaClientService.uploadImage.mockReset();
  });

  it("blocks non-tester users from the module", async () => {
    await expect(
      service.listCampaigns({
        ...testerUser,
        isTester: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("computes campaign summaries from visible test cases", async () => {
    prisma.testCampaign.findMany.mockResolvedValue([
      {
        id: "camp-1",
        title: "Messagerie mobile",
        description: "Campagne parent",
        targetVersion: "1.2.0",
        startsAt: new Date("2026-06-10T08:00:00.000Z"),
        dueAt: new Date("2026-06-20T08:00:00.000Z"),
        status: "ACTIVE",
        testCases: [
          {
            id: "case-1",
            title: "Inbox",
            module: "Messagerie",
            priority: "HIGH",
            dueAt: null,
            evidenceRequired: false,
            recycledAt: null,
            executions: [
              {
                status: "PASSED",
                executedAt: new Date("2026-06-11T10:00:00.000Z"),
              },
            ],
            _count: { executions: 2 },
          },
          {
            id: "case-2",
            title: "Reply",
            module: "Messagerie",
            priority: "MEDIUM",
            dueAt: null,
            evidenceRequired: true,
            recycledAt: null,
            executions: [],
            _count: { executions: 0 },
          },
        ],
      },
    ]);

    const result = await service.listCampaigns(testerUser);

    expect(prisma.testCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "camp-1",
        summary: {
          totalCases: 2,
          completedCases: 1,
          totalExecutions: 2,
        },
      }),
    ]);
  });

  it("requires evidence when the test case says so", async () => {
    prisma.testCase.findFirst.mockResolvedValue({
      id: "case-1",
      evidenceRequired: true,
    });

    await expect(
      service.createExecution(
        testerUser,
        "case-1",
        {
          status: "FAILED",
          resultText: "Observed issue",
        },
        [],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uploads attachments and persists a new execution", async () => {
    prisma.testCase.findFirst.mockResolvedValue({
      id: "case-1",
      evidenceRequired: false,
    });
    mediaClientService.uploadImage.mockResolvedValue({
      url: "https://media.example.com/tests/capture.png",
      size: 1024,
      mimeType: "image/png",
    });
    prisma.testExecution.create.mockResolvedValue({
      id: "exec-1",
      status: "FAILED",
      resultText: "Observed issue",
      comment: "CTA missing",
      deviceInfo: "android",
      appVersion: "1.0.0",
      executedAt: new Date("2026-06-17T10:00:00.000Z"),
      attachments: [
        {
          id: "att-1",
          fileName: "capture.png",
          fileUrl: "https://media.example.com/tests/capture.png",
          mimeType: "image/png",
          sizeBytes: 1024,
        },
      ],
    });

    const attachment = {
      originalname: "capture.png",
      buffer: Buffer.from("img"),
      mimetype: "image/png",
      size: 1024,
    };

    const result = await service.createExecution(
      testerUser,
      "case-1",
      {
        status: "FAILED",
        resultText: "Observed issue",
        comment: "CTA missing",
        deviceInfo: "android",
        appVersion: "1.0.0",
      },
      [attachment],
    );

    expect(mediaClientService.uploadImage).toHaveBeenCalledWith(
      "test-execution-attachment",
      attachment,
    );
    expect(prisma.testExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          testCaseId: "case-1",
          userId: "user-1",
          status: "FAILED",
          attachments: {
            create: [
              {
                fileName: "capture.png",
                fileUrl: "https://media.example.com/tests/capture.png",
                mimeType: "image/png",
                sizeBytes: 1024,
              },
            ],
          },
        }),
      }),
    );
    expect(result.attachments[0].url).toBe(
      "https://media.example.com/tests/capture.png",
    );
  });
});
