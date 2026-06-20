import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  AppRole,
  Prisma,
  TestCampaignStatus,
  TestExecutionStatus,
} from "@prisma/client";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { MailService } from "../mail/mail.service.js";
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

type ExecutionLike = { status: TestExecutionStatus; executedAt: Date };

const EXECUTION_COMPLETED_STATUSES = new Set<TestExecutionStatus>([
  "PASSED",
  "FAILED",
  "BLOCKED",
  "SKIPPED",
]);

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaClientService: MediaClientService,
    private readonly mailService: MailService,
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

  async listCampaigns(user: AuthenticatedUser) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const campaigns = await this.prisma.testCampaign.findMany({
      where: {
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
            recycledAt: true,
            executions: {
              where: { userId: user.id },
              orderBy: [{ executedAt: "desc" }],
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
        const latest = this.currentExecution(
          testCase.executions,
          testCase.recycledAt,
        );
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

  async getCampaign(user: AuthenticatedUser, campaignId: string) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const campaign = await this.prisma.testCampaign.findFirst({
      where: {
        id: campaignId,
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
            recycledAt: true,
            executions: {
              where: { userId: user.id },
              orderBy: [{ executedAt: "desc" }],
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

    const testCases = campaign.testCases.map((testCase) => ({
      id: testCase.id,
      title: testCase.title,
      module: testCase.module,
      expectedResult: testCase.expectedResult,
      priority: testCase.priority,
      dueAt: testCase.dueAt,
      evidenceRequired: testCase.evidenceRequired,
      totalExecutions: testCase._count.executions,
      latestExecution: this.currentExecution(
        testCase.executions,
        testCase.recycledAt,
      ),
    }));

    return {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      targetVersion: campaign.targetVersion,
      startsAt: campaign.startsAt,
      dueAt: campaign.dueAt,
      status: campaign.status,
      summary: {
        totalCases: testCases.length,
        completedCases: testCases.filter(
          (testCase) =>
            testCase.latestExecution &&
            EXECUTION_COMPLETED_STATUSES.has(testCase.latestExecution.status),
        ).length,
      },
      testCases,
    };
  }

  async getTestCase(user: AuthenticatedUser, testCaseId: string) {
    this.assertTester(user);
    const roles = this.resolveVisibleRoles(user);
    const testCase = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        campaign: {
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
        recycledAt: true,
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

    const currentExecutions = this.currentExecutionsOnly(
      testCase.executions,
      testCase.recycledAt,
    );

    const latestExecutionByUser = new Map<
      string,
      {
        userId: string;
        fullName: string;
        status: TestExecutionStatus;
        executedAt: Date;
      }
    >();

    for (const execution of currentExecutions) {
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
      currentExecutions.find((execution) => execution.user.id === user.id) ??
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
        totalExecutions: currentExecutions.length,
        passed: currentExecutions.filter((entry) => entry.status === "PASSED")
          .length,
        failed: currentExecutions.filter((entry) => entry.status === "FAILED")
          .length,
        blocked: currentExecutions.filter((entry) => entry.status === "BLOCKED")
          .length,
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
          status: "ACTIVE",
        },
        ...this.buildCaseVisibilityWhere(roles),
      },
      select: {
        id: true,
        title: true,
        evidenceRequired: true,
        campaign: {
          select: {
            title: true,
            school: {
              select: { name: true, slug: true },
            },
          },
        },
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

    if (execution.status === "FAILED") {
      await this.notifyTestExecutionFailed(user, testCase, execution);
    }

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

  async listMyExecutions(
    user: AuthenticatedUser,
    params?: {
      status?: TestExecutionStatus;
      campaignId?: string;
      page?: number;
      limit?: number;
    },
  ) {
    this.assertTester(user);
    const where: Prisma.TestExecutionWhereInput = {
      userId: user.id,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.campaignId
        ? { testCase: { campaignId: params.campaignId } }
        : {}),
    };

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;

    const [executions, total] = await Promise.all([
      this.prisma.testExecution.findMany({
        where,
        orderBy: [{ executedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: this.executionRowSelect(),
      }),
      this.prisma.testExecution.count({ where }),
    ]);

    return {
      items: executions.map((execution) => this.toExecutionRow(execution)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getMyExecution(user: AuthenticatedUser, executionId: string) {
    this.assertTester(user);
    const execution = await this.prisma.testExecution.findFirst({
      where: { id: executionId, userId: user.id },
      select: this.executionDetailSelect(),
    });

    if (!execution) {
      throw new NotFoundException(
        translateTestsError(
          testsLocaleFromUser(user),
          "tests.errors.executionNotFound",
        ),
      );
    }

    return this.toExecutionDetail(execution);
  }

  async listAdminExecutions(params?: {
    status?: TestExecutionStatus;
    campaignId?: string;
    testerId?: string;
    dateFrom?: string;
    dateTo?: string;
    reviewed?: boolean;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.TestExecutionWhereInput = {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.campaignId
        ? { testCase: { campaignId: params.campaignId } }
        : {}),
      ...(params?.testerId ? { userId: params.testerId } : {}),
      ...(params?.dateFrom || params?.dateTo
        ? {
            executedAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(params.dateTo) } : {}),
            },
          }
        : {}),
      ...(params?.reviewed !== undefined
        ? { adminReviewedAt: params.reviewed ? { not: null } : null }
        : {}),
    };

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;

    const [executions, total] = await Promise.all([
      this.prisma.testExecution.findMany({
        where,
        orderBy: [{ executedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: this.executionRowSelect(),
      }),
      this.prisma.testExecution.count({ where }),
    ]);

    return {
      items: executions.map((execution) => this.toExecutionRow(execution)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAdminExecution(executionId: string) {
    const execution = await this.prisma.testExecution.findFirst({
      where: { id: executionId },
      select: this.executionDetailSelect(),
    });

    if (!execution) {
      throw new NotFoundException(
        translateTestsError(testsLocaleFromUser(null), "tests.errors.executionNotFound"),
      );
    }

    return this.toExecutionDetail(execution);
  }

  async reviewExecution(
    admin: AuthenticatedUser,
    executionId: string,
    payload: { reviewed: boolean; note?: string },
  ) {
    const current = await this.prisma.testExecution.findFirst({
      where: { id: executionId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException(
        translateTestsError(
          testsLocaleFromUser(admin),
          "tests.errors.executionNotFound",
        ),
      );
    }

    return this.prisma.testExecution.update({
      where: { id: executionId },
      data: payload.reviewed
        ? {
            adminReviewedAt: new Date(),
            adminReviewedById: admin.id,
            adminReviewNote: payload.note?.trim() || null,
          }
        : {
            adminReviewedAt: null,
            adminReviewedById: null,
            adminReviewNote: null,
          },
      select: {
        id: true,
        adminReviewedAt: true,
        adminReviewNote: true,
        adminReviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async listAdminCampaigns(params?: {
    search?: string;
    status?: TestCampaignStatus;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.TestCampaignWhereInput = {};
    if (params?.status) where.status = params.status;
    const search = params?.search?.trim();
    if (search) {
      const referenceMatch = this.parseReference(search);
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        ...(referenceMatch !== null ? [{ reference: referenceMatch }] : []),
      ];
    }

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;

    const [campaigns, total] = await Promise.all([
      this.prisma.testCampaign.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reference: true,
          title: true,
          description: true,
          targetVersion: true,
          startsAt: true,
          dueAt: true,
          status: true,
          school: { select: { id: true, name: true, slug: true } },
          _count: {
            select: {
              testCases: true,
            },
          },
        },
      }),
      this.prisma.testCampaign.count({ where }),
    ]);

    return {
      items: campaigns.map((campaign) => ({
        ...campaign,
        testCasesCount: campaign._count.testCases,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAdminCampaign(campaignId: string) {
    const campaign = await this.prisma.testCampaign.findFirst({
      where: { id: campaignId },
      select: {
        id: true,
        reference: true,
        title: true,
        description: true,
        targetVersion: true,
        startsAt: true,
        dueAt: true,
        status: true,
        school: { select: { id: true, name: true, slug: true } },
        testCases: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            reference: true,
            title: true,
            module: true,
            priority: true,
            dueAt: true,
            evidenceRequired: true,
            recycledAt: true,
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
        reference: testCase.reference,
        title: testCase.title,
        module: testCase.module,
        priority: testCase.priority,
        dueAt: testCase.dueAt,
        evidenceRequired: testCase.evidenceRequired,
        recycledAt: testCase.recycledAt,
        audienceRoles: testCase.audienceRoles.map((entry) => entry.role),
        executionsCount: testCase._count.executions,
      })),
    };
  }

  async createCampaign(
    user: AuthenticatedUser,
    payload: CreateTestCampaignDto,
  ) {
    return this.prisma.testCampaign.create({
      data: {
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
    campaignId: string,
    payload: UpdateTestCampaignDto,
  ) {
    await this.assertCampaignExists(campaignId);

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

  async deleteCampaign(campaignId: string) {
    await this.assertCampaignExists(campaignId);
    await this.prisma.testCampaign.delete({
      where: { id: campaignId },
    });
    return { success: true };
  }

  async createTestCase(
    user: AuthenticatedUser,
    campaignId: string,
    payload: CreateTestCaseDto,
  ) {
    await this.assertCampaignExists(campaignId);
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
    testCaseId: string,
    payload: UpdateTestCaseDto,
  ) {
    const current = await this.prisma.testCase.findFirst({
      where: { id: testCaseId },
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

  async deleteTestCase(testCaseId: string) {
    const current = await this.prisma.testCase.findFirst({
      where: { id: testCaseId },
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

  async recycleTestCase(testCaseId: string) {
    const current = await this.prisma.testCase.findFirst({
      where: { id: testCaseId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException("Test case not found");
    }

    return this.prisma.testCase.update({
      where: { id: testCaseId },
      data: { recycledAt: new Date() },
      select: { id: true, recycledAt: true },
    });
  }

  async assignCampaign(
    assignedBy: AuthenticatedUser,
    campaignId: string,
    testerId: string,
    note?: string,
  ) {
    await this.assertCampaignExists(campaignId);

    const tester = await this.prisma.user.findUnique({
      where: { id: testerId },
      select: { id: true, isTester: true },
    });

    if (!tester) {
      throw new NotFoundException("Tester not found");
    }

    return this.prisma.testCampaignAssignment.upsert({
      where: { campaignId_userId: { campaignId, userId: testerId } },
      create: {
        campaignId,
        userId: testerId,
        assignedById: assignedBy.id,
        note: note?.trim() || null,
      },
      update: {
        assignedById: assignedBy.id,
        note: note?.trim() || null,
      },
      select: {
        id: true,
        campaignId: true,
        userId: true,
        note: true,
        createdAt: true,
      },
    });
  }

  async unassignCampaign(assignmentId: string) {
    const current = await this.prisma.testCampaignAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });

    if (!current) {
      throw new NotFoundException("Assignment not found");
    }

    await this.prisma.testCampaignAssignment.delete({
      where: { id: assignmentId },
    });

    return { success: true };
  }

  async listAssignments(campaignId: string) {
    return this.prisma.testCampaignAssignment.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        note: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async listTesters(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where: Prisma.UserWhereInput = { isTester: true };
    const search = params?.search?.trim();
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;

    const [testers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          memberships: {
            select: {
              school: { select: { id: true, name: true, slug: true } },
            },
          },
          testExecutions: {
            select: {
              status: true,
              testCaseId: true,
              testCase: { select: { campaignId: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: testers.map((tester) => {
        const campaignsTouched = new Set(
          tester.testExecutions.map(
            (execution) => execution.testCase.campaignId,
          ),
        );
        const passed = tester.testExecutions.filter(
          (execution) => execution.status === "PASSED",
        ).length;
        const failed = tester.testExecutions.filter(
          (execution) => execution.status === "FAILED",
        ).length;

        return {
          id: tester.id,
          fullName: `${tester.firstName} ${tester.lastName}`.trim(),
          email: tester.email,
          schools: tester.memberships.map((membership) => membership.school),
          stats: {
            campaignsCount: campaignsTouched.size,
            executionsCount: tester.testExecutions.length,
            passedCount: passed,
            failedCount: failed,
          },
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getSynthesis() {
    const [
      campaignsByStatus,
      totalCases,
      executionsByStatus,
      testersCount,
      pendingReview,
    ] = await Promise.all([
      this.prisma.testCampaign.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.testCase.count(),
      this.prisma.testExecution.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { isTester: true } }),
      this.prisma.testExecution.count({
        where: {
          status: { in: ["FAILED", "BLOCKED"] },
          adminReviewedAt: null,
        },
      }),
    ]);

    const campaignCounts = Object.fromEntries(
      campaignsByStatus.map((entry) => [entry.status, entry._count._all]),
    ) as Record<TestCampaignStatus, number | undefined>;

    const executionCounts = Object.fromEntries(
      executionsByStatus.map((entry) => [entry.status, entry._count._all]),
    ) as Record<TestExecutionStatus, number | undefined>;

    const totalExecutions = executionsByStatus.reduce(
      (total, entry) => total + entry._count._all,
      0,
    );
    const passed = executionCounts.PASSED ?? 0;

    return {
      campaigns: {
        draft: campaignCounts.DRAFT ?? 0,
        active: campaignCounts.ACTIVE ?? 0,
        archived: campaignCounts.ARCHIVED ?? 0,
        total: campaignsByStatus.reduce(
          (total, entry) => total + entry._count._all,
          0,
        ),
      },
      totalCases,
      executions: {
        total: totalExecutions,
        passed,
        failed: executionCounts.FAILED ?? 0,
        blocked: executionCounts.BLOCKED ?? 0,
        successRate: totalExecutions > 0 ? passed / totalExecutions : 0,
        pendingReview,
      },
      testersCount,
    };
  }

  private async notifyTestExecutionFailed(
    user: AuthenticatedUser,
    testCase: {
      title: string;
      campaign: {
        title: string;
        school: { name: string; slug: string } | null;
      };
    },
    execution: { resultText: string | null; comment: string | null },
  ) {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          email: { not: null },
          platformRoles: {
            some: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
          },
        },
        select: { email: true, firstName: true },
      });

      const testerFullName = `${user.firstName} ${user.lastName}`.trim();

      await Promise.all(
        admins
          .filter((admin) => Boolean(admin.email))
          .map((admin) =>
            this.mailService.sendTestExecutionFailedNotification({
              to: admin.email as string,
              recipientFirstName: admin.firstName,
              schoolName: testCase.campaign.school?.name ?? "Plateforme",
              schoolSlug: testCase.campaign.school?.slug ?? null,
              campaignTitle: testCase.campaign.title,
              testCaseTitle: testCase.title,
              testerFullName,
              resultText: execution.resultText ?? "",
              comment: execution.comment,
            }),
          ),
      );
    } catch (error) {
      this.logger.error(
        "Failed to notify platform admins about a failed test execution",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async assertCampaignExists(campaignId: string) {
    const current = await this.prisma.testCampaign.findFirst({
      where: { id: campaignId },
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

  private parseReference(search: string): number | null {
    const match = search.match(/^\D*(\d+)\D*$/);
    if (!match) return null;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }

  private executionRowSelect() {
    return {
      id: true,
      status: true,
      resultText: true,
      comment: true,
      executedAt: true,
      adminReviewedAt: true,
      adminReviewNote: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      adminReviewedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      testCase: {
        select: {
          id: true,
          title: true,
          campaign: { select: { id: true, title: true } },
        },
      },
    } satisfies Prisma.TestExecutionSelect;
  }

  private executionDetailSelect() {
    return {
      ...this.executionRowSelect(),
      deviceInfo: true,
      appVersion: true,
      createdAt: true,
      attachments: {
        orderBy: { createdAt: "asc" as const },
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    } satisfies Prisma.TestExecutionSelect;
  }

  private toExecutionRow(
    execution: Prisma.TestExecutionGetPayload<{
      select: ReturnType<TestsService["executionRowSelect"]>;
    }>,
  ) {
    return {
      id: execution.id,
      status: execution.status,
      resultText: execution.resultText,
      comment: execution.comment,
      executedAt: execution.executedAt,
      adminReviewedAt: execution.adminReviewedAt,
      adminReviewNote: execution.adminReviewNote,
      user: {
        id: execution.user.id,
        fullName: `${execution.user.firstName} ${execution.user.lastName}`.trim(),
      },
      adminReviewedBy: execution.adminReviewedBy
        ? {
            id: execution.adminReviewedBy.id,
            fullName:
              `${execution.adminReviewedBy.firstName} ${execution.adminReviewedBy.lastName}`.trim(),
          }
        : null,
      testCase: { id: execution.testCase.id, title: execution.testCase.title },
      campaign: execution.testCase.campaign,
    };
  }

  private toExecutionDetail(
    execution: Prisma.TestExecutionGetPayload<{
      select: ReturnType<TestsService["executionDetailSelect"]>;
    }>,
  ) {
    return {
      ...this.toExecutionRow(execution),
      deviceInfo: execution.deviceInfo,
      appVersion: execution.appVersion,
      createdAt: execution.createdAt,
      attachments: execution.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        url: attachment.fileUrl,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      })),
    };
  }

  /** Dernière exécution de la liste (déjà triée desc) à considérer comme "courante",
   * en ignorant celles antérieures au dernier recyclage du cas de test. */
  private currentExecution<T extends ExecutionLike>(
    executions: T[],
    recycledAt: Date | null,
  ): T | undefined {
    return this.currentExecutionsOnly(executions, recycledAt)[0];
  }

  private currentExecutionsOnly<T extends ExecutionLike>(
    executions: T[],
    recycledAt: Date | null,
  ): T[] {
    if (!recycledAt) return executions;
    return executions.filter((execution) => execution.executedAt > recycledAt);
  }
}
