import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AppRole,
  Prisma,
  TestCampaignStatus,
  TestExecutionStatus,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MediaClientService } from "../media-client/media-client.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { CreateTestCampaignDto } from "./dto/create-test-campaign.dto.js";
import type { CreateTestCaseDto } from "./dto/create-test-case.dto.js";
import type { UpdateTestCampaignDto } from "./dto/update-test-campaign.dto.js";
import type { UpdateTestCaseDto } from "./dto/update-test-case.dto.js";
import {
  testsLocaleFromUser,
  translateTestsError,
} from "./tests.translations.js";

type UploadedAttachment = {
  originalname?: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
};

const EXECUTION_COMPLETED_STATUSES = new Set<TestExecutionStatus>([
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
]);

@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClientService: MediaClientService,
  ) {}

  assertTester(user: AuthenticatedUser) {
    if (!user.isTester) {
      throw new ForbiddenException(
        translateTestsError(
          testsLocaleFromUser(user),
          "tests.errors.testerOnly",
        ),
      );
    }
  }

  async listCampaigns(user: AuthenticatedUser, schoolId: string) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const campaigns = await this.prisma.testCampaign.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        testCases: {
          some: this.buildCaseVisibilityWhere(roles),
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        targetVersion: true,
        startsAt: true,
        dueAt: true,
        status: true,
        testCases: {
          where: this.buildCaseVisibilityWhere(roles),
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            module: true,
            priority: true,
            dueAt: true,
            evidenceRequired: true,
            executions: {
              where: { userId: user.id },
              orderBy: [{ executedAt: "desc" }],
              take: 1,
              select: {
                status: true,
                executedAt: true,
              },
            },
            _count: {
              select: {
                executions: true,
              },
            },
          },
        },
      },
    });

    return campaigns.map((campaign) => {
      const completedCount = campaign.testCases.filter((testCase) => {
        const latest = testCase.executions[0];
        return latest && EXECUTION_COMPLETED_STATUSES.has(latest.status);
      }).length;

      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        targetVersion: campaign.targetVersion,
        startsAt: campaign.startsAt,
        dueAt: campaign.dueAt,
        status: campaign.status,
        summary: {
          totalCases: campaign.testCases.length,
          completedCases: completedCount,
          totalExecutions: campaign.testCases.reduce(
            (total, testCase) => total + testCase._count.executions,
            0,
          ),
        },
      };
    });
  }

  async getCampaign(
    user: AuthenticatedUser,
    schoolId: string,
    campaignId: string,
  ) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const campaign = await this.prisma.testCampaign.findFirst({
      where: {
        id: campaignId,
        schoolId,
        status: "ACTIVE",
        testCases: {
          some: this.buildCaseVisibilityWhere(roles),
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        targetVersion: true,
        startsAt: true,
        dueAt: true,
        status: true,
        testCases: {
          where: this.buildCaseVisibilityWhere(roles),
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            module: true,
            expectedResult: true,
            priority: true,
            dueAt: true,
            evidenceRequired: true,
            executions: {
              where: { userId: user.id },
              orderBy: [{ executedAt: "desc" }],
              take: 1,
              select: {
                id: true,
                status: true,
                executedAt: true,
              },
            },
            _count: {
              select: {
                executions: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(
        translateTestsError(
          testsLocaleFromUser(user),
          "tests.errors.campaignNotFound",
        ),
      );
    }

    return {
      ...campaign,
      summary: {
        totalCases: campaign.testCases.length,
        completedCases: campaign.testCases.filter((testCase) => {
          const latest = testCase.executions[0];
          return latest && EXECUTION_COMPLETED_STATUSES.has(latest.status);
        }).length,
      },
      testCases: campaign.testCases.map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        module: testCase.module,
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
        dueAt: testCase.dueAt,
        evidenceRequired: testCase.evidenceRequired,
        totalExecutions: testCase._count.executions,
        latestExecution: testCase.executions[0] ?? null,
      })),
    };
  }

  async getTestCase(
    user: AuthenticatedUser,
    schoolId: string,
    testCaseId: string,
  ) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const testCase = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        campaign: {
          schoolId,
          status: "ACTIVE",
        },
        ...this.buildCaseVisibilityWhere(roles),
      },
      select: {
        id: true,
        title: true,
        module: true,
        objective: true,
        preconditions: true,
        steps: true,
        expectedResult: true,
        orderIndex: true,
        priority: true,
        evidenceRequired: true,
        dueAt: true,
        campaign: {
          select: {
            id: true,
            title: true,
            dueAt: true,
            targetVersion: true,
          },
        },
        audienceRoles: {
          orderBy: { role: "asc" },
          select: {
            role: true,
          },
        },
        executions: {
          orderBy: [{ executedAt: "desc" }],
          select: {
            id: true,
            status: true,
            resultText: true,
            comment: true,
            deviceInfo: true,
            appVersion: true,
            executedAt: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            attachments: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
      },
    });

    if (!testCase) {
      throw new NotFoundException(
        translateTestsError(
          testsLocaleFromUser(user),
          "tests.errors.testCaseNotFound",
        ),
      );
    }

    const latestExecutionByUser = new Map<
      string,
      {
        userId: string;
        fullName: string;
        status: TestExecutionStatus;
        executedAt: Date;
      }
    >();

    for (const execution of testCase.executions) {
      if (latestExecutionByUser.has(execution.user.id)) continue;
      latestExecutionByUser.set(execution.user.id, {
        userId: execution.user.id,
        fullName:
          `${execution.user.firstName} ${execution.user.lastName}`.trim(),
        status: execution.status,
        executedAt: execution.executedAt,
      });
    }

    const latestOwnExecution =
      testCase.executions.find((execution) => execution.user.id === user.id) ??
      null;

    return {
      id: testCase.id,
      title: testCase.title,
      module: testCase.module,
      objective: testCase.objective,
      preconditions: testCase.preconditions,
      steps: this.toStringArray(testCase.steps),
      expectedResult: testCase.expectedResult,
      orderIndex: testCase.orderIndex,
      priority: testCase.priority,
      evidenceRequired: testCase.evidenceRequired,
      dueAt: testCase.dueAt,
      campaign: testCase.campaign,
      audienceRoles: testCase.audienceRoles.map((entry) => entry.role),
      latestOwnExecution,
      executionSummary: {
        totalExecutions: testCase.executions.length,
        passed: testCase.executions.filter((entry) => entry.status === "PASSED")
          .length,
        failed: testCase.executions.filter((entry) => entry.status === "FAILED")
          .length,
        blocked: testCase.executions.filter(
          (entry) => entry.status === "BLOCKED",
        ).length,
      },
      completedByUsers: Array.from(latestExecutionByUser.values()),
      executions: testCase.executions.map((execution) => ({
        id: execution.id,
        status: execution.status,
        resultText: execution.resultText,
        comment: execution.comment,
        deviceInfo: execution.deviceInfo,
        appVersion: execution.appVersion,
        executedAt: execution.executedAt,
        createdAt: execution.createdAt,
        user: {
          id: execution.user.id,
          fullName:
            `${execution.user.firstName} ${execution.user.lastName}`.trim(),
        },
        attachments: execution.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          url: attachment.fileUrl,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
      })),
    };
  }

  async createExecution(
    user: AuthenticatedUser,
    schoolId: string,
    testCaseId: string,
    payload: {
      status: TestExecutionStatus;
      resultText: string;
      comment?: string;
      deviceInfo?: string;
      appVersion?: string;
    },
    attachments: UploadedAttachment[],
  ) {
    this.assertTester(user);
    const locale = testsLocaleFromUser(user);
    const roles = this.resolveVisibleRoles(user);
    const testCase = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        campaign: {
          schoolId,
          status: "ACTIVE",
        },
        ...this.buildCaseVisibilityWhere(roles),
      },
      select: {
        id: true,
        evidenceRequired: true,
      },
    });

    if (!testCase) {
      throw new NotFoundException(
        translateTestsError(locale, "tests.errors.testCaseNotFound"),
      );
    }

    if (!payload.resultText.trim()) {
      throw new BadRequestException(
        translateTestsError(locale, "tests.errors.executionResultRequired"),
      );
    }

    if (testCase.evidenceRequired && attachments.length === 0) {
      throw new BadRequestException(
        translateTestsError(locale, "tests.errors.attachmentsMissing"),
      );
    }

    const uploadedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        const uploaded = await this.mediaClientService.uploadImage(
          "test-execution-attachment",
          attachment,
        );
        return {
          fileName: attachment.originalname?.trim() || "capture",
          fileUrl: uploaded.url,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.size,
        };
      }),
    );

    const execution = await this.prisma.testExecution.create({
      data: {
        testCaseId: testCase.id,
        userId: user.id,
        status: payload.status,
        resultText: payload.resultText.trim(),
        comment: payload.comment?.trim() || null,
        deviceInfo: payload.deviceInfo?.trim() || null,
        appVersion: payload.appVersion?.trim() || null,
        attachments: {
          create: uploadedAttachments,
        },
      },
      select: {
        id: true,
        status: true,
        resultText: true,
        comment: true,
        deviceInfo: true,
        appVersion: true,
        executedAt: true,
        attachments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
      },
    });

    return {
      ...execution,
      attachments: execution.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        url: attachment.fileUrl,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      })),
    };
  }

  async listAdminCampaigns(schoolId: string) {
    const campaigns = await this.prisma.testCampaign.findMany({
      where: { schoolId },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        targetVersion: true,
        startsAt: true,
        dueAt: true,
        status: true,
        _count: {
          select: {
            testCases: true,
          },
        },
      },
    });

    return campaigns.map((campaign) => ({
      ...campaign,
      testCasesCount: campaign._count.testCases,
    }));
  }

  async getAdminCampaign(schoolId: string, campaignId: string) {
    const campaign = await this.prisma.testCampaign.findFirst({
      where: {
        id: campaignId,
        schoolId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        targetVersion: true,
        startsAt: true,
        dueAt: true,
        status: true,
        testCases: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            module: true,
            priority: true,
            dueAt: true,
            evidenceRequired: true,
            audienceRoles: {
              orderBy: { role: "asc" },
              select: { role: true },
            },
            _count: {
              select: { executions: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException("Test campaign not found");
    }

    return {
      ...campaign,
      testCases: campaign.testCases.map((testCase) => ({
        id: testCase.id,
        title: testCase.title,
        module: testCase.module,
        priority: testCase.priority,
        dueAt: testCase.dueAt,
        evidenceRequired: testCase.evidenceRequired,
        audienceRoles: testCase.audienceRoles.map((entry) => entry.role),
        executionsCount: testCase._count.executions,
      })),
    };
  }

  async createCampaign(
    user: AuthenticatedUser,
    schoolId: string,
    payload: CreateTestCampaignDto,
  ) {
    return this.prisma.testCampaign.create({
      data: {
        schoolId,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        targetVersion: payload.targetVersion?.trim() || null,
        startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        status: payload.status ?? TestCampaignStatus.DRAFT,
        createdById: user.id,
        updatedById: user.id,
      },
    });
  }

  async updateCampaign(
    user: AuthenticatedUser,
    schoolId: string,
    campaignId: string,
    payload: UpdateTestCampaignDto,
  ) {
    await this.assertCampaignExists(schoolId, campaignId);

    return this.prisma.testCampaign.update({
      where: { id: campaignId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.description !== undefined
          ? { description: payload.description?.trim() || null }
          : {}),
        ...(payload.targetVersion !== undefined
          ? { targetVersion: payload.targetVersion?.trim() || null }
          : {}),
        ...(payload.startsAt !== undefined
          ? { startsAt: payload.startsAt ? new Date(payload.startsAt) : null }
          : {}),
        ...(payload.dueAt !== undefined
          ? { dueAt: payload.dueAt ? new Date(payload.dueAt) : null }
          : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        updatedById: user.id,
      },
    });
  }

  async deleteCampaign(schoolId: string, campaignId: string) {
    await this.assertCampaignExists(schoolId, campaignId);
    await this.prisma.testCampaign.delete({
      where: { id: campaignId },
    });
    return { success: true };
  }

  async createTestCase(
    user: AuthenticatedUser,
    schoolId: string,
    campaignId: string,
    payload: CreateTestCaseDto,
  ) {
    await this.assertCampaignExists(schoolId, campaignId);
    this.assertArrayFields(payload.steps, payload.audienceRoles);

    return this.prisma.testCase.create({
      data: {
        campaignId,
        title: payload.title.trim(),
        module: payload.module?.trim() || null,
        objective: payload.objective?.trim() || null,
        preconditions: payload.preconditions?.trim() || null,
        steps:
          payload.steps === undefined
            ? undefined
            : payload.steps === null
              ? Prisma.DbNull
              : payload.steps,
        expectedResult: payload.expectedResult.trim(),
        orderIndex: payload.orderIndex ?? 0,
        priority: payload.priority ?? "MEDIUM",
        evidenceRequired: payload.evidenceRequired ?? false,
        dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
        createdById: user.id,
        updatedById: user.id,
        audienceRoles:
          payload.audienceRoles && payload.audienceRoles.length > 0
            ? {
                create: payload.audienceRoles.map((role) => ({ role })),
              }
            : undefined,
      },
      include: {
        audienceRoles: {
          orderBy: { role: "asc" },
          select: { role: true },
        },
      },
    });
  }

  async updateTestCase(
    user: AuthenticatedUser,
    schoolId: string,
    testCaseId: string,
    payload: UpdateTestCaseDto,
  ) {
    const current = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        campaign: { schoolId },
      },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException("Test case not found");
    }

    this.assertArrayFields(payload.steps, payload.audienceRoles);

    return this.prisma.testCase.update({
      where: { id: testCaseId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.module !== undefined
          ? { module: payload.module?.trim() || null }
          : {}),
        ...(payload.objective !== undefined
          ? { objective: payload.objective?.trim() || null }
          : {}),
        ...(payload.preconditions !== undefined
          ? { preconditions: payload.preconditions?.trim() || null }
          : {}),
        ...(payload.steps !== undefined
          ? {
              steps: payload.steps === null ? Prisma.DbNull : payload.steps,
            }
          : {}),
        ...(payload.expectedResult !== undefined
          ? { expectedResult: payload.expectedResult.trim() }
          : {}),
        ...(payload.orderIndex !== undefined
          ? { orderIndex: payload.orderIndex }
          : {}),
        ...(payload.priority !== undefined
          ? { priority: payload.priority }
          : {}),
        ...(payload.evidenceRequired !== undefined
          ? { evidenceRequired: payload.evidenceRequired }
          : {}),
        ...(payload.dueAt !== undefined
          ? { dueAt: payload.dueAt ? new Date(payload.dueAt) : null }
          : {}),
        ...(payload.audienceRoles !== undefined
          ? {
              audienceRoles: {
                deleteMany: {},
                ...(payload.audienceRoles && payload.audienceRoles.length > 0
                  ? {
                      create: payload.audienceRoles.map((role) => ({ role })),
                    }
                  : {}),
              },
            }
          : {}),
        updatedById: user.id,
      },
      include: {
        audienceRoles: {
          orderBy: { role: "asc" },
          select: { role: true },
        },
      },
    });
  }

  async deleteTestCase(schoolId: string, testCaseId: string) {
    const current = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        campaign: { schoolId },
      },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException("Test case not found");
    }

    await this.prisma.testCase.delete({
      where: { id: testCaseId },
    });

    return { success: true };
  }

  private async assertCampaignExists(schoolId: string, campaignId: string) {
    const current = await this.prisma.testCampaign.findFirst({
      where: {
        id: campaignId,
        schoolId,
      },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException("Test campaign not found");
    }
  }

  private resolveVisibleRoles(user: AuthenticatedUser): AppRole[] {
    const roleSet = new Set<AppRole>();
    if (user.activeRole) roleSet.add(user.activeRole);
    for (const role of user.platformRoles) roleSet.add(role);
    for (const membership of user.memberships) roleSet.add(membership.role);
    return Array.from(roleSet);
  }

  private buildCaseVisibilityWhere(
    roles: AppRole[],
  ): Prisma.TestCaseWhereInput {
    return {
      OR: [
        { audienceRoles: { none: {} } },
        { audienceRoles: { some: { role: { in: roles } } } },
      ],
    };
  }

  private toStringArray(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  private assertArrayFields(
    steps: string[] | null | undefined,
    audienceRoles: AppRole[] | null | undefined,
  ) {
    if (steps !== undefined && steps !== null && !Array.isArray(steps)) {
      throw new BadRequestException("Invalid steps payload");
    }
    if (
      audienceRoles !== undefined &&
      audienceRoles !== null &&
      !Array.isArray(audienceRoles)
    ) {
      throw new BadRequestException("Invalid audience roles payload");
    }
  }
}
